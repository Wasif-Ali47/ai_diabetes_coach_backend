import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false // Optional for guest users
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  biologicalSex: {
    type: String,
    enum: ['Female', 'Male', 'Other']
  },
  // Body info
  height: {
    feet: { type: Number },
    inches: { type: Number }
  },
  weight: {
    type: Number, // in kg
  },
  activityLevel: {
    type: String,
    enum: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extremely Active']
  },
  // Health conditions
  healthConditions: [{
    type: String
  }],
  medications: [{
    name: String,
    dosage: String
  }],
  // Diet preferences
  dietPreferences: {
    vegetarian: { type: Boolean, default: false },
    vegan: { type: Boolean, default: false },
    glutenFree: { type: Boolean, default: false },
    dairyFree: { type: Boolean, default: false },
    allergies: [String],
    preferences: [String]
  },
  // Subscription
  subscriptionPlan: {
    type: String,
    enum: ['Free', 'Premium'],
    default: 'Free'
  },
  // Device tokens for push notifications
  deviceTokens: [{
    token: String,
    deviceType: String,
    deviceInfo: {
      os: String,
      appVersion: String
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Settings
  settings: {
    units: {
      type: String,
      enum: ['Metric', 'Imperial'],
      default: 'Metric'
    },
    darkMode: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    cloudBackup: {
      type: Boolean,
      default: false
    },
    anonymousAnalytics: {
      type: Boolean,
      default: true
    }
  },
  // Onboarding
  onboardingComplete: {
    type: Boolean,
    default: false
  },
  // Admin: User activation status
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

export default mongoose.model('User', userSchema);
