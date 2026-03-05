import User from '../models/User.js';
import MealPlan from '../models/MealPlan.js';

/**
 * Get all users for admin dashboard
 */
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = users.map((u) => ({
      id: u._id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      healthConditions: u.healthConditions || [],
      onboardingComplete: u.onboardingComplete || false,
      active: u.active !== false, // default true if not set
    }));

    res.json({
      success: true,
      users: formatted,
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

/**
 * Toggle user active/deactivated
 */
export const toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { active: !!active },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: `User ${active ? 'activated' : 'deactivated'} successfully`,
      user,
    });
  } catch (error) {
    console.error('Admin toggle user active error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message,
    });
  }
};

/**
 * Get all meal plans for admin view
 */
export const getAllMealPlans = async (req, res) => {
  try {
    const plans = await MealPlan.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formatted = plans.map((p) => ({
      id: p._id,
      userId: p.userId,
      planName: p.planName,
      startDate: p.startDate,
      endDate: p.endDate,
      dailyCalorieTarget: p.dailyCalorieTarget,
      dailyMacroTargets: p.dailyMacroTargets,
      isActive: p.isActive,
    }));

    res.json({
      success: true,
      mealPlans: formatted,
    });
  } catch (error) {
    console.error('Admin get meal plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meal plans',
      error: error.message,
    });
  }
};

/**
 * Dummy broadcast notification endpoint
 */
export const broadcastNotification = async (req, res) => {
  try {
    const { title, body } = req.body;

    console.log('Admin broadcast notification requested:', {
      title,
      body,
    });

    // In a real implementation, this would call your notification service.
    res.json({
      success: true,
      message: 'Notification broadcast queued (dummy endpoint)',
    });
  } catch (error) {
    console.error('Admin broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message,
    });
  }
};

