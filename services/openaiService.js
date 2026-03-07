import OpenAI from 'openai';

// Initialize OpenAI client (only if API key is provided)
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'REMOVED_KEY') {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "REMOVED_KEY"
    });
  } catch (error) {
    console.warn('⚠️  OpenAI client initialization failed:', error.message);
  }
} else {
  console.warn('⚠️  OPENAI_API_KEY not set. AI features will use fallback responses.');
}

/**
 * Generate meal plan using OpenAI
 */
export async function generateMealPlanWithAI(user, dailyCalorieTarget, dailyMacroTargets, dayNumber) {
  // Check if OpenAI is initialized
  if (!openai) {
    console.warn('OpenAI not initialized, returning null to use fallback meals');
    return null;
  }

  try {
    const healthConditions = user.healthConditions?.join(', ') || 'None';
    const allergies = user.dietPreferences?.allergies?.join(', ') || 'None';
    const vegetarian = user.dietPreferences?.vegetarian ? 'Yes' : 'No';
    const vegan = user.dietPreferences?.vegan ? 'Yes' : 'No';
    const glutenFree = user.dietPreferences?.glutenFree ? 'Yes' : 'No';
    const dairyFree = user.dietPreferences?.dairyFree ? 'Yes' : 'No';

    const prompt = `You are a professional nutritionist. Generate a personalized meal plan for Day ${dayNumber} of a 7-day plan.

User Profile:
- Daily Calorie Target: ${dailyCalorieTarget} kcal
- Daily Macro Targets: Carbs ${dailyMacroTargets.carbs}g, Protein ${dailyMacroTargets.protein}g, Fat ${dailyMacroTargets.fat}g
- Health Conditions: ${healthConditions}
- Allergies: ${allergies}
- Vegetarian: ${vegetarian}
- Vegan: ${vegan}
- Gluten-Free: ${glutenFree}
- Dairy-Free: ${dairyFree}

Generate a complete day's meal plan with:
1. Breakfast (around 25% of daily calories)
2. Lunch (around 35% of daily calories)
3. Dinner (around 30% of daily calories)
4. Snack (around 10% of daily calories)

For each meal, provide:
- Meal name (creative and appetizing)
- Calories (exact number)
- Macros: carbs, protein, fat in grams
- Tags (e.g., "Low GI", "Heart-Smart", "Low Sodium", "High Protein", "Omega-3")
- Brief description (1-2 sentences)
- Key ingredients (3-5 main ingredients)

Return ONLY a valid JSON object in this exact format:
{
  "breakfast": {
    "name": "Meal Name",
    "description": "Brief description",
    "calories": 400,
    "macros": {"carbs": 45, "protein": 12, "fat": 8},
    "tags": ["Low GI", "Heart-Smart"],
    "ingredients": ["ingredient1", "ingredient2", "ingredient3"]
  },
  "lunch": { ... },
  "dinner": { ... },
  "snack": { ... }
}

Make sure meals are varied, nutritious, and appropriate for the user's health conditions.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional nutritionist. Always respond with valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content.trim();
    
    // Parse JSON response
    let mealPlanData;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      mealPlanData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Failed to parse meal plan response');
    }

    // Convert to our meal format
    const meals = [
      {
        mealType: 'Breakfast',
        name: mealPlanData.breakfast.name,
        description: mealPlanData.breakfast.description,
        calories: mealPlanData.breakfast.calories,
        macros: mealPlanData.breakfast.macros,
        tags: mealPlanData.breakfast.tags || [],
        ingredients: mealPlanData.breakfast.ingredients || []
      },
      {
        mealType: 'Lunch',
        name: mealPlanData.lunch.name,
        description: mealPlanData.lunch.description,
        calories: mealPlanData.lunch.calories,
        macros: mealPlanData.lunch.macros,
        tags: mealPlanData.lunch.tags || [],
        ingredients: mealPlanData.lunch.ingredients || []
      },
      {
        mealType: 'Dinner',
        name: mealPlanData.dinner.name,
        description: mealPlanData.dinner.description,
        calories: mealPlanData.dinner.calories,
        macros: mealPlanData.dinner.macros,
        tags: mealPlanData.dinner.tags || [],
        ingredients: mealPlanData.dinner.ingredients || []
      },
      {
        mealType: 'Snack',
        name: mealPlanData.snack.name,
        description: mealPlanData.snack.description,
        calories: mealPlanData.snack.calories,
        macros: mealPlanData.snack.macros,
        tags: mealPlanData.snack.tags || [],
        ingredients: mealPlanData.snack.ingredients || []
      }
    ];

    return meals;
  } catch (error) {
    console.error('OpenAI meal plan generation error:', error);
    throw error;
  }
}

/**
 * Generate AI chat response using OpenAI
 */
export async function generateChatResponse(userMessage, user, chatHistory = []) {
  // Check if OpenAI is initialized
  if (!openai) {
    console.warn('OpenAI not initialized, returning null to use fallback response');
    return null;
  }

  try {
    const healthConditions = user.healthConditions?.join(', ') || 'None';
    const medications = user.medications?.map(m => `${m.name} ${m.dosage || ''}`).join(', ') || 'None';
    
    const systemPrompt = `You are a helpful AI nutrition companion for the NutriGuide app. You help users with:
- Nutrition advice tailored to their health conditions
- Meal planning guidance
- Symptom tracking support
- Medication reminders and interactions
- General health and wellness questions

User's Health Profile:
- Health Conditions: ${healthConditions}
- Medications: ${medications}
- Diet Preferences: ${user.dietPreferences?.vegetarian ? 'Vegetarian' : ''} ${user.dietPreferences?.vegan ? 'Vegan' : ''} ${user.dietPreferences?.glutenFree ? 'Gluten-Free' : ''}

Important Guidelines:
- Always provide evidence-based nutrition advice
- Remind users to consult healthcare providers for medical decisions
- Be empathetic and supportive
- Keep responses concise but informative (2-3 paragraphs max)
- Reference the user's health conditions when relevant
- Never provide medical diagnoses or replace professional medical advice`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-10).map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.message
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const aiResponse = response.choices[0].message.content.trim();

    // Determine response type and confidence
    const lowerMessage = userMessage.toLowerCase();
    let responseType = 'general';
    let confidence = 0.85;

    if (lowerMessage.includes('blood sugar') || lowerMessage.includes('glucose') || lowerMessage.includes('diabetes')) {
      responseType = 'blood_sugar';
      confidence = 0.90;
    } else if (lowerMessage.includes('meal') || lowerMessage.includes('plan') || lowerMessage.includes('food') || lowerMessage.includes('diet')) {
      responseType = 'meal_plan';
      confidence = 0.92;
    } else if (lowerMessage.includes('medication') || lowerMessage.includes('medicine') || lowerMessage.includes('pill')) {
      responseType = 'medication';
      confidence = 0.88;
    } else if (lowerMessage.includes('symptom') || lowerMessage.includes('track') || lowerMessage.includes('log')) {
      responseType = 'symptoms';
      confidence = 0.90;
    }

    return {
      text: aiResponse,
      confidence,
      type: responseType
    };
  } catch (error) {
    console.error('OpenAI chat error:', error);
    throw error;
  }
}
