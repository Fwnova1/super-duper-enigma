const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

const auth = async (req, res, next) => {
  try {
    console.log('Auth middleware called');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No authentication token provided');
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    const jwtSecret = config.jwtSecret;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not set in config');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    console.log('Attempting to verify token');
    const decoded = jwt.verify(token, jwtSecret);
    console.log('Token decoded:', { userId: decoded.userId });
    
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log(`User with ID ${decoded.userId} not found in database`);
      return res.status(401).json({ message: 'Token is not valid' });
    }

    console.log(`User authenticated: ${user.username} (${user._id}), Role: ${user.role}`);
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const dietitianAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (req.user.role !== 'dietitian' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Dietitian or admin privileges required.' });
    }
    
    next();
  } catch (error) {
    console.error('Dietitian auth middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Higher-order function that creates middleware for specific roles
const roleAuth = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}.` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Role auth middleware error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

module.exports = { auth, adminAuth, dietitianAuth, roleAuth }; 