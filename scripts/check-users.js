// Script to check users in the database
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkUsers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/feeding-dashboard';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');

    // Find all users
    const users = await User.find().select('-password');
    console.log(`Found ${users.length} users in the database:`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user._id}) - Role: ${user.role}, Email: ${user.email}`);
    });

    // Find dietitian users
    const dietitians = users.filter(user => user.role === 'dietitian');
    console.log(`\nFound ${dietitians.length} dietitian users:`);
    
    dietitians.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user._id}) - Email: ${user.email}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error checking users:', error);
    process.exit(1);
  }
}

checkUsers(); 