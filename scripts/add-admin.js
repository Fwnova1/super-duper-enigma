#!/usr/bin/env node

/**
 * This script adds an admin user to the MongoDB database.
 * Usage: node add-admin.js username email password fullName
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Check for required arguments
if (process.argv.length < 5) {
  console.error('Usage: node add-admin.js username email password [fullName]');
  process.exit(1);
}

// Get command line arguments
const username = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];
const fullName = process.argv[5] || username;

// MongoDB connection
async function main() {
  try {
    // Try to read from docker-compose.yml to get MongoDB URI
    let mongoUri = '';
    try {
      const composeFile = fs.readFileSync(path.join(process.cwd(), 'docker-compose.yml'), 'utf8');
      const match = composeFile.match(/MONGO_URI=([^\s]+)/);
      if (match && match[1]) {
        mongoUri = match[1];
      }
    } catch (err) {
      console.log('Could not read docker-compose.yml, using default MongoDB URI');
    }

    // If we couldn't extract from docker-compose, use the default
    if (!mongoUri) {
      mongoUri = 'mongodb://admin:password@mongodb:27017/feeding-dashboard?authSource=admin';
    }

    console.log(`Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    
    // Define User Schema (simplified version from your actual model)
    const UserSchema = new mongoose.Schema({
      username: {
        type: String,
        required: true,
        unique: true
      },
      email: {
        type: String,
        required: true,
        unique: true
      },
      password: {
        type: String,
        required: true
      },
      role: {
        type: String,
        enum: ['admin', 'dietitian'],
        default: 'dietitian'
      },
      fullName: String,
      createdAt: {
        type: Date,
        default: Date.now
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    });

    const User = mongoose.model('User', UserSchema);

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: username },
        { email: email }
      ]
    });

    if (existingUser) {
      console.log('User with this username or email already exists!');
      if (existingUser.role !== 'admin') {
        console.log('Updating user role to admin...');
        existingUser.role = 'admin';
        await existingUser.save();
        console.log('User role updated to admin successfully!');
      } else {
        console.log('User already has admin role.');
      }
      await mongoose.disconnect();
      return;
    }

    // Create new admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: 'admin',
      fullName
    });

    await newUser.save();
    console.log('Admin user created successfully!');
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`Role: admin`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 