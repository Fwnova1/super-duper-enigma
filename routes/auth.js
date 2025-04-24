const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const mongoose = require('mongoose');
const config = require('../config');

// Regular registration - will be disabled in production
router.post('/register', [
  body('username').trim().isLength({ min: 3 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    console.log('Registration attempt:', {
      username: req.body.username,
      email: req.body.email,
      // Don't log the password for security
    });

    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email: req.body.email }, { username: req.body.username }]
    });
    
    if (existingUser) {
      console.log('User already exists:', {
        email: existingUser.email,
        username: existingUser.username
      });
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    // Create new user
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      role: 'dietitian' // Default role is dietitian
    });

    console.log('Attempting to save user...');
    await user.save();
    console.log('User saved successfully');

    // Use config instead of environment variables
    const jwtSecret = config.jwtSecret;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not set in config');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Create JWT token
    const payload = {
      userId: user._id,
      role: user.role
    };

    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    console.error('Registration error details:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Admin-only route to create users
router.post('/create-user', auth, adminAuth, [
  body('username').trim().isLength({ min: 3 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['admin', 'dietitian'])
], async (req, res) => {
  try {
    console.log('Admin creating new user:', {
      username: req.body.username,
      email: req.body.email,
      role: req.body.role,
      admin: req.user.username
    });

    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email: req.body.email }, { username: req.body.username }]
    });
    
    if (existingUser) {
      console.log('User already exists:', {
        email: existingUser.email,
        username: existingUser.username
      });
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    // Create new user with specified role
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role
    });

    await user.save();
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Get all users (admin only)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Get basic user info for all authenticated users (for displaying dietitian names)
router.get('/public-user-info', auth, async (req, res) => {
  try {
    console.log('Fetching public user info requested by:', req.user.username);
    
    // Only return essential fields, not sensitive information
    const users = await User.find().select('_id username role');
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching public user info:', error);
    res.status(500).json({ message: 'Error fetching user information' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Use config instead of environment variables
    const jwtSecret = config.jwtSecret;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not set in config');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// @route   POST /api/auth/create-user
// @desc    Create a new user (admin only)
// @access  Private (admin)
router.post('/create-user', auth, adminAuth, async (req, res) => {
  try {
    console.log('Create user request from admin:', req.user.username);
    const { username, email, password, role } = req.body;
    
    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check for valid role
    if (!['admin', 'dietitian'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with that email or username already exists',
        field: existingUser.email === email ? 'email' : 'username'
      });
    }
    
    // Create and save the new user
    const newUser = new User({
      username,
      email,
      password,
      role
    });
    
    await newUser.save();
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      message: 'Error creating user', 
      error: error.message 
    });
  }
});

// @route   GET /api/auth/check-users
// @desc    Check all users and roles (admin only)
// @access  Private (admin)
router.get('/check-users', auth, adminAuth, async (req, res) => {
  try {
    // Get all users with all details for thorough checking
    const allUsers = await User.find().select('-password').lean();
    
    // Extract essential data for debugging
    const userDetails = allUsers.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      roleType: typeof user.role,
      createdAt: user.createdAt
    }));
    
    // Count by role
    const roleCounts = {};
    allUsers.forEach(user => {
      const role = user.role || 'undefined';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
    
    // Get unique roles
    const uniqueRoles = Array.from(new Set(allUsers.map(u => u.role)));
    
    // Check if 'dietitian' exists as a role
    const hasDietitianRole = uniqueRoles.includes('dietitian');
    
    res.json({
      success: true,
      count: allUsers.length,
      roles: uniqueRoles,
      roleCounts,
      hasDietitianRole,
      users: userDetails
    });
  } catch (error) {
    console.error('Error checking users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error checking users', 
      error: error.message 
    });
  }
});

// @route   GET /api/auth/direct-db-check
// @desc    Check database directly for dietitian users
// @access  Private (admin)
router.get('/direct-db-check', auth, adminAuth, async (req, res) => {
  try {
    console.log('Direct DB check requested by:', req.user.username);
    
    // Try different query approaches
    const userWithFind = await User.find();
    const userCount = await User.countDocuments();
    const allRoles = await User.distinct('role');
    
    // Try a direct collection query
    const db = mongoose.connection.db;
    let rawUsers = [];
    if (db) {
      try {
        const collection = db.collection('users');
        if (collection) {
          rawUsers = await collection.find({}).toArray();
        }
      } catch (dbError) {
        console.error('Direct DB query error:', dbError);
      }
    }
    
    // Try with null conditions
    const allUsersNoFilter = await User.find({});
    
    // Try searching by ID if we have users from raw query
    let userById = null;
    if (rawUsers.length > 0) {
      try {
        userById = await User.findById(rawUsers[0]._id);
      } catch (idError) {
        console.error('Find by ID error:', idError);
      }
    }
    
    res.json({
      success: true,
      findQueryCount: userWithFind.length,
      countDocuments: userCount,
      distinctRoles: allRoles,
      rawUserCount: rawUsers.length,
      noFilterCount: allUsersNoFilter.length,
      userByIdFound: userById !== null,
      connectionState: mongoose.connection.readyState,
      modelName: User.modelName,
      collectionName: User.collection.name,
      databaseName: mongoose.connection.name,
      rawUserSample: rawUsers.slice(0, 2).map(u => ({
        _id: u._id,
        username: u.username,
        role: u.role
      }))
    });
  } catch (error) {
    console.error('Error in direct DB check:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error checking database directly',
      error: error.message,
      stack: error.stack
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile 
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    // Return user data without password
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile information
// @access  Private
router.put('/profile', auth, [
  body('email').optional().isEmail().normalizeEmail(),
  body('username').optional().trim().isLength({ min: 3 }),
  body('fullName').optional().trim(),
  body('position').optional().trim(),
  body('dateOfBirth').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, username, fullName, position, dateOfBirth, profilePicture } = req.body;
    
    // Check if email or username is taken by another user
    if (email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
    }
    
    if (username) {
      const existingUsername = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username is already in use' });
      }
    }
    
    // Find user and update fields
    const updateData = {
      lastUpdated: Date.now()
    };
    
    // Only add fields that are provided
    if (email) updateData.email = email;
    if (username) updateData.username = username;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (position !== undefined) updateData.position = position;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (profilePicture) updateData.profilePicture = profilePicture;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// @route   PUT /api/auth/password
// @desc    Update user password
// @access  Private
router.put('/password', auth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    user.lastUpdated = Date.now();
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Error updating password', error: error.message });
  }
});

module.exports = router; 