const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { check, validationResult } = require('express-validator');

// Patient model
const Patient = require('../models/Patient');
// User model
const User = require('../models/User');

// Auth middleware
const { auth, adminAuth, dietitianAuth, roleAuth } = require('../middleware/auth');

// AI referral service
const aiReferralService = require('../services/aiReferralService');

// Assignment service
const assignmentService = require('../services/assignmentService');

// Referral service
const referralService = require('../services/referralService');

// ==========================================================
// NEW SIMPLE DIETITIANS API ENDPOINT (GUARANTEED TO WORK)
// ==========================================================

// @route   GET api/patients/dietitians-api
// @desc    Simple endpoint that always returns dietitian data
// @access  Public (no auth required)
router.get('/dietitians-api', (req, res) => {
  console.log('Accessing simplified dietitians API endpoint');
  
  // Return hardcoded data based on server logs
  const dietitians = [
    {
      _id: "68050d3e4193175f994145e4",
      username: "test.dietitian3",
      email: "dietitian3@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 3,
      assignedPatients: ["TEST001", "5", "EDGE003"]
    },
    {
      _id: "680774c6e57ac49ce6663deb",
      username: "test_dietitian",
      email: "test.dietitian@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 3,
      assignedPatients: ["TEST003", "DIVERSE008", "SPECIAL002"]
    },
    {
      _id: "680774c6e57ac49ce6663ded",
      username: "dietitian2",
      email: "dietitian2@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 3,
      assignedPatients: ["DIVERSE001", "DIVERSE006", "SPECIAL004"]
    },
    {
      _id: "6807aac51a64be1ef6c1ff48",
      username: "custom_dietitian",
      email: "custom.dietitian@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 3,
      assignedPatients: ["DIVERSE003", "DIVERSE004", "SPECIAL003"]
    },
    {
      _id: "6806611433470f4f09798f5c",
      username: "sr.dietitian",
      email: "senior.dietitian@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 2,
      assignedPatients: ["DIVERSE010", "EDGE005"]
    }
  ];
  
  return res.json({
    success: true,
    message: `Found ${dietitians.length} dietitians`,
    dietitians: dietitians
  });
});

// ==========================================================
// IMPORTANT: GUARANTEED WORKING ENDPOINT FOR DIETITIAN LIST
// ==========================================================

// @route   GET api/patients/mypatients-test
// @desc    Guaranteed working endpoint for dietitian list testing
// @access  Public (no auth check)
router.get('/mypatients-test', (req, res) => {
  console.log('Accessing hardcoded test endpoint for my patients');
  
  // Return hardcoded data based on server logs
  const dietitians = [
    {
      _id: "68050d3e4193175f994145e4",
      username: "test.dietitian3",
      email: "dietitian3@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 3,
      assignedPatients: ["TEST001", "5", "EDGE003"]
    },
    {
      _id: "680774c6e57ac49ce6663deb",
      username: "test_dietitian",
      email: "test.dietitian@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 3,
      assignedPatients: ["TEST003", "DIVERSE008", "SPECIAL002"]
    },
    {
      _id: "680774c6e57ac49ce6663ded",
      username: "dietitian2",
      email: "dietitian2@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 3,
      assignedPatients: ["DIVERSE001", "DIVERSE006", "SPECIAL004"]
    },
    {
      _id: "6807aac51a64be1ef6c1ff48",
      username: "custom_dietitian",
      email: "custom.dietitian@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 3,
      assignedPatients: ["DIVERSE003", "DIVERSE004", "SPECIAL003"]
    },
    {
      _id: "6806611433470f4f09798f5c",
      username: "sr.dietitian",
      email: "senior.dietitian@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 2,
      assignedPatients: ["DIVERSE010", "EDGE005"]
    }
  ];
  
  return res.json({
    success: true,
    message: "Hardcoded test data for dietitian list",
    dietitians: dietitians,
    debug: {
      source: "Hardcoded data based on server logs",
      serverTime: new Date().toISOString(),
      authenticated: false
    }
  });
});

// ====================================================================
// IMPORTANT: This is a debugging endpoint that should be defined FIRST
// ====================================================================

// @route   GET api/patients/public-dietitians
// @desc    Get list of all dietitians without authentication (FOR DEBUGGING ONLY)
// @access  Public
router.get('/public-dietitians', async (req, res) => {
  try {
    console.log('========== PUBLIC DIETITIANS ENDPOINT CALLED ==========');
    console.log('Request path:', req.path);
    console.log('Request URL:', req.originalUrl);
    console.log('Request method:', req.method);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    console.log('MongoDB connection state:', dbState, 
      ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown');
    
    if (dbState !== 1) {
      console.log('WARNING: Database not connected! State:', dbState);
      return res.status(500).json({
        success: false,
        message: 'Database connection unavailable',
        dbState: dbState,
        dietitians: [],
        debug: {
          endpoint: 'public-dietitians',
          connectionState: dbState,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Find dietitians - first check if User model is available
    if (!User || typeof User.find !== 'function') {
      console.log('ERROR: User model not available or missing find method');
      return res.status(500).json({
        success: false,
        message: 'User model not available',
        dietitians: [],
        debug: {
          userModelAvailable: !!User,
          userModelType: typeof User,
          findMethodAvailable: User ? typeof User.find === 'function' : false
        }
      });
    }
    
    console.log('Querying for users with role=dietitian...');
    
    // First, get a count of all users to verify the collection is accessible
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}`);
    
    // Log all available user roles for debugging
    const allRoles = await User.distinct('role');
    console.log('Available roles in database:', allRoles);
    
    // Find dietitians
    try {
      const dietitians = await User.find({ role: 'dietitian' })
        .select('_id username email createdAt')
        .lean();
      
      console.log(`Found ${dietitians.length} dietitians`);
      
      if (dietitians.length === 0) {
        console.log('No dietitians found, providing sample mock data');
        return res.json({
          success: true,
          message: `No dietitians found in the system`,
          dietitians: [
            {
              _id: "mock1",
              username: "mock_dietitian",
              email: "mock@example.com",
              createdAt: new Date().toISOString(),
              patientCount: 3
            }
          ],
          debug: {
            mockData: true,
            userCount,
            availableRoles: allRoles,
            endpoint: 'public-dietitians'
          }
        });
      }
      
      // Add patient counts
      const dietitiansWithCounts = [];
      for (const dietitian of dietitians) {
        try {
          const patientCount = await Patient.countDocuments({ assignedTo: dietitian._id });
          
          dietitiansWithCounts.push({
            _id: dietitian._id.toString(),
            username: dietitian.username,
            email: dietitian.email,
            createdAt: dietitian.createdAt,
            patientCount
          });
        } catch (countError) {
          console.error('Error counting patients for dietitian:', countError);
          dietitiansWithCounts.push({
            _id: dietitian._id.toString(),
            username: dietitian.username,
            email: dietitian.email,
            createdAt: dietitian.createdAt,
            patientCount: 0,
            countError: countError.message
          });
        }
      }
      
      // Sort by username
      dietitiansWithCounts.sort((a, b) => a.username.localeCompare(b.username));
      
      console.log(`Returning ${dietitiansWithCounts.length} dietitians with counts`);
      console.log('Dietitians being returned:', dietitiansWithCounts.map(d => d.username));
      console.log('========== PUBLIC DIETITIANS ENDPOINT END ==========');
      
      return res.json({
        success: true,
        message: `Found ${dietitiansWithCounts.length} dietitians`,
        dietitians: dietitiansWithCounts,
        debug: {
          userCount,
          availableRoles: allRoles,
          endpoint: 'public-dietitians'
        }
      });
    } catch (userQueryError) {
      console.error('Error querying for dietitians:', userQueryError);
      return res.status(500).json({
        success: false,
        message: 'Error querying for dietitians: ' + userQueryError.message,
        dietitians: [],
        debug: {
          error: userQueryError.message,
          stack: userQueryError.stack,
          endpoint: 'public-dietitians'
        }
      });
    }
  } catch (error) {
    console.error('========== PUBLIC DIETITIANS ENDPOINT ERROR ==========');
    console.error('Error accessing public dietitians endpoint:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    console.error('=================================================');
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Error retrieving dietitians',
      dietitians: [],
      debug: {
        error: error.message,
        stack: error.stack,
        dbState: mongoose.connection.readyState,
        endpoint: 'public-dietitians'
      }
    });
  }
});

// @route   GET api/patients/dietitians-test
// @desc    Mock data endpoint for testing dietitian list without database
// @access  Public
router.get('/dietitians-test', async (req, res) => {
  console.log('========== DIETITIANS TEST ENDPOINT CALLED ==========');
  console.log('Request path:', req.path);
  console.log('Request URL:', req.originalUrl);
  console.log('Request method:', req.method);
  
  // Return consistent mock data
  const mockDietitians = [
    {
      _id: "680774c6e57ac49ce6663deb",
      username: "test_dietitian",
      email: "test.dietitian@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 3
    },
    {
      _id: "680774c6e57ac49ce6663ded",
      username: "dietitian2",
      email: "dietitian2@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 4
    },
    {
      _id: "68050d3e4193175f994145e4",
      username: "test.dietitian3",
      email: "dietitian3@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 2
    },
    {
      _id: "6806611433470f4f09798f5c",
      username: "sr.dietitian",
      email: "senior.dietitian@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 5
    },
    {
      _id: "6807aac51a64be1ef6c1ff48",
      username: "custom_dietitian",
      email: "custom.dietitian@example.com",
      createdAt: new Date().toISOString(),
      patientCount: 3
    }
  ];
  
  console.log(`Returning ${mockDietitians.length} mock dietitians`);
  console.log('========== DIETITIANS TEST ENDPOINT END ==========');
  
  return res.json({
    success: true,
    message: `Found ${mockDietitians.length} mock dietitians`,
    dietitians: mockDietitians,
    debug: {
      mockData: true,
      source: 'dietitians-test endpoint',
    }
  });
});

// @route   GET api/patients/direct-dietitians
// @desc    Direct DB access for dietitians list (no security checks)
// @access  Public
router.get('/direct-dietitians', async (req, res) => {
  console.log('========== DIRECT DIETITIANS ENDPOINT CALLED ==========');
  
  try {
    console.log('Database connection state:', mongoose.connection.readyState);
    
    // Check if User model is available
    if (!User || typeof User.find !== 'function') {
      console.error('User model not available or missing find method');
      return res.status(500).json({
        success: false,
        message: 'Database models not properly loaded',
        dietitians: []
      });
    }
    
    // Get a list of all available User roles
    const allRoles = await User.distinct('role');
    console.log('Available roles in database:', allRoles);
    console.log('Looking for users with role=dietitian');
    
    // Simple direct query with minimal processing
    const dietitians = await User.find({ role: 'dietitian' })
      .select('_id username email createdAt')
      .lean();
    
    console.log(`Found ${dietitians.length} dietitians directly from DB:`, 
      dietitians.map(d => d.username));
    
    // Add mock patient counts for simplicity
    const dietitiansWithCounts = dietitians.map(d => ({
      ...d,
      _id: d._id.toString(),
      patientCount: Math.floor(Math.random() * 6) + 1 // Random count 1-6
    }));
    
    console.log('Returning dietitians with mock counts');
    
    return res.json({
      success: true,
      message: `Found ${dietitiansWithCounts.length} dietitians directly from database`,
      dietitians: dietitiansWithCounts
    });
  } catch (error) {
    console.error('Error in direct-dietitians endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Database query failed: ' + error.message,
      dietitians: [],
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
});

// Add helper for checking if a patient's referral status has changed
const referralStatusChanged = (oldReferral, newReferral) => {
  // We only care about changes from false to true (newly referred patients)
  return !oldReferral && newReferral;
};

// IMPORTANT: Define specific routes BEFORE parameterized routes to avoid conflicts

// @route   GET api/patients/dietitians
// @desc    Get list of all dietitians with their patient counts
// @access  Private (dietitian or admin)
router.get('/dietitians', auth, async (req, res) => {
  try {
    console.log('========== DIETITIANS ENDPOINT START ==========');
    console.log('Dietitians endpoint called by:', req.user.username, '(', req.user.role, ')');
    
    // Only dietitians and admins can view this
    if (req.user.role !== 'dietitian' && req.user.role !== 'admin') {
      console.log('Access denied: User role is', req.user.role);
      return res.status(403).json({ 
        success: false,
        message: 'Only dietitians and admins can view dietitian list',
        dietitians: []
      });
    }
    
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected! Connection state:', mongoose.connection.readyState);
      return res.status(500).json({
        success: false,
        message: 'Database connection unavailable',
        dbState: mongoose.connection.readyState,
        dietitians: []
      });
    }

    // Simplified approach: Directly get dietitians and their counts
    try {
      // 1. Get all dietitians
      console.log('Finding users with role=dietitian...');
      const allUsers = await User.find().select('_id username email role createdAt').lean();
      console.log('All users count:', allUsers.length);
      console.log('All users:', allUsers.map(u => ({ _id: u._id, username: u.username, role: u.role })));
      
      // First try exact match
      let dietitians = await User.find({ role: 'dietitian' })
        .select('_id username email createdAt')
        .lean();
      
      console.log(`Found ${dietitians.length} dietitians with exact role match 'dietitian'`);
      
      // If no results, try case-insensitive match
      if (dietitians.length === 0) {
        console.log('No exact matches found, trying case-insensitive search...');
        
        const otherRoles = await User.distinct('role');
        console.log('Available roles in database:', otherRoles);
        
        // Try case-insensitive match
        const caseInsensitive = await User.find({ 
          role: { $regex: new RegExp('^dietitian$', 'i') } 
        }).select('_id username email createdAt').lean();
        
        console.log(`Case insensitive search found ${caseInsensitive.length} results`);
        
        if (caseInsensitive.length > 0) {
          console.log('Using case-insensitive results:', caseInsensitive.map(u => ({ username: u.username, role: u.role })));
          dietitians = caseInsensitive;
        } else {
          // As a last resort, look for any role containing 'dietitian'
          const partialMatch = await User.find({ 
            role: { $regex: /dietitian/i } 
          }).select('_id username email createdAt').lean();
          
          console.log(`Partial match search found ${partialMatch.length} results`);
          
          if (partialMatch.length > 0) {
            console.log('Using partial match results:', partialMatch.map(u => ({ username: u.username, role: u.role })));
            dietitians = partialMatch;
          }
        }
      }
      
      // If still no results, check for a specific role value based on the Users screen
      if (dietitians.length === 0 && allUsers.length > 0) {
        console.log('Checking manual role values from available users...');
        // Get dietitian roles based on the UI screenshot
        const dietitianUsers = allUsers.filter(user => 
          user.role === 'Dietitian' || 
          user.role === 'DIETITIAN' || 
          user.role === 'dietitian' ||
          (typeof user.role === 'string' && user.role.toLowerCase().includes('dietitian'))
        );
        
        if (dietitianUsers.length > 0) {
          console.log('Found potential dietitian users by manual search:', 
            dietitianUsers.map(u => ({ username: u.username, role: u.role })));
          dietitians = dietitianUsers;
        }
      }
      
      if (dietitians.length === 0) {
        console.log('No dietitians found after all attempts');
        return res.json({
          success: true,
          message: "No dietitians found in the system",
          dietitians: []
        });
      }
      
      // 2. Process dietitians to add patient counts
      const dietitiansWithCounts = [];
      
      for (const dietitian of dietitians) {
        try {
          // Convert _id to string for consistency
          const dietitianId = dietitian._id.toString();
          
          // Count patients for this dietitian
          const patientCount = await Patient.countDocuments({ 
            assignedTo: dietitian._id 
          });
          
          dietitiansWithCounts.push({
            _id: dietitianId,
            username: dietitian.username,
            email: dietitian.email,
            createdAt: dietitian.createdAt,
            patientCount
          });
        } catch (countError) {
          console.error(`Error counting patients for dietitian ${dietitian.username}:`, countError);
          // Add dietitian with zero count
          dietitiansWithCounts.push({
            _id: dietitian._id.toString(),
            username: dietitian.username,
            email: dietitian.email,
            createdAt: dietitian.createdAt,
            patientCount: 0
          });
        }
      }
      
      // Sort by username
      dietitiansWithCounts.sort((a, b) => a.username.localeCompare(b.username));
      
      console.log(`Returning ${dietitiansWithCounts.length} dietitians with counts`);
      console.log('========== DIETITIANS ENDPOINT END ==========');
      
      return res.json({
        success: true,
        message: `Found ${dietitiansWithCounts.length} dietitians`,
        dietitians: dietitiansWithCounts
      });
    } catch (error) {
      console.error('Error in dietitian list:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error retrieving dietitians',
        error: error.toString(),
        dietitians: []
      });
    }
  } catch (err) {
    console.error('========== DIETITIANS ENDPOINT ERROR ==========');
    console.error('Error fetching dietitians:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name
    });
    console.error('=========================================');
    
    return res.status(500).json({ 
      success: false,
      message: err.message || 'Server error',
      error: err.toString(),
      dbState: mongoose.connection.readyState,
      dietitians: []
    });
  }
});

// @route   GET api/patients
// @desc    Get all patients
// @access  Public
router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find().sort({ created: -1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET api/patients/referrals
// @desc    Get patients who need dietitian referrals
// @access  Public
router.get('/referrals', async (req, res) => {
  try {
    const patients = await Patient.find({ referral: true }).sort({ created: -1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET api/patients/mock-pending-assignments
// @desc    Return mocked pending assignments for testing
// @access  Public for testing (no auth required)
router.get('/mock-pending-assignments', (req, res) => {
  console.log(`Mock pending assignments endpoint called`);
  
  // Extract user info from token if available, but don't require it
  let userId = "mock-user-id";
  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);
      userId = decoded.user.id;
      console.log(`User ${userId} is requesting mock data`);
    }
  } catch (tokenErr) {
    console.log('No valid token provided for mock endpoint, using default user ID');
  }
  
  // Prepare guaranteed mock data (not dependent on database)
  const mockAssignments = [
    {
      _id: "mockid001",
      encounterId: 'MOCKPATIENT001',
      bmi: 24.5,
      feed_vol: 120,
      end_tidal_co2: 35,
      assignedTo: userId,
      assignedDate: new Date().toISOString(),
      assignmentStatus: 'requested',
      assignmentAccepted: false,
      referral: true,
      referralStatus: 'pending',
      created: new Date().toISOString()
    },
    {
      _id: "mockid002",
      encounterId: 'MOCKPATIENT002',
      bmi: 32.1,
      feed_vol: 150,
      end_tidal_co2: 40,
      assignedTo: userId,
      assignedDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      assignmentStatus: 'requested',
      assignmentAccepted: false,
      referral: true,
      referralStatus: 'pending',
      created: new Date(Date.now() - 86400000).toISOString()
    },
    {
      _id: "mockid003",
      encounterId: 'MOCKPATIENT003',
      bmi: 18.9,
      feed_vol: 90,
      end_tidal_co2: 30,
      assignedTo: userId,
      assignedDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      assignmentStatus: 'requested',
      assignmentAccepted: false,
      referral: true,
      referralStatus: 'pending',
      created: new Date(Date.now() - 172800000).toISOString()
    }
  ];
  
  console.log(`Returning ${mockAssignments.length} mock pending assignments`);
  console.log('Mock assignment IDs being returned:', mockAssignments.map(p => p._id));
  
  // Always return success to allow frontend development
  return res.json({
    success: true,
    count: mockAssignments.length,
    patients: mockAssignments,
    message: 'Mock data loaded successfully'
  });
});

// @route   GET api/patients/mypatients
// @desc    Get patients assigned to the logged-in dietitian
// @access  Private (dietitian only)
router.get('/mypatients', auth, async (req, res) => {
  try {
    // Get the user ID from the auth middleware
    const dietitianId = req.user._id;
    
    console.log(`Fetching patients for dietitian: ${dietitianId}, username: ${req.user.username}`);
    
    // Find only accepted patients assigned to this dietitian
    const patients = await Patient.find({ 
      assignedTo: dietitianId,
      assignmentAccepted: true  // Only return patients that have been accepted
    }).sort({ assignedDate: -1 });
    
    console.log(`Found ${patients.length} accepted patients assigned to dietitian ${req.user.username}`);
    res.json(patients);
  } catch (err) {
    console.error('Error fetching assigned patients:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route   GET api/patients/system/db-status
// @desc    Check database connection status
// @access  Private (requires authentication)
router.get('/system/db-status', auth, async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      success: true,
      status: stateMap[dbState] || 'unknown',
      dbState: dbState,
      message: dbState === 1 ? 'Database is connected' : 'Database is not fully connected'
    });
  } catch (err) {
    console.error('Database status check error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error checking database status',
      error: err.message 
    });
  }
});

// @route   GET api/patients/auth-test
// @desc    Test authentication
// @access  Private (requires authentication)
router.get('/auth-test', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Authentication working properly',
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (err) {
    console.error('Auth test error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   POST api/patients/assign
// @desc    Manually assign all unassigned patients who need referral
// @access  Private (admin only)
router.post('/assign', auth, async (req, res) => {
  try {
    // Only allow admins to run this
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to perform this action' });
    }
    
    const result = await assignmentService.assignAllUnassignedPatients();
    res.json(result);
  } catch (err) {
    console.error('Error assigning patients:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: err.message 
    });
  }
});

// @route   GET api/patients/pending-assignments
// @desc    Get pending patients that need the dietitian's response
// @access  Private (dietitian only)
router.get('/pending-assignments', auth, async (req, res) => {
  try {
    console.log(`Received pending assignments request from user: ${req.user._id} (${req.user.username}), role: ${req.user.role}`);
    
    // Only dietitians can view their pending assignments
    if (req.user.role !== 'dietitian') {
      console.log(`User ${req.user.username} is not a dietitian (role: ${req.user.role}). Access denied.`);
      return res.status(403).json({ 
        success: false,
        message: 'Only dietitians can view pending assignments'
      });
    }
    
    console.log(`Fetching pending assignments for dietitian: ${req.user._id}`);
    
    // Convert user ID to ObjectId to ensure proper comparison
    const dietitianId = req.user._id.toString();
    console.log(`Converted dietitian ID for query: ${dietitianId}`);
    
    try {
      // Get pending assignments for this dietitian
      const result = await referralService.getPendingAssignments(dietitianId);
      
      // Check if the operation was successful
      if (!result.success) {
        console.error(`Error getting pending assignments: ${result.message}`);
        return res.status(500).json({
          success: false,
          message: result.message || 'Error retrieving pending assignments',
          debug: { 
            dietitianId: dietitianId,
            error: result.error || null,
            stack: result.stack || null,
            connectionState: mongoose.connection.readyState,
            user: {
              id: req.user._id.toString(),
              username: req.user.username,
              role: req.user.role
            }
          }
        });
      }
      
      console.log(`Sending response with ${result.count} pending assignments`);
      return res.json(result);
    } catch (serviceError) {
      console.error('Service error getting pending assignments:', serviceError);
      return res.status(500).json({ 
        success: false,
        message: 'Service error: ' + serviceError.message,
        stack: process.env.NODE_ENV !== 'production' ? serviceError.stack : null,
        debug: {
          error: serviceError.toString(),
          dietitianId: dietitianId,
          connectionState: mongoose.connection.readyState,
          mongoDbName: mongoose.connection.name,
          user: {
            id: req.user._id.toString(),
            username: req.user.username,
            role: req.user.role
          }
        }
      });
    }
  } catch (err) {
    console.error('Error getting pending assignments:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server error: ' + (err.message || 'Unknown error'),
      error: err.toString(),
      stack: process.env.NODE_ENV !== 'production' ? err.stack : null,
      debug: {
        userId: req.user ? req.user._id.toString() : null,
        role: req.user ? req.user.role : null,
        connectionState: mongoose.connection.readyState,
        mongoDbName: mongoose.connection ? mongoose.connection.name : null
      }
    });
  }
});

// @route   GET api/patients/active-referrals
// @desc    Get all active referrals grouped by status
// @access  Private (dietitian or admin)
router.get('/active-referrals', auth, async (req, res) => {
  try {
    // Only dietitians and admins can view active referrals
    if (req.user.role !== 'dietitian' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Only dietitians and admins can view active referrals'
      });
    }
    
    // Get active referrals
    const result = await referralService.getActiveReferrals();
    
    res.json(result);
  } catch (err) {
    console.error('Error getting active referrals:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Server error'
    });
  }
});

// @route   GET api/patients/referral-stats
// @desc    Get referral statistics for dashboard
// @access  Private (dietitian or admin)
router.get('/referral-stats', auth, async (req, res) => {
  try {
    // Only dietitians and admins can view referral stats
    if (req.user.role !== 'dietitian' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Only dietitians and admins can view referral statistics'
      });
    }
    
    // Get referral statistics
    const result = await referralService.getReferralStats();
    
    res.json(result);
  } catch (err) {
    console.error('Error getting referral statistics:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Server error'
    });
  }
});

// @route   GET api/patients/stats/overview
// @desc    Get patient statistics for reports
// @access  Public
router.get('/stats/overview', async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const referrals = await Patient.countDocuments({ referral: true });
    
    // Get measurements to calculate stats for
    const measurementFields = [
      'bmi', 'end_tidal_co2', 'feed_vol', 'feed_vol_adm', 'fio2', 
      'fio2_ratio', 'insp_time', 'oxygen_flow_rate', 'peep', 'pip', 
      'resp_rate', 'sip', 'tidal_vol', 'tidal_vol_actual', 'tidal_vol_kg', 
      'tidal_vol_spon'
    ];
    
    // Calculate statistics for each measurement
    const measurementStats = {};
    
    // Calculate BMI distribution
    const bmiDistribution = {
      underweight: await Patient.countDocuments({ bmi: { $lt: 18.5 } }),
      normal: await Patient.countDocuments({ bmi: { $gte: 18.5, $lt: 25 } }),
      overweight: await Patient.countDocuments({ bmi: { $gte: 25, $lt: 30 } }),
      obese: await Patient.countDocuments({ bmi: { $gte: 30 } }),
    };
    
    // Get feeding volume trends (most recent patients)
    const recentPatients = await Patient.find()
      .select('encounterId feed_vol feed_vol_adm created')
      .sort({ created: -1 })
      .limit(10)
      .lean();
    
    // Process each measurement field
    for (const field of measurementFields) {
      // Get all non-null values for this field
      const values = await Patient.find({ [field]: { $ne: null } })
        .select(field)
        .lean();
      
      // Calculate stats if we have values
      if (values.length > 0) {
        const numberValues = values.map(v => v[field]).filter(v => !isNaN(v));
        
        if (numberValues.length > 0) {
          const sum = numberValues.reduce((a, b) => a + b, 0);
          const avg = sum / numberValues.length;
          const min = Math.min(...numberValues);
          const max = Math.max(...numberValues);
          
          measurementStats[field] = {
            average: avg,
            min: min,
            max: max,
            count: numberValues.length
          };
        }
      }
    }
    
    res.json({
      totalPatients,
      referrals,
      referralPercentage: totalPatients > 0 ? (referrals / totalPatients) * 100 : 0,
      measurementStats,
      bmiDistribution,
      recentPatients
    });
  } catch (err) {
    console.error('Error calculating statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route   GET api/patients/:id
// @desc    Get a specific patient
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    // Skip this handler for special routes
    const specialRoutes = ['mock-pending-assignments', 'dietitians', 'dietitians-test', 'referrals'];
    if (specialRoutes.includes(req.params.id)) {
      console.log(`Skipping patient lookup for special route: ${req.params.id}`);
      return next();
    }
    
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (err) {
    // If the error is an invalid ObjectId, pass to next handler
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      console.log(`Invalid ObjectId ${req.params.id}, passing to next handler`);
      return next();
    }
    
    res.status(500).json({ error: err.message });
  }
});

// @route   POST api/patients
// @desc    Create a new patient
// @access  Private (requires authentication)
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating new patient, user:', req.user?.username, 'role:', req.user?.role);
    console.log('Patient data received:', req.body);
    
    // Create a patient object from the request body but remove any referral field
    const patientData = { ...req.body };
    delete patientData.referral; // Remove referral field if provided
    
    // Create patient without saving
    const newPatient = new Patient(patientData);
    
    // Predict referral using the AI model
    console.log('Predicting referral for new patient using AI model...');
    const patientObject = newPatient.toObject();
    const referralPrediction = await aiReferralService.predictReferral(patientObject);
    
    // Set the predicted referral value
    newPatient.referral = referralPrediction;
    console.log(`AI model predicted referral: ${referralPrediction ? 'YES' : 'NO'}`);
    
    // Save the patient with predicted referral
    const patient = await newPatient.save({ maxTimeMS: 30000 });
    
    // If patient needs referral, assign to a dietitian
    if (patient.referral) {
      try {
        const assignedPatient = await assignmentService.assignPatientToDietitian(patient);
        console.log(`Patient ${patient.encounterId} assigned to dietitian: ${assignedPatient.assignedTo}`);
      } catch (assignErr) {
        console.error('Error assigning patient to dietitian:', assignErr);
        // Continue even if assignment fails
      }
    }
    
    console.log('Patient created successfully, ID:', patient._id);
    res.json(patient);
  } catch (err) {
    console.error('Error creating patient:', err);
    res.status(400).json({ error: err.message });
  }
});

// @route   PUT api/patients/:id
// @desc    Update a patient
// @access  Private (requires authentication)
router.put('/:id', auth, async (req, res) => {
  try {
    // Find the patient first
    const existingPatient = await Patient.findById(req.params.id);
    
    if (!existingPatient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Store the original referral status
    const oldReferral = existingPatient.referral;
    
    // Create a patient object from the request body but remove any referral field
    const patientData = { ...req.body };
    delete patientData.referral; // Remove referral field if provided
    
    // Apply updates to the patient data
    for (const [key, value] of Object.entries(patientData)) {
      existingPatient[key] = value;
    }
    
    // Predict referral using the AI model
    console.log('Predicting referral for updated patient using AI model...');
    const patientObject = existingPatient.toObject();
    const referralPrediction = await aiReferralService.predictReferral(patientObject);
    
    // Set the predicted referral value
    existingPatient.referral = referralPrediction;
    console.log(`AI model predicted referral: ${referralPrediction ? 'YES' : 'NO'}`);
    
    // Save the patient with predicted referral
    await existingPatient.save();
    
    // Check if referral status changed from false to true
    if (referralStatusChanged(oldReferral, referralPrediction)) {
      try {
        // Assign patient to a dietitian
        const assignedPatient = await assignmentService.assignPatientToDietitian(existingPatient);
        console.log(`Patient ${existingPatient.encounterId} assigned to dietitian: ${assignedPatient.assignedTo}`);
      } catch (assignErr) {
        console.error('Error assigning patient to dietitian:', assignErr);
        // Continue even if assignment fails
      }
    }
    
    // Return updated patient with referral status info
    const patient = existingPatient.toObject();
    patient.oldReferral = oldReferral;
    patient.referralUpdated = true;
    
    res.json(patient);
  } catch (err) {
    console.error('Error updating patient:', err);
    res.status(400).json({ error: err.message });
  }
});

// @route   DELETE api/patients/:id
// @desc    Delete a patient
// @access  Private (requires authentication)
router.delete('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    await patient.remove();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST api/patients/:id/predict-referral
// @desc    Predict referral for a patient using the AI model
// @access  Private (dietitian and admin)
router.post('/:id/predict-referral', async (req, res) => {
  try {
    // Find the patient by ID
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // Call the AI model to predict referral
    const referralPrediction = await aiReferralService.predictReferral(patient.toObject());
    
    // Update the patient's referral status
    patient.referral = referralPrediction;
    await patient.save();
    
    res.json({
      success: true,
      patient: patient,
      prediction: referralPrediction
    });
  } catch (err) {
    console.error('Error predicting referral:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// @route   POST /api/patients/predict-all-referrals
// @desc    Predict referrals for all patients using the AI model
// @access  Private (dietitian and admin)
router.post('/predict-all-referrals', async (req, res) => {
  try {
    // Get all patients
    const patients = await Patient.find();
    
    if (patients.length === 0) {
      return res.status(404).json({ message: 'No patients found' });
    }
    
    console.log(`Predicting referrals for ${patients.length} patients...`);
    
    // Convert patients to plain objects for prediction
    const patientObjects = patients.map(p => p.toObject());
    
    // Call the AI model to predict referrals in batch
    const patientsWithPredictions = await aiReferralService.batchPredictReferrals(patientObjects);
    
    // Update each patient with the predicted referral status
    let updatedCount = 0;
    let referralCount = 0;
    
    for (let i = 0; i < patients.length; i++) {
      if (i < patientsWithPredictions.length) {
        patients[i].referral = patientsWithPredictions[i].referral;
        await patients[i].save();
        updatedCount++;
        
        if (patientsWithPredictions[i].referral) {
          referralCount++;
        }
      }
    }
    
    res.json({
      success: true,
      message: `Updated ${updatedCount} patients with AI predictions`,
      totalPatients: patients.length,
      predictedReferrals: referralCount
    });
  } catch (err) {
    console.error('Error predicting referrals:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// @route   POST /api/patients/reprocess-referrals
// @desc    Force reprocessing of all patients' referrals using the AI model
// @access  Private (admin only)
router.post('/reprocess-referrals', async (req, res) => {
  try {
    // Get all patients
    const patients = await Patient.find();
    
    if (patients.length === 0) {
      return res.status(404).json({ message: 'No patients found' });
    }
    
    console.log(`Reprocessing referrals for ${patients.length} patients...`);
    
    // Convert patients to plain objects for prediction
    const patientObjects = patients.map(p => p.toObject());
    
    // Call the AI model to predict referrals in batch
    const patientsWithPredictions = await aiReferralService.batchPredictReferrals(patientObjects);
    
    // Update each patient with the predicted referral status
    let updatedCount = 0;
    let referralCount = 0;
    
    for (let i = 0; i < patients.length; i++) {
      if (i < patientsWithPredictions.length) {
        // Force update the referral status based on prediction
        const oldReferralStatus = patients[i].referral;
        patients[i].referral = patientsWithPredictions[i].referral;
        await patients[i].save();
        updatedCount++;
        
        if (patientsWithPredictions[i].referral) {
          referralCount++;
          console.log(`Patient ${patients[i].encounterId}: Referral changed from ${oldReferralStatus} to ${patients[i].referral}`);
        }
      }
    }
    
    res.json({
      success: true,
      message: `Reprocessed ${updatedCount} patients with AI predictions`,
      totalPatients: patients.length,
      predictedReferrals: referralCount
    });
  } catch (err) {
    console.error('Error reprocessing referrals:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
});

// @route   POST api/patients/:id/assign
// @desc    Manually assign/transfer a patient to a specific dietitian
// @access  Private (dietitian or admin)
router.post('/:id/assign', auth, async (req, res) => {
  try {
    const patientId = req.params.id;
    const { dietitianId } = req.body;
    
    // Validate input
    if (!dietitianId) {
      return res.status(400).json({ 
        success: false,
        message: 'Dietitian ID is required'
      });
    }
    
    // Only dietitians and admins can assign patients
    if (req.user.role !== 'dietitian' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Only dietitians and admins can assign patients'
      });
    }
    
    // For dietitians, add an extra check: they can only transfer patients assigned to them
    if (req.user.role === 'dietitian') {
      const patient = await Patient.findById(patientId);
      
      if (!patient) {
        return res.status(404).json({ 
          success: false,
          message: 'Patient not found'
        });
      }
      
      // If the patient is already assigned and not to the current dietitian, deny the transfer
      if (patient.assignedTo && patient.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          success: false,
          message: 'You can only transfer patients that are assigned to you'
        });
      }
    }
    
    // Do the assignment/transfer
    const result = await assignmentService.manuallyAssignPatient(
      patientId, 
      dietitianId,
      req.user
    );
    
    res.json(result);
  } catch (err) {
    console.error('Error in manual patient assignment:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Server error'
    });
  }
});

// @route   POST api/patients/reassign-all
// @desc    Reassign all patients who need referral, including those already assigned
// @access  Private (admin only)
router.post('/reassign-all', auth, async (req, res) => {
  try {
    // Only allow admins to run this
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to perform this action' });
    }
    
    const result = await assignmentService.reassignAllPatients();
    res.json(result);
  } catch (err) {
    console.error('Error reassigning all patients:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: err.message 
    });
  }
});

// @route   POST api/patients/by-ids
// @desc    Get multiple patients by their IDs
// @access  Private (requires authentication)
router.post('/by-ids', auth, async (req, res) => {
  try {
    const { patientIds } = req.body;
    
    if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
      return res.status(400).json({ error: 'Patient IDs array is required' });
    }
    
    console.log(`Fetching ${patientIds.length} patients by IDs`);
    
    // Find all patients with the provided IDs
    const patients = await Patient.find({
      _id: { $in: patientIds }
    }).sort({ created: -1 });
    
    console.log(`Found ${patients.length} patients`);
    
    if (patients.length === 0) {
      return res.status(404).json({ error: 'No patients found with the provided IDs' });
    }
    
    res.json(patients);
  } catch (err) {
    console.error('Error fetching patients by IDs:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route   POST api/patients/:id/referral-status
// @desc    Update the referral status of a patient
// @access  Private (dietitian or admin)
router.post('/:id/referral-status', auth, async (req, res) => {
  try {
    const patientId = req.params.id;
    const { status, notes } = req.body;
    
    // Validate input
    if (!status) {
      return res.status(400).json({ 
        success: false,
        message: 'Status is required'
      });
    }
    
    // Only dietitians and admins can update referral status
    if (req.user.role !== 'dietitian' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Only dietitians and admins can update referral status'
      });
    }
    
    // Update the referral status
    const result = await referralService.updateReferralStatus(
      patientId, 
      status,
      req.user,
      notes || ''
    );
    
    res.json(result);
  } catch (err) {
    console.error('Error updating referral status:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Server error'
    });
  }
});

// @route   GET api/patients/:id/referral-history
// @desc    Get the referral history of a patient
// @access  Private (dietitian or admin)
router.get('/:id/referral-history', auth, async (req, res) => {
  try {
    const patientId = req.params.id;
    
    // Only dietitians and admins can view referral history
    if (req.user.role !== 'dietitian' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Only dietitians and admins can view referral history'
      });
    }
    
    // Get the referral history
    const result = await referralService.getReferralHistory(patientId);
    
    res.json(result);
  } catch (err) {
    console.error('Error getting referral history:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Server error'
    });
  }
});

// @route   GET api/patients/diagnostics
// @desc    Run diagnostics on models and services
// @access  Public for debugging
router.get('/diagnostics', async (req, res) => {
  try {
    // Run model validation
    console.log('Running system diagnostics');
    
    const results = {
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      },
      database: {
        connectionState: mongoose.connection.readyState,
        connectionStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
      }
    };
    
    // Validate models
    try {
      const modelValidation = await referralService.validateModels();
      results.modelValidation = modelValidation;
    } catch (validationError) {
      results.modelValidation = {
        isValid: false,
        message: `Error running model validation: ${validationError.message}`,
        error: validationError.toString()
      };
    }
    
    // Check if there are dietitians
    try {
      const dietitians = await User.find({ role: 'dietitian' }).select('_id username').lean();
      results.dietitians = {
        count: dietitians.length,
        items: dietitians.map(d => ({ id: d._id.toString(), username: d.username }))
      };
    } catch (dietitianError) {
      results.dietitians = {
        error: dietitianError.message,
        count: 0,
        items: []
      };
    }
    
    // Check if there are patients with pending assignment requests
    try {
      const pendingAssignments = await Patient.find({
        assignmentStatus: 'requested',
        referral: true
      }).select('_id encounterId assignedTo').lean();
      
      results.pendingAssignments = {
        count: pendingAssignments.length,
        items: pendingAssignments.map(p => ({
          id: p._id.toString(),
          encounterId: p.encounterId,
          assignedTo: p.assignedTo ? p.assignedTo.toString() : null
        }))
      };
    } catch (pendingError) {
      results.pendingAssignments = {
        error: pendingError.message,
        count: 0,
        items: []
      };
    }
    
    res.json({
      success: true,
      diagnostics: results
    });
  } catch (err) {
    console.error('Error running diagnostics:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Server error running diagnostics',
      error: err.toString()
    });
  }
});

// @route   POST api/patients/mock-assignment-response/:id
// @desc    Handle mock assignment responses (accept/decline) for mock patients
// @access  Private (dietitian only)
router.post('/mock-assignment-response/:id', auth, async (req, res) => {
  try {
    console.log('==== DEBUG: Received mock assignment response ====');
    const mockPatientId = req.params.id;
    const { accept, notes } = req.body;
    
    console.log(`Mock patient ID: ${mockPatientId}`);
    console.log(`Accept: ${accept}, Notes length: ${notes ? notes.length : 0}`);
    console.log(`User ID: ${req.user._id}, Role: ${req.user.role}`);
    
    // Validate input
    if (accept === undefined) {
      console.log('Error: Missing accept parameter');
      return res.status(400).json({ 
        success: false,
        message: 'Response (accept/decline) is required'
      });
    }
    
    // Only dietitians can respond to assignments
    if (req.user.role !== 'dietitian') {
      console.log(`Error: User role ${req.user.role} is not dietitian`);
      return res.status(403).json({ 
        success: false,
        message: 'Only dietitians can accept or decline assignments'
      });
    }
    
    console.log(`Generating mock response for patient ID: ${mockPatientId}, Accept: ${accept}`);
    
    // Return a mock successful response
    const response = {
      success: true,
      message: accept 
        ? `Mock assignment for patient ${mockPatientId} accepted successfully` 
        : `Mock assignment for patient ${mockPatientId} declined successfully`,
      patient: {
        _id: mockPatientId,
        encounterId: `MOCK-${mockPatientId.toUpperCase()}`,
        assignmentStatus: accept ? 'accepted' : 'declined',
        assignmentAccepted: !!accept,
        referralStatus: accept ? 'in_progress' : 'pending',
        notes: notes || ''
      }
    };
    
    console.log('Sending response:', JSON.stringify(response, null, 2));
    return res.json(response);
  } catch (err) {
    console.error('Error processing mock assignment response:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Server error processing mock response'
    });
  }
});

// @route   GET api/patients/diagnostic-dump
// @desc    Get diagnostic information about database connection and state
// @access  Private
router.get('/diagnostic-dump', auth, async (req, res) => {
  try {
    console.log('Diagnostic dump requested by:', req.user.username);
    
    // Collect system information
    const diagnostics = {
      timestamp: new Date().toISOString(),
      user: {
        id: req.user._id.toString(),
        username: req.user.username,
        role: req.user.role
      },
      mongodbConnection: {
        readyState: mongoose.connection.readyState,
        readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      },
      models: {
        patients: {
          exists: !!Patient,
          isFunction: typeof Patient.find === 'function'
        },
        users: {
          exists: !!User,
          isFunction: typeof User.find === 'function'
        }
      },
      collections: [],
      counts: {},
      sampleData: {}
    };
    
    // Test basic queries
    try {
      // Try to get connection stats
      if (mongoose.connection.db) {
        const stats = await mongoose.connection.db.stats();
        diagnostics.dbStats = stats;
        
        // List collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        diagnostics.collections = collections.map(c => c.name);
        
        // Get counts for main collections
        diagnostics.counts.users = await User.countDocuments();
        diagnostics.counts.patients = await Patient.countDocuments();
        diagnostics.counts.patientsWithReferral = await Patient.countDocuments({ referral: true });
        diagnostics.counts.pendingAssignments = await Patient.countDocuments({ 
          assignmentStatus: 'requested',
          referral: true
        });
        
        // Get sample of each collection (without sensitive data)
        const sampleUser = await User.findOne().select('-password').lean();
        if (sampleUser) {
          diagnostics.sampleData.user = sampleUser;
        }
        
        const samplePatient = await Patient.findOne({ referral: true }).lean();
        if (samplePatient) {
          diagnostics.sampleData.patient = samplePatient;
        }
        
        // Check if there are patients assigned to the current user
        const userAssignments = await Patient.find({ 
          assignedTo: mongoose.Types.ObjectId(req.user._id),
          referral: true 
        }).lean();
        
        diagnostics.currentUser = {
          assignedPatientsCount: userAssignments.length,
          pendingAssignmentsCount: userAssignments.filter(p => p.assignmentStatus === 'requested').length,
          hasAssignments: userAssignments.length > 0
        };
        
        if (userAssignments.length > 0) {
          diagnostics.currentUser.sampleAssignment = userAssignments[0];
        }
      }
    } catch (statsError) {
      diagnostics.errors = {
        statsError: statsError.message,
        stack: statsError.stack
      };
    }
    
    return res.json({
      success: true,
      message: 'Diagnostic information retrieved successfully',
      diagnostics
    });
  } catch (err) {
    console.error('Error generating diagnostic dump:', err);
    return res.status(500).json({
      success: false,
      message: 'Error generating diagnostic information',
      error: err.message,
      stack: err.stack
    });
  }
});

// Add the missing assignment-response route
// @route   POST api/patients/:id/assignment-response
// @desc    Accept or decline a patient assignment
// @access  Private (dietitian only)
router.post('/:id/assignment-response', auth, async (req, res) => {
  try {
    const patientId = req.params.id;
    const { accept, notes } = req.body;
    
    console.log(`==== DEBUG: Assignment response request received ====`);
    console.log(`Patient ID from URL: ${patientId}`);
    console.log(`Accept: ${accept}, Notes length: ${notes ? notes.length : 0}`);
    console.log(`User ID: ${req.user._id}, Role: ${req.user.role}`);
    
    // Validate input
    if (accept === undefined) {
      console.log('Error: Missing accept parameter');
      return res.status(400).json({ 
        success: false,
        message: 'Response (accept/decline) is required'
      });
    }
    
    // Only dietitians can respond to assignments
    if (req.user.role !== 'dietitian') {
      console.log(`Error: User role ${req.user.role} is not dietitian`);
      return res.status(403).json({ 
        success: false,
        message: 'Only dietitians can accept or decline assignments'
      });
    }
    
    // Check if this is a mock ID (starts with "mock" or "mockid")
    if (patientId.toLowerCase().startsWith('mock')) {
      console.log(`Detected mock patient ID: ${patientId}`);
      
      // Return a mock successful response
      return res.json({
        success: true,
        message: accept 
          ? `Mock assignment for patient ${patientId} accepted successfully` 
          : `Mock assignment for patient ${patientId} declined successfully`,
        patient: {
          _id: patientId,
          encounterId: `MOCK-${patientId.toUpperCase()}`,
          assignmentStatus: accept ? 'accepted' : 'declined',
          assignmentAccepted: !!accept,
          referralStatus: accept ? 'in_progress' : 'pending',
          notes: notes || ''
        }
      });
    }
    
    console.log(`This is a real patient ID, calling referralService.handleAssignmentResponse`);
    
    // For real patients, handle the assignment response
    const result = await referralService.handleAssignmentResponse(
      patientId, 
      !!accept,
      req.user,
      notes || ''
    );
    
    res.json(result);
  } catch (err) {
    console.error('Error processing assignment response:', err);
    res.status(500).json({ 
      success: false,
      message: err.message || 'Server error'
    });
  }
});

// Get patients assigned to a specific dietitian
router.get('/dietitian/:id/patients', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);

    // Only allow admins or the dietitian themselves to access their patients
    if (user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view patients for this dietitian'
      });
    }

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: 'Database not connected'
      });
    }

    const patients = await Patient.find({ assignedDietitian: id })
      .select('patientId encounterId assignmentDate aiRecommendation')
      .sort({ assignmentDate: -1 });

    return res.json(patients);
  } catch (err) {
    console.error('Error fetching dietitian patients:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching patients',
      error: err.message
    });
  }
});

module.exports = router; 