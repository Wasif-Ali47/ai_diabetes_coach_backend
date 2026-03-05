import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isUser: {
    type: Boolean,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.75
  },
  responseType: {
    type: String,
    enum: ['blood_sugar', 'meal_plan', 'medication', 'symptoms', 'general', 'default']
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatMessageSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
