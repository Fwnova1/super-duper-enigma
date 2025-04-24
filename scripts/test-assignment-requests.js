// Script to test patient assignment functionality
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Patient = require('../models/Patient');
const User = require('../models/User');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Test data
const TEST_PATIENTS = [
  {
    encounterId: 'TESTREQ001',
    bmi: 24.5,
    feed_vol: 120,
    assignmentStatus: 'requested',
    assignmentAccepted: false,
    referral: true,
    referralStatus: 'pending',
    end_tidal_co2: 38,
    temperature: 37.1,
    blood_pressure: 120,
    heart_rate: 78,
    respiratory_rate: 16
  },
  {
    encounterId: 'TESTREQ002',
    bmi: 28.2,
    feed_vol: 150,
    assignmentStatus: 'requested',
    assignmentAccepted: false,
    referral: true,
    referralStatus: 'pending',
    end_tidal_co2: 35,
    temperature: 37.4,
    blood_pressure: 125,
    heart_rate: 82,
    respiratory_rate: 18
  },
  {
    encounterId: 'TESTACCEPTED001',
    bmi: 22.1,
    feed_vol: 110,
    assignmentStatus: 'accepted',
    assignmentAccepted: true,
    referral: true,
    referralStatus: 'in_progress',
    end_tidal_co2: 40,
    temperature: 36.9,
    blood_pressure: 118,
    heart_rate: 75,
    respiratory_rate: 15
  }
];

async function runTest() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/feeding-dashboard';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');

    // Find all dietitians
    const dietitians = await User.find({ role: 'dietitian' }).select('_id username email').lean();
    console.log(`Found ${dietitians.length} dietitians in database`);
    
    if (dietitians.length === 0) {
      console.error('No dietitians found. Please create at least one dietitian user first.');
      process.exit(1);
    }

    const selectedDietitian = dietitians[0];
    console.log(`Selected dietitian for test: ${selectedDietitian.username} (${selectedDietitian._id})`);

    // Remove any existing test patients
    console.log('Cleaning up existing test patients...');
    await Patient.deleteMany({ encounterId: { $in: TEST_PATIENTS.map(p => p.encounterId) } });

    // Create new test patients
    console.log('Creating test patients...');
    const createdPatients = [];

    for (const patientData of TEST_PATIENTS) {
      const newPatient = new Patient({
        ...patientData,
        assignedTo: selectedDietitian._id,
        assignedDate: new Date(),
        created: new Date()
      });

      await newPatient.save();
      createdPatients.push(newPatient);
      console.log(`Created patient ${newPatient.encounterId} (${newPatient._id})`);
    }

    // Log the results
    const requestedPatients = createdPatients.filter(p => p.assignmentStatus === 'requested');
    const acceptedPatients = createdPatients.filter(p => p.assignmentStatus === 'accepted');

    console.log('\n=== TEST RESULTS ===');
    console.log(`Total patients created: ${createdPatients.length}`);
    console.log(`Pending assignments: ${requestedPatients.length}`);
    console.log(`Accepted assignments: ${acceptedPatients.length}`);

    // Check if we can properly query them
    console.log('\nChecking queries...');
    
    // Query for requested assignments
    const requestedResults = await Patient.find({
      assignedTo: selectedDietitian._id,
      assignmentStatus: 'requested',
      referral: true
    });
    console.log(`Found ${requestedResults.length} patients with requested status for dietitian ${selectedDietitian.username}`);
    
    // Query for accepted assignments
    const acceptedResults = await Patient.find({
      assignedTo: selectedDietitian._id,
      assignmentAccepted: true
    });
    console.log(`Found ${acceptedResults.length} patients with accepted status for dietitian ${selectedDietitian.username}`);

    console.log('\n✅ Test completed successfully!');
    console.log('You can now test the pending assignments tab and my patients tab in the UI.');
    
    process.exit(0);
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

runTest(); 