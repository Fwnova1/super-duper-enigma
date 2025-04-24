// Script to check a specific dietitian's pending assignments
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Patient = require('../models/Patient');
const User = require('../models/User');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Dietitian ID to check (use one from the previous script output)
const DIETITIAN_ID = '68050d3e4193175f994145e4'; // manh2

async function checkAssignments() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/feeding-dashboard';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');

    // Verify the dietitian exists
    const dietitian = await User.findById(DIETITIAN_ID);
    if (!dietitian) {
      console.error(`Dietitian with ID ${DIETITIAN_ID} not found!`);
      process.exit(1);
    }
    console.log(`Checking assignments for dietitian: ${dietitian.username} (${dietitian._id})`);

    // Find all assignments for this dietitian
    const allAssignments = await Patient.find({
      assignedTo: DIETITIAN_ID
    });
    console.log(`\nTotal assignments for this dietitian: ${allAssignments.length}`);
    
    if (allAssignments.length > 0) {
      console.log('\nAll assignments:');
      allAssignments.forEach((patient, index) => {
        console.log(`${index + 1}. Patient ${patient.encounterId} (${patient._id})`);
        console.log(`   - Assignment Status: ${patient.assignmentStatus || 'null'}`);
        console.log(`   - Assignment Accepted: ${patient.assignmentAccepted}`);
        console.log(`   - Referral: ${patient.referral}`);
        console.log(`   - Referral Status: ${patient.referralStatus || 'null'}`);
        console.log(`   - Assigned Date: ${patient.assignedDate ? new Date(patient.assignedDate).toLocaleString() : 'N/A'}`);
      });
    }

    // Find pending assignments with status "requested"
    const pendingAssignments = await Patient.find({
      assignedTo: DIETITIAN_ID,
      assignmentStatus: 'requested',
      referral: true
    });
    
    console.log(`\nPending assignments with status "requested": ${pendingAssignments.length}`);
    
    if (pendingAssignments.length > 0) {
      console.log('\nPending assignments:');
      pendingAssignments.forEach((patient, index) => {
        console.log(`${index + 1}. Patient ${patient.encounterId} (${patient._id})`);
        console.log(`   - Assignment Status: ${patient.assignmentStatus}`);
        console.log(`   - Referral: ${patient.referral}`);
        console.log(`   - Assigned Date: ${patient.assignedDate ? new Date(patient.assignedDate).toLocaleString() : 'N/A'}`);
      });
    } else {
      console.log('No pending assignments found with status "requested"');
    }

    // Let's check if there might be any patients with incorrect status
    const assignedButNotRequested = await Patient.find({
      assignedTo: DIETITIAN_ID,
      assignmentStatus: { $ne: 'requested' },
      assignmentAccepted: false
    });
    
    console.log(`\nAssignments not marked as "requested" but not yet accepted: ${assignedButNotRequested.length}`);
    
    if (assignedButNotRequested.length > 0) {
      console.log('\nAssignments that should possibly be marked as "requested":');
      assignedButNotRequested.forEach((patient, index) => {
        console.log(`${index + 1}. Patient ${patient.encounterId} (${patient._id})`);
        console.log(`   - Assignment Status: ${patient.assignmentStatus || 'null'}`);
        console.log(`   - Assignment Accepted: ${patient.assignmentAccepted}`);
        console.log(`   - Referral: ${patient.referral}`);
        console.log(`   - Assigned Date: ${patient.assignedDate ? new Date(patient.assignedDate).toLocaleString() : 'N/A'}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking assignments:', error);
    process.exit(1);
  }
}

checkAssignments(); 