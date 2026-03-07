import mongoose from 'mongoose';

const foodLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  foodName: {
    type: String,
    required: true,
    trim: true
  },
  portionSize: {
    amount: { type: Number, required: true },
    unit: { type: String, required: true, enum: ['g', 'ml', 'cup', 'piece', 'serving'] }
  },
  calories: {
    type: Number,
    required: true,
    min: 0
  },
  macros: {
    carbs: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fibre: { type: Number, default: 0 }
  },
  barcode: {
    type: String,
    trim: true,
    sparse: true
  },
  mealType: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    default: 'Snack'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
foodLogSchema.index({ userId: 1, date: -1 });
foodLogSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model('FoodLog', foodLogSchema);
