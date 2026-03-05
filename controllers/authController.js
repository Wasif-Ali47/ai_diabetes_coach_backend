import User from '../models/User.js';
import { generateToken, JWT_SECRET } from '../middleware/auth.js';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

/**
 * Register new user
 */
export const register = async (req, res) => {
  try {
    console.log('=== USER REGISTRATION START ===');
    console.log('[register] Request received');
    console.log('[register] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[register] Request headers:', JSON.stringify(req.headers, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[register] ❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName } = req.body;
    console.log('[register] Extracted data: email=' + email + ', firstName=' + firstName + ', lastName=' + lastName + ', hasPassword=' + !!password);

    // Check if user already exists
    console.log('[register] Checking if user exists...');
    let user = await User.findOne({ email });
    if (user) {
      console.log('[register] ❌ User already exists with email: ' + email);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    console.log('[register] ✓ User does not exist, proceeding with registration');

    // Create new user (password is optional for guest users)
    console.log('[register] Creating new user...');
    user = new User({
      email,
      password: password || undefined,
      firstName,
      lastName
    });

    console.log('[register] Saving user to database...');
    await user.save();
    console.log('[register] ✓ User saved successfully. User ID:', user._id);

    console.log('[register] Generating JWT token...');
    const token = generateToken(user._id);
    console.log('[register] ✓ Token generated');

    console.log('[register] ✓ Registration successful');
    console.log('=== USER REGISTRATION END ===');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        onboardingComplete: user.onboardingComplete
      }
    });
  } catch (error) {
    console.error('[register] ❌ Registration error:', error);
    console.error('[register] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Login user
 */
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'No password set for this account. Please register with a password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        onboardingComplete: user.onboardingComplete
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Guest login
 */
export const guestLogin = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const guestEmail = `guest_${deviceId || Date.now()}@nutriguide.app`;

    let user = await User.findOne({ email: guestEmail });
    
    if (!user) {
      user = new User({
        email: guestEmail,
        firstName: 'Guest',
        onboardingComplete: false
      });
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Guest session created',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        onboardingComplete: user.onboardingComplete
      }
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({
      success: false,
      message: 'Guest login failed',
      error: error.message
    });
  }
};

/**
 * Verify token
 */
export const verifyToken = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        onboardingComplete: user.onboardingComplete
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};
