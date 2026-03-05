import mongoose from 'mongoose';

const mealSchema = new mongoose.Schema({
  mealType: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  calories: {
    type: Number,
    required: true
  },
  macros: {
    carbs: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    fat: { type: Number, default: 0 }
  },
  tags: [String], // e.g., ['Low GI', 'Heart-Smart', 'Low Sodium']
  ingredients: [String]
}, { _id: false });

const mealPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planName: {
    type: String,
    default: '7-Day Personalised Plan'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  dailyCalorieTarget: {
    type: Number,
    required: true
  },
  dailyMacroTargets: {
    carbs: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    fat: { type: Number, default: 0 }
  },
  days: [{
    dayNumber: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    meals: [mealSchema],
    totalCalories: {
      type: Number,
      default: 0
    },
    totalMacros: {
      carbs: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      fat: { type: Number, default: 0 }
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
mealPlanSchema.index({ userId: 1, startDate: -1 });
mealPlanSchema.index({ userId: 1, isActive: 1 });

export default mongoose.model('MealPlan', mealPlanSchema);
