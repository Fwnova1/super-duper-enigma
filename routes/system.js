const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');

/**
 * @route   GET api/system/db-status
 * @desc    Check database connection status
 * @access  Private
 */
router.get('/db-status', auth, async (req, res) => {
  try {
    console.log('DB status check requested by:', req.user.username, '(', req.user.role, ')');
    
    // Get current Mongoose connection state
    const connectionState = mongoose.connection.readyState;
    
    // Map connection state to readable format
    const stateMap = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting',
      99: 'Uninitialized'
    };
    
    console.log('Current MongoDB connection state:', connectionState, stateMap[connectionState]);
    
    // Quick health check
    let healthy = false;
    let collections = [];
    
    if (connectionState === 1) {
      try {
        // Get list of collections as a simple DB operation test
        collections = await mongoose.connection.db.listCollections().toArray();
        healthy = true;
      } catch (dbError) {
        console.error('Error performing database operation:', dbError);
        healthy = false;
      }
    }
    
    return res.json({
      success: true,
      dbState: connectionState,
      status: stateMap[connectionState] || 'Unknown',
      healthy,
      collections: collections.map(c => c.name),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error checking database status:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error checking database status',
      dbState: mongoose.connection?.readyState || 'unknown'
    });
  }
});

module.exports = router; 