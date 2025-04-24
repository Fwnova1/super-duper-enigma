/**
 * This script creates a custom dietitian user in the database
 * Run with: node scripts/create-custom-dietitian.js
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
.then(() => console.log('MongoDB connected for creating custom dietitian'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const createCustomDietitian = async () => {
  try {
    // Check if custom dietitian already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: 'custom.dietitian@example.com' }, 
        { username: 'custom_dietitian' }
      ]
    });
    
    if (existingUser) {
      console.log('Custom dietitian already exists:', {
        id: existingUser._id,
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role,
        password: 'password123' // Note: This is just for display purposes
      });
      mongoose.disconnect();
      return;
    }

    // Create custom dietitian
    const dietitian = new User({
      username: 'custom_dietitian',
      email: 'custom.dietitian@example.com',
      password: 'password123',
      role: 'dietitian'
    });

    await dietitian.save();
    
    console.log('Custom dietitian created successfully:', {
      id: dietitian._id,
      username: dietitian.username,
      email: dietitian.email,
      role: dietitian.role,
      password: 'password123' // Note: This is just for display purposes
    });

    console.log('Script completed successfully');
    mongoose.disconnect();
  } catch (error) {
    console.error('Error creating custom dietitian:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

createCustomDietitian(); 