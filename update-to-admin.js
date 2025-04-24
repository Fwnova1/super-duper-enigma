// Script to update a user role to admin
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// User ID to update (from the registration response)
const userId = '68052c0d6d84867288e48a66';

async function updateUserToAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Find user and update role
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }
    
    console.log(`Found user: ${user.username} (${user.email}) with role: ${user.role}`);
    
    // Update user role to admin
    user.role = 'admin';
    await user.save();
    
    console.log(`User ${user.username} updated to admin role successfully!`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

updateUserToAdmin(); 