import User from '../models/User.js';
import { validationResult } from 'express-validator';

// Initialize Firebase Admin (optional)
let admin;
(async () => {
  try {
    const firebaseAdmin = await import('firebase-admin');
    admin = firebaseAdmin.default;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (!admin.apps || admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
    }
  } catch (error) {
    console.log('Firebase Admin not initialized. Push notifications will be disabled.');
  }
})();

/**
 * Register device token
 */
export const registerToken = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { token, userId, deviceType, deviceInfo } = req.body;

    const targetUserId = req.userId || userId || 'guest_user';

    let user;
    
    if (req.userId) {
      user = await User.findById(req.userId);
    } else if (userId && userId !== 'guest_user') {
      user = await User.findById(userId);
    }

    if (user) {
      const existingToken = user.deviceTokens.find(
        dt => dt.token === token
      );

      if (!existingToken) {
        user.deviceTokens.push({
          token,
          deviceType: deviceType || 'android',
          deviceInfo: deviceInfo || {}
        });
        await user.save();
      }
    }

    res.json({
      success: true,
      message: 'Device token registered successfully',
      token
    });
  } catch (error) {
    console.error('Register token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register device token',
      error: error.message
    });
  }
};

/**
 * Send push notification
 */
export const sendNotification = async (req, res) => {
  try {
    if (!admin) {
      return res.status(503).json({
        success: false,
        message: 'Push notifications not configured. Firebase Admin not initialized.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { title, body, data } = req.body;
    const user = await User.findById(req.userId);

    if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No device tokens found for user'
      });
    }

    const tokens = user.deviceTokens.map(dt => dt.token);
    const message = {
      notification: {
        title,
        body
      },
      data: data || {},
      tokens
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      
      res.json({
        success: true,
        message: 'Notification sent successfully',
        successCount: response.successCount,
        failureCount: response.failureCount
      });
    } catch (error) {
      console.error('Firebase messaging error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
};

/**
 * Get device tokens
 */
export const getTokens = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('deviceTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      tokens: user.deviceTokens || []
    });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get device tokens',
      error: error.message
    });
  }
};

/**
 * Remove device token
 */
export const removeToken = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.deviceTokens = user.deviceTokens.filter(
      dt => dt.token !== req.params.token
    );
    await user.save();

    res.json({
      success: true,
      message: 'Device token removed successfully'
    });
  } catch (error) {
    console.error('Remove token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove device token',
      error: error.message
    });
  }
};
