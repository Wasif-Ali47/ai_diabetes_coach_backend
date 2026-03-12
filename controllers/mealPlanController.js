import MealPlan from '../models/MealPlan.js';
import User from '../models/User.js';
import { generateMealPlanWithAI, generateMealPlanDayWithAI } from '../services/openaiService.js';

/**
 * Calculate daily calorie target
 */
// Helper function to convert feet and inches to cm
function feetInchesToCm(feet, inches) {
  if (!feet && !inches) return 170; // Default 5'7"
  const totalInches = (feet || 0) * 12 + (inches || 0);
  return Math.round(totalInches * 2.54);
}

function calculateCalorieTarget(user) {
  let bmr;
  const weight = user.weight || 70;
  
  // Convert height to cm - handle both formats
  let heightCm;
  if (user.height) {
    if (user.height.cm !== undefined && user.height.cm !== null) {
      // User provided height in cm
      heightCm = user.height.cm;
    } else if (user.height.feet !== undefined || user.height.inches !== undefined) {
      // User provided height in feet/inches
      heightCm = feetInchesToCm(user.height.feet, user.height.inches);
    } else {
      heightCm = 170; // Default 5'7"
    }
  } else {
    heightCm = 170; // Default 5'7"
  }
  
  const age = user.dateOfBirth 
    ? Math.floor((new Date() - new Date(user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : 30;

  if (user.biologicalSex === 'Male') {
    bmr = 10 * weight + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * heightCm - 5 * age - 161;
  }

  const activityMultipliers = {
    'Sedentary': 1.2,
    'Lightly Active': 1.375,
    'Moderately Active': 1.55,
    'Very Active': 1.725,
    'Extremely Active': 1.9
  };

  const activityLevel = user.activityLevel || 'Moderately Active';
  const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);

  return Math.round(tdee) || 1820;
}

/**
 * Calculate macro targets
 */
function calculateMacroTargets(calories) {
  return {
    carbs: Math.round((calories * 0.40) / 4),
    protein: Math.round((calories * 0.30) / 4),
    fat: Math.round((calories * 0.30) / 9)
  };
}


export const generateMealPlan = async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('[generateMealPlan] Starting meal plan generation...');
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const dailyCalorieTarget = calculateCalorieTarget(user);
    const dailyMacroTargets = calculateMacroTargets(dailyCalorieTarget);
    console.log(`[generateMealPlan] User profile loaded. Calorie target: ${dailyCalorieTarget}kcal`);

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    // Deactivate existing active plans
    await MealPlan.updateMany({ userId: req.userId, isActive: true }, { isActive: false });

    const days = [];
    let aiDays = null;

    // Try to generate all 7 days in one API call (faster)
    try {
      console.log('[generateMealPlan] Attempting to generate full 7-day plan in one API call...');
      aiDays = await generateMealPlanWithAI(user, dailyCalorieTarget, dailyMacroTargets);
      
      if (aiDays && Array.isArray(aiDays) && aiDays.length >= 7) {
        console.log('[generateMealPlan] ✅ Successfully generated full 7-day plan in one call');
      } else {
        throw new Error('Incomplete 7-day plan received');
      }
    } catch (err) {
      console.warn('[generateMealPlan] Full plan generation failed, falling back to parallel per-day generation:', err.message);
      aiDays = null;
    }

    // If full plan failed, generate days in parallel (much faster than sequential)
    if (!aiDays) {
      console.log('[generateMealPlan] Generating days in parallel...');
      const dayPromises = [];
      
      for (let i = 0; i < 7; i++) {
        dayPromises.push(
          generateMealPlanDayWithAI(user, dailyCalorieTarget, dailyMacroTargets, i + 1)
            .catch(err => {
              console.warn(`[generateMealPlan] Day ${i + 1} AI generation failed, will use fallback:`, err.message);
              return null; // Return null to trigger fallback
            })
        );
      }

      // Wait for all days in parallel (max 15 seconds instead of 7 × 15 = 105 seconds)
      const dayResults = await Promise.all(dayPromises);
      
      // Convert to same format as full plan response
      aiDays = dayResults.map((meals, index) => ({
        meals: meals || [] // Will be replaced with fallback if null
      }));
    }

    // Process each day
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + i);

      let meals = aiDays[i]?.meals || [];

      // Validate meals or use fallback
      const hasValidMeals =
        Array.isArray(meals) &&
        meals.length >= 4 &&
        meals.every(
          (m) =>
            m &&
            typeof m.name === 'string' &&
            m.name.trim().length > 0 &&
            typeof m.mealType === 'string' &&
            m.mealType.trim().length > 0 &&
            typeof m.calories === 'number' &&
            !Number.isNaN(m.calories) &&
            m.calories > 0
        );

      if (!hasValidMeals) {
        console.warn(`[generateMealPlan] Day ${i + 1} meals invalid, using fallback`);
        meals = getFallbackMeals(i, dailyCalorieTarget);
      }

      const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
      const totalMacros = meals.reduce(
        (acc, meal) => ({
          carbs: acc.carbs + (meal.macros?.carbs || 0),
          protein: acc.protein + (meal.macros?.protein || 0),
          fat: acc.fat + (meal.macros?.fat || 0),
        }),
        { carbs: 0, protein: 0, fat: 0 }
      );

      days.push({
        dayNumber: i + 1,
        date: dayDate,
        meals,
        totalCalories,
        totalMacros,
      });
    }

    const mealPlan = new MealPlan({
      userId: req.userId,
      startDate,
      endDate,
      dailyCalorieTarget,
      dailyMacroTargets,
      days,
      isActive: true,
    });

    await mealPlan.save();

    const totalTime = Date.now() - startTime;
    console.log(`[generateMealPlan] ✅ Meal plan generated successfully in ${totalTime}ms`);

    res.status(201).json({
      success: true,
      message: "Meal plan generated successfully",
      mealPlan,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[generateMealPlan] ❌ Error after ${totalTime}ms:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to generate meal plan",
      error: error.message,
    });
  }
};
// export const generateMealPlan = async (req, res) => {
//   try {
//     const user = await User.findById(req.userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     // Calculate daily calorie target
//     const dailyCalorieTarget = calculateCalorieTarget(user);
//     const dailyMacroTargets = calculateMacroTargets(dailyCalorieTarget);

//     // Generate 7-day meal plan
//     const startDate = new Date();
//     startDate.setHours(0, 0, 0, 0);
//     const endDate = new Date(startDate);
//     endDate.setDate(endDate.getDate() + 6);

//     // Deactivate existing active plans
//     await MealPlan.updateMany(
//       { userId: req.userId, isActive: true },
//       { isActive: false }
//     );

//     const days = [];
    
//     // Generate meals for each day using OpenAI
//     for (let i = 0; i < 7; i++) {
//       const dayDate = new Date(startDate);
//       dayDate.setDate(dayDate.getDate() + i);
      
//       try {
//         // Use OpenAI to generate meals for this day
//         const meals = await generateMealPlanWithAI(user, dailyCalorieTarget, dailyMacroTargets, i + 1);
        
//         const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
//         const totalMacros = meals.reduce((acc, meal) => ({
//           carbs: acc.carbs + meal.macros.carbs,
//           protein: acc.protein + meal.macros.protein,
//           fat: acc.fat + meal.macros.fat
//         }), { carbs: 0, protein: 0, fat: 0 });

//         days.push({
//           dayNumber: i + 1,
//           date: dayDate,
//           meals,
//           totalCalories,
//           totalMacros
//         });
//       } catch (error) {
//         console.error(`Error generating meals for day ${i + 1}:`, error);
//         // Fallback to default meals if OpenAI fails
//         const meals = getFallbackMeals(i, dailyCalorieTarget);
//         const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
//         const totalMacros = meals.reduce((acc, meal) => ({
//           carbs: acc.carbs + meal.macros.carbs,
//           protein: acc.protein + meal.macros.protein,
//           fat: acc.fat + meal.macros.fat
//         }), { carbs: 0, protein: 0, fat: 0 });

//         days.push({
//           dayNumber: i + 1,
//           date: dayDate,
//           meals,
//           totalCalories,
//           totalMacros
//         });
//       }
//     }

//     const mealPlan = new MealPlan({
//       userId: req.userId,
//       startDate,
//       endDate,
//       dailyCalorieTarget,
//       dailyMacroTargets,
//       days,
//       isActive: true
//     });

//     await mealPlan.save();

//     res.status(201).json({
//       success: true,
//       message: 'Meal plan generated successfully',
//       mealPlan
//     });
//   } catch (error) {
//     console.error('Generate meal plan error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to generate meal plan',
//       error: error.message
//     });
//   }
// };

/**
 * Get current active meal plan
 */
export const getCurrentMealPlan = async (req, res) => {
  try {
    const mealPlan = await MealPlan.findOne({
      userId: req.userId,
      isActive: true
    }).sort({ createdAt: -1 });

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'No active meal plan found'
      });
    }

    res.json({
      success: true,
      mealPlan
    });
  } catch (error) {
    console.error('Get current meal plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get meal plan',
      error: error.message
    });
  }
};

/**
 * Get meal plan by ID
 */
export const getMealPlanById = async (req, res) => {
  try {
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    res.json({
      success: true,
      mealPlan
    });
  } catch (error) {
    console.error('Get meal plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get meal plan',
      error: error.message
    });
  }
};

/**
 * Get all meal plans
 */
export const getAllMealPlans = async (req, res) => {
  try {
    const mealPlans = await MealPlan.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      count: mealPlans.length,
      mealPlans
    });
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get meal plans',
      error: error.message
    });
  }
};

/**
 * Update meal plan day
 */
export const updateMealPlanDay = async (req, res) => {
  try {
    const { meals } = req.body;
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    const dayIndex = mealPlan.days.findIndex(
      d => d.dayNumber === parseInt(req.params.dayNumber)
    );

    if (dayIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Day not found in meal plan'
      });
    }

    if (meals) {
      mealPlan.days[dayIndex].meals = meals;
      mealPlan.days[dayIndex].totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
      mealPlan.days[dayIndex].totalMacros = meals.reduce((acc, meal) => ({
        carbs: acc.carbs + meal.macros.carbs,
        protein: acc.protein + meal.macros.protein,
        fat: acc.fat + meal.macros.fat
      }), { carbs: 0, protein: 0, fat: 0 });
    }

    await mealPlan.save();

    res.json({
      success: true,
      message: 'Meal plan updated successfully',
      mealPlan
    });
  } catch (error) {
    console.error('Update meal plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update meal plan',
      error: error.message
    });
  }
};

/**
 * Fallback meals if OpenAI fails - provides variety across 7 days
 */
function getFallbackMeals(dayIndex, calorieTarget) {
  const breakfastCal = Math.round(calorieTarget * 0.25);
  const lunchCal = Math.round(calorieTarget * 0.35);
  const dinnerCal = Math.round(calorieTarget * 0.30);
  const snackCal = Math.round(calorieTarget * 0.10);

  const mealTemplates = [
    {
      breakfast: { mealType: 'Breakfast', name: 'Steel-Cut Oats & Berries', description: 'Nutritious whole grain oats topped with fresh berries and almonds', calories: breakfastCal, macros: { carbs: Math.round(breakfastCal * 0.5 / 4), protein: Math.round(breakfastCal * 0.15 / 4), fat: Math.round(breakfastCal * 0.35 / 9) }, tags: ['Low GI', 'Heart-Smart'], ingredients: ['Oats', 'Berries', 'Almonds'] },
      lunch: { mealType: 'Lunch', name: 'Mediterranean Chickpea Bowl', description: 'Protein-rich chickpeas with fresh vegetables and olive oil', calories: lunchCal, macros: { carbs: Math.round(lunchCal * 0.5 / 4), protein: Math.round(lunchCal * 0.15 / 4), fat: Math.round(lunchCal * 0.35 / 9) }, tags: ['Low Sodium'], ingredients: ['Chickpeas', 'Vegetables', 'Olive Oil'] },
      dinner: { mealType: 'Dinner', name: 'Baked Salmon, Greens & Quinoa', description: 'Omega-3 rich salmon with whole grain quinoa and leafy greens', calories: dinnerCal, macros: { carbs: Math.round(dinnerCal * 0.4 / 4), protein: Math.round(dinnerCal * 0.35 / 4), fat: Math.round(dinnerCal * 0.25 / 9) }, tags: ['Low GI', 'Omega-3'], ingredients: ['Salmon', 'Quinoa', 'Greens'] },
      snack: { mealType: 'Snack', name: 'Apple + Almond Butter', description: 'Fresh apple slices with natural almond butter', calories: snackCal, macros: { carbs: Math.round(snackCal * 0.5 / 4), protein: Math.round(snackCal * 0.1 / 4), fat: Math.round(snackCal * 0.4 / 9) }, tags: ['Low GI'], ingredients: ['Apple', 'Almond Butter'] }
    },
    {
      breakfast: { mealType: 'Breakfast', name: 'Greek Yogurt Parfait', description: 'Protein-packed Greek yogurt with granola and fresh fruit', calories: breakfastCal, macros: { carbs: Math.round(breakfastCal * 0.45 / 4), protein: Math.round(breakfastCal * 0.25 / 4), fat: Math.round(breakfastCal * 0.30 / 9) }, tags: ['High Protein'], ingredients: ['Greek Yogurt', 'Granola', 'Berries'] },
      lunch: { mealType: 'Lunch', name: 'Grilled Chicken Salad', description: 'Lean grilled chicken over mixed greens with vinaigrette', calories: lunchCal, macros: { carbs: Math.round(lunchCal * 0.25 / 4), protein: Math.round(lunchCal * 0.40 / 4), fat: Math.round(lunchCal * 0.35 / 9) }, tags: ['High Protein', 'Low Carb'], ingredients: ['Chicken', 'Mixed Greens', 'Vinaigrette'] },
      dinner: { mealType: 'Dinner', name: 'Vegetable Stir-Fry with Tofu', description: 'Colorful vegetables and tofu in a light soy sauce', calories: dinnerCal, macros: { carbs: Math.round(dinnerCal * 0.45 / 4), protein: Math.round(dinnerCal * 0.25 / 4), fat: Math.round(dinnerCal * 0.30 / 9) }, tags: ['Vegetarian'], ingredients: ['Tofu', 'Mixed Vegetables', 'Soy Sauce'] },
      snack: { mealType: 'Snack', name: 'Mixed Nuts & Dried Fruit', description: 'A healthy mix of nuts and dried fruits', calories: snackCal, macros: { carbs: Math.round(snackCal * 0.35 / 4), protein: Math.round(snackCal * 0.15 / 4), fat: Math.round(snackCal * 0.50 / 9) }, tags: ['Heart-Smart'], ingredients: ['Almonds', 'Walnuts', 'Dried Apricots'] }
    },
    {
      breakfast: { mealType: 'Breakfast', name: 'Avocado Toast with Eggs', description: 'Whole grain toast topped with avocado and poached eggs', calories: breakfastCal, macros: { carbs: Math.round(breakfastCal * 0.35 / 4), protein: Math.round(breakfastCal * 0.25 / 4), fat: Math.round(breakfastCal * 0.40 / 9) }, tags: ['High Protein'], ingredients: ['Whole Grain Bread', 'Avocado', 'Eggs'] },
      lunch: { mealType: 'Lunch', name: 'Lentil Soup with Whole Grain Bread', description: 'Hearty lentil soup served with whole grain bread', calories: lunchCal, macros: { carbs: Math.round(lunchCal * 0.55 / 4), protein: Math.round(lunchCal * 0.20 / 4), fat: Math.round(lunchCal * 0.25 / 9) }, tags: ['High Fiber'], ingredients: ['Lentils', 'Vegetables', 'Whole Grain Bread'] },
      dinner: { mealType: 'Dinner', name: 'Grilled Fish with Sweet Potato', description: 'Grilled white fish with roasted sweet potato and vegetables', calories: dinnerCal, macros: { carbs: Math.round(dinnerCal * 0.40 / 4), protein: Math.round(dinnerCal * 0.30 / 4), fat: Math.round(dinnerCal * 0.30 / 9) }, tags: ['Omega-3'], ingredients: ['White Fish', 'Sweet Potato', 'Broccoli'] },
      snack: { mealType: 'Snack', name: 'Hummus with Veggie Sticks', description: 'Creamy hummus with fresh vegetable sticks', calories: snackCal, macros: { carbs: Math.round(snackCal * 0.45 / 4), protein: Math.round(snackCal * 0.15 / 4), fat: Math.round(snackCal * 0.40 / 9) }, tags: ['Vegetarian'], ingredients: ['Hummus', 'Carrots', 'Cucumber'] }
    }
  ];

  const template = mealTemplates[dayIndex % mealTemplates.length];
  return [template.breakfast, template.lunch, template.dinner, template.snack];
}
