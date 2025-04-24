/**
 * This script creates a test dietitian user in the database
 * Run with: node scripts/create-test-dietitian.js
 */
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
})
.then(() => console.log('MongoDB connected for creating test dietitian'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const createTestDietitian = async () => {
  try {
    // Check if test dietitian already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: 'test.dietitian@example.com' }, 
        { username: 'test_dietitian' }
      ]
    });
    
    if (existingUser) {
      console.log('Test dietitian already exists:', {
        id: existingUser._id,
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role
      });
      mongoose.disconnect();
      return;
    }

    // Create test dietitian
    const dietitian = new User({
      username: 'test_dietitian',
      email: 'test.dietitian@example.com',
      password: 'password123',
      role: 'dietitian'
    });

    await dietitian.save();
    
    console.log('Test dietitian created successfully:', {
      id: dietitian._id,
      username: dietitian.username,
      email: dietitian.email,
      role: dietitian.role
    });

    // Create a second dietitian for good measure
    const dietitian2 = new User({
      username: 'dietitian2',
      email: 'dietitian2@example.com',
      password: 'password123',
      role: 'dietitian'
    });

    await dietitian2.save();
    
    console.log('Second dietitian created successfully:', {
      id: dietitian2._id,
      username: dietitian2.username,
      email: dietitian2.email,
      role: dietitian2.role
    });

    console.log('Script completed successfully');
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating test dietitian:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

createTestDietitian(); 