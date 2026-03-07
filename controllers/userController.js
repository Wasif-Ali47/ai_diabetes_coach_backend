import User from '../models/User.js';
import { validationResult } from 'express-validator';

/**
 * Get current user profile
 */
export const getProfile = async (req, res) => {
  try {
    console.log('[getProfile] Request received for userId:', req.userId);
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      console.log('[getProfile] ❌ User not found:', req.userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('[getProfile] ✓ Profile retrieved successfully');
    console.log('[getProfile] User email:', user.email);
    console.log('[getProfile] Onboarding complete:', user.onboardingComplete);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('[getProfile] ❌ Get profile error:', error);
    console.error('[getProfile] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

/**
 * Update personal info
 */
export const updatePersonalInfo = async (req, res) => {
  try {
    console.log('[updatePersonalInfo] Request received for userId:', req.userId);
    console.log('[updatePersonalInfo] Request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[updatePersonalInfo] ❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, dateOfBirth, biologicalSex } = req.body;
    const updateData = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (biologicalSex !== undefined) updateData.biologicalSex = biologicalSex;

    console.log('[updatePersonalInfo] Update data:', JSON.stringify(updateData, null, 2));
    console.log('[updatePersonalInfo] Updating user in database...');

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      console.log('[updatePersonalInfo] ❌ User not found:', req.userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('[updatePersonalInfo] ✓ Personal info updated successfully');
    console.log('[updatePersonalInfo] Updated user:', user.email);

    res.json({
      success: true,
      message: 'Personal info updated successfully',
      user
    });
  } catch (error) {
    console.error('[updatePersonalInfo] ❌ Update personal info error:', error);
    console.error('[updatePersonalInfo] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update personal info',
      error: error.message
    });
  }
};

/**
 * Update body info
 */
export const updateBodyInfo = async (req, res) => {
  try {
    console.log('[updateBodyInfo] Request received for userId:', req.userId);
    console.log('[updateBodyInfo] Request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[updateBodyInfo] ❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { heightFeet, heightInches, weight, activityLevel } = req.body;
    const updateData = {};

    if (heightFeet !== undefined || heightInches !== undefined) {
      updateData.height = {
        feet: heightFeet !== undefined ? parseInt(heightFeet) : 0,
        inches: heightInches !== undefined ? parseInt(heightInches) : 0
      };
    }
    if (weight !== undefined) updateData.weight = weight;
    if (activityLevel !== undefined) updateData.activityLevel = activityLevel;

    console.log('[updateBodyInfo] Update data:', JSON.stringify(updateData, null, 2));
    console.log('[updateBodyInfo] Updating user in database...');

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      console.log('[updateBodyInfo] ❌ User not found:', req.userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('[updateBodyInfo] ✓ Body info updated successfully');
    console.log('[updateBodyInfo] Updated user:', user.email);

    res.json({
      success: true,
      message: 'Body info updated successfully',
      user
    });
  } catch (error) {
    console.error('[updateBodyInfo] ❌ Update body info error:', error);
    console.error('[updateBodyInfo] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update body info',
      error: error.message
    });
  }
};

/**
 * Update health conditions
 */
export const updateHealthConditions = async (req, res) => {
  try {
    console.log('[updateHealthConditions] Request received for userId:', req.userId);
    console.log('[updateHealthConditions] Request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[updateHealthConditions] ❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { healthConditions, medications } = req.body;
    const updateData = {};

    if (healthConditions !== undefined) updateData.healthConditions = healthConditions;
    if (medications !== undefined) updateData.medications = medications;

    console.log('[updateHealthConditions] Update data:');
    console.log('[updateHealthConditions]   - healthConditions:', healthConditions?.length || 0, 'items');
    console.log('[updateHealthConditions]   - medications:', medications?.length || 0, 'items');
    console.log('[updateHealthConditions] Updating user in database...');

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      console.log('[updateHealthConditions] ❌ User not found:', req.userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('[updateHealthConditions] ✓ Health conditions updated successfully');
    console.log('[updateHealthConditions] Updated user:', user.email);

    res.json({
      success: true,
      message: 'Health profile updated successfully',
      user
    });
  } catch (error) {
    console.error('[updateHealthConditions] ❌ Update health profile error:', error);
    console.error('[updateHealthConditions] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update health profile',
      error: error.message
    });
  }
};

/**
 * Update diet preferences
 */
export const updateDietPreferences = async (req, res) => {
  try {
    console.log('[updateDietPreferences] Request received for userId:', req.userId);
    console.log('[updateDietPreferences] Request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[updateDietPreferences] ❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { dietPreferences } = req.body;

    console.log('[updateDietPreferences] Diet preferences data:', JSON.stringify(dietPreferences, null, 2));
    console.log('[updateDietPreferences] Updating user in database...');

    const user = await User.findByIdAndUpdate(
      req.userId,
      { dietPreferences: dietPreferences || {} },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      console.log('[updateDietPreferences] ❌ User not found:', req.userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('[updateDietPreferences] ✓ Diet preferences updated successfully');
    console.log('[updateDietPreferences] Updated user:', user.email);

    res.json({
      success: true,
      message: 'Diet preferences updated successfully',
      user
    });
  } catch (error) {
    console.error('[updateDietPreferences] ❌ Update diet preferences error:', error);
    console.error('[updateDietPreferences] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update diet preferences',
      error: error.message
    });
  }
};

/**
 * Update settings
 */
export const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { settings: settings || {} },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Settings updated successfully',
      user
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};

/**
 * Complete onboarding
 */
export const completeOnboarding = async (req, res) => {
  try {
    console.log('[completeOnboarding] Request received for userId:', req.userId);
    console.log('[completeOnboarding] Marking onboarding as complete...');

    const user = await User.findByIdAndUpdate(
      req.userId,
      { onboardingComplete: true },
      { new: true }
    ).select('-password');

    if (!user) {
      console.log('[completeOnboarding] ❌ User not found:', req.userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('[completeOnboarding] ✓ Onboarding completed successfully');
    console.log('[completeOnboarding] User:', user.email, 'Onboarding complete:', user.onboardingComplete);

    res.json({
      success: true,
      message: 'Onboarding completed',
      user
    });
  } catch (error) {
    console.error('[completeOnboarding] ❌ Complete onboarding error:', error);
    console.error('[completeOnboarding] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to complete onboarding',
      error: error.message
    });
  }
};

/**
 * Delete account
 */
export const deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.userId);
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
};
