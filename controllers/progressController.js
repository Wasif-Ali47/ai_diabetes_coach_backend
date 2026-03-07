import ProgressLog from '../models/ProgressLog.js';
import FoodLog from '../models/FoodLog.js';
import ActivityLog from '../models/ActivityLog.js';
import MealPlan from '../models/MealPlan.js';
import SymptomLog from '../models/SymptomLog.js';

/**
 * Log weight entry
 */
export const logWeight = async (req, res) => {
  try {
    const { weight, date, notes } = req.body;

    if (!weight || weight <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid weight is required'
      });
    }

    const progressLog = new ProgressLog({
      userId: req.userId,
      weight,
      date: date ? new Date(date) : new Date(),
      notes
    });

    await progressLog.save();

    // Also update user's current weight
    const User = (await import('../models/User.js')).default;
    await User.findByIdAndUpdate(req.userId, { weight });

    res.status(201).json({
      success: true,
      message: 'Weight logged successfully',
      progressLog
    });
  } catch (error) {
    console.error('[logWeight] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log weight',
      error: error.message
    });
  }
};

/**
 * Get weight progress
 */
export const getWeightProgress = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    
    const query = { userId: req.userId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const logs = await ProgressLog.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('[getWeightProgress] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get weight progress',
      error: error.message
    });
  }
};

/**
 * Get progress dashboard data (calorie adherence, macro balance, symptom frequency)
 */
export const getProgressDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    start.setDate(start.getDate() - 7); // Default 7 days
    const end = endDate ? new Date(endDate) : new Date();

    // Get user's meal plan for targets
    const mealPlan = await MealPlan.findOne({
      userId: req.userId,
      isActive: true
    }).sort({ createdAt: -1 });

    const dailyCalorieTarget = mealPlan?.dailyCalorieTarget || 1820;
    const dailyMacroTargets = mealPlan?.dailyMacroTargets || {
      carbs: 182,
      protein: 137,
      fat: 61
    };

    // Get food logs for the period
    const foodLogs = await FoodLog.find({
      userId: req.userId,
      date: { $gte: start, $lte: end }
    });

    // Get activity logs for the period
    const activityLogs = await ActivityLog.find({
      userId: req.userId,
      date: { $gte: start, $lte: end }
    });

    // Get symptom logs for the period
    const symptomLogs = await SymptomLog.find({
      userId: req.userId,
      date: { $gte: start, $lte: end }
    });

    // Calculate daily summaries
    const dailySummaries = {};
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dates.push(dateKey);
      dailySummaries[dateKey] = {
        date: dateKey,
        caloriesConsumed: 0,
        caloriesBurned: 0,
        carbs: 0,
        protein: 0,
        fat: 0,
        fibre: 0,
        symptoms: {}
      };
    }

    // Aggregate food logs
    foodLogs.forEach(log => {
      const dateKey = log.date.toISOString().split('T')[0];
      if (dailySummaries[dateKey]) {
        dailySummaries[dateKey].caloriesConsumed += log.calories || 0;
        dailySummaries[dateKey].carbs += log.macros?.carbs || 0;
        dailySummaries[dateKey].protein += log.macros?.protein || 0;
        dailySummaries[dateKey].fat += log.macros?.fat || 0;
        dailySummaries[dateKey].fibre += log.macros?.fibre || 0;
      }
    });

    // Aggregate activity logs
    activityLogs.forEach(log => {
      const dateKey = log.date.toISOString().split('T')[0];
      if (dailySummaries[dateKey]) {
        dailySummaries[dateKey].caloriesBurned += log.caloriesBurned || 0;
      }
    });

    // Aggregate symptom logs
    symptomLogs.forEach(log => {
      const dateKey = log.date.toISOString().split('T')[0];
      if (dailySummaries[dateKey]) {
        if (!dailySummaries[dateKey].symptoms[log.symptomType]) {
          dailySummaries[dateKey].symptoms[log.symptomType] = [];
        }
        dailySummaries[dateKey].symptoms[log.symptomType].push(log.rating);
      }
    });

    // Calculate adherence percentages
    const summaries = dates.map(dateKey => {
      const summary = dailySummaries[dateKey];
      const netCalories = summary.caloriesConsumed - summary.caloriesBurned;
      const adherence = dailyCalorieTarget > 0 
        ? Math.min(100, Math.max(0, (netCalories / dailyCalorieTarget) * 100))
        : 0;

      return {
        ...summary,
        netCalories,
        calorieAdherence: Math.round(adherence),
        macroBalance: {
          carbs: Math.round((summary.carbs / dailyMacroTargets.carbs) * 100),
          protein: Math.round((summary.protein / dailyMacroTargets.protein) * 100),
          fat: Math.round((summary.fat / dailyMacroTargets.fat) * 100)
        }
      };
    });

    res.json({
      success: true,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      dailyCalorieTarget,
      dailyMacroTargets,
      summaries
    });
  } catch (error) {
    console.error('[getProgressDashboard] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get progress dashboard',
      error: error.message
    });
  }
};

/**
 * Delete progress log
 */
export const deleteProgressLog = async (req, res) => {
  try {
    const log = await ProgressLog.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Progress log not found'
      });
    }

    res.json({
      success: true,
      message: 'Progress log deleted successfully'
    });
  } catch (error) {
    console.error('[deleteProgressLog] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete progress log',
      error: error.message
    });
  }
};
