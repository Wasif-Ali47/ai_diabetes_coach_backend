import MealPlan from '../models/MealPlan.js';
import User from '../models/User.js';
import { generateMealPlanWithAI } from '../services/openaiService.js';

/**
 * Calculate daily calorie target
 */
function calculateCalorieTarget(user) {
  let bmr;
  const weight = user.weight || 70;
  const height = user.height || 170;
  const age = user.dateOfBirth 
    ? Math.floor((new Date() - new Date(user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
    : 30;

  if (user.biologicalSex === 'Male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
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

/**
 * Generate 7-day meal plan using OpenAI
 */
export const generateMealPlan = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate daily calorie target
    const dailyCalorieTarget = calculateCalorieTarget(user);
    const dailyMacroTargets = calculateMacroTargets(dailyCalorieTarget);

    // Generate 7-day meal plan
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    // Deactivate existing active plans
    await MealPlan.updateMany(
      { userId: req.userId, isActive: true },
      { isActive: false }
    );

    const days = [];
    
    // Generate meals for each day using OpenAI
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + i);
      
      try {
        // Use OpenAI to generate meals for this day
        const meals = await generateMealPlanWithAI(user, dailyCalorieTarget, dailyMacroTargets, i + 1);
        
        const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
        const totalMacros = meals.reduce((acc, meal) => ({
          carbs: acc.carbs + meal.macros.carbs,
          protein: acc.protein + meal.macros.protein,
          fat: acc.fat + meal.macros.fat
        }), { carbs: 0, protein: 0, fat: 0 });

        days.push({
          dayNumber: i + 1,
          date: dayDate,
          meals,
          totalCalories,
          totalMacros
        });
      } catch (error) {
        console.error(`Error generating meals for day ${i + 1}:`, error);
        // Fallback to default meals if OpenAI fails
        const meals = getFallbackMeals(i, dailyCalorieTarget);
        const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
        const totalMacros = meals.reduce((acc, meal) => ({
          carbs: acc.carbs + meal.macros.carbs,
          protein: acc.protein + meal.macros.protein,
          fat: acc.fat + meal.macros.fat
        }), { carbs: 0, protein: 0, fat: 0 });

        days.push({
          dayNumber: i + 1,
          date: dayDate,
          meals,
          totalCalories,
          totalMacros
        });
      }
    }

    const mealPlan = new MealPlan({
      userId: req.userId,
      startDate,
      endDate,
      dailyCalorieTarget,
      dailyMacroTargets,
      days,
      isActive: true
    });

    await mealPlan.save();

    res.status(201).json({
      success: true,
      message: 'Meal plan generated successfully',
      mealPlan
    });
  } catch (error) {
    console.error('Generate meal plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate meal plan',
      error: error.message
    });
  }
};

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
 * Fallback meals if OpenAI fails
 */
function getFallbackMeals(dayIndex, calorieTarget) {
  const mealTemplates = [
    {
      breakfast: { mealType: 'Breakfast', name: 'Steel-Cut Oats & Berries', calories: 380, macros: { carbs: 45, protein: 12, fat: 8 }, tags: ['Low GI', 'Heart-Smart'], ingredients: ['Oats', 'Berries', 'Almonds'] },
      lunch: { mealType: 'Lunch', name: 'Mediterranean Chickpea Bowl', calories: 490, macros: { carbs: 58, protein: 18, fat: 15 }, tags: ['Low Sodium'], ingredients: ['Chickpeas', 'Vegetables', 'Olive Oil'] },
      dinner: { mealType: 'Dinner', name: 'Baked Salmon, Greens & Quinoa', calories: 560, macros: { carbs: 52, protein: 38, fat: 22 }, tags: ['Low GI', 'Omega-3'], ingredients: ['Salmon', 'Quinoa', 'Greens'] },
      snack: { mealType: 'Snack', name: 'Apple + Almond Butter', calories: 200, macros: { carbs: 27, protein: 4, fat: 10 }, tags: ['Low GI'], ingredients: ['Apple', 'Almond Butter'] }
    }
  ];

  const template = mealTemplates[dayIndex % mealTemplates.length];
  return [template.breakfast, template.lunch, template.dinner, template.snack];
}
