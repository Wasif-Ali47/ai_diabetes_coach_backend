import mongoose from 'mongoose';

const symptomLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symptomType: {
    type: String,
    required: true,
    enum: ['Blood Sugar', 'Energy', 'Digestion', 'Mood', 'Sleep Quality']
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  notes: String,
  date: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
symptomLogSchema.index({ userId: 1, date: -1 });
symptomLogSchema.index({ userId: 1, symptomType: 1, date: -1 });

export default mongoose.model('SymptomLog', symptomLogSchema);
