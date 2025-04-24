// Script to create test patient assignments with "requested" status
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Patient = require('../models/Patient');
const User = require('../models/User');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function createTestAssignments() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/feeding-dashboard';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');

    // Find a dietitian user
    const dietitian = await User.findOne({ role: 'dietitian' });
    if (!dietitian) {
      console.error('No dietitian user found. Please create a dietitian user first.');
      process.exit(1);
    }
    console.log(`Found dietitian: ${dietitian.username} (${dietitian._id})`);

    // Create or update test patients with assignment requests
    const testPatients = [
      {
        encounterId: 'TEST001',
        referral: true,
        referralStatus: 'pending',
        bmi: 25.5,
        feed_vol: 1500,
        end_tidal_co2: 40,
        fio2: 21,
        oxygen_flow_rate: 2,
        peep: 5,
        pip: 20,
        resp_rate: 18,
        tidal_vol: 500
      },
      {
        encounterId: 'TEST002',
        referral: true,
        referralStatus: 'pending',
        bmi: 30.2,
        feed_vol: 1800,
        end_tidal_co2: 42,
        fio2: 25,
        oxygen_flow_rate: 3,
        peep: 6,
        pip: 22,
        resp_rate: 20,
        tidal_vol: 550
      },
      {
        encounterId: 'TEST003',
        referral: true,
        referralStatus: 'pending',
        bmi: 28.7,
        feed_vol: 1600,
        end_tidal_co2: 41,
        fio2: 23,
        oxygen_flow_rate: 2.5,
        peep: 5.5,
        pip: 21,
        resp_rate: 19,
        tidal_vol: 525
      }
    ];

    for (const patientData of testPatients) {
      // Check if patient already exists
      let patient = await Patient.findOne({ encounterId: patientData.encounterId });

      if (patient) {
        console.log(`Updating existing patient: ${patientData.encounterId}`);
        // Update the patient
        patient.referral = patientData.referral;
        patient.referralStatus = patientData.referralStatus;
        patient.assignedTo = dietitian._id;
        patient.assignedDate = new Date();
        patient.assignmentAccepted = false;
        patient.assignmentStatus = 'requested';
      } else {
        console.log(`Creating new patient: ${patientData.encounterId}`);
        // Create a new patient
        patient = new Patient({
          ...patientData,
          assignedTo: dietitian._id,
          assignedDate: new Date(),
          assignmentAccepted: false,
          assignmentStatus: 'requested'
        });
      }

      // Save the patient
      await patient.save();
      console.log(`Patient ${patientData.encounterId} saved with assignment request to ${dietitian.username}`);
    }

    console.log(`Successfully created/updated ${testPatients.length} test patients with assignment requests.`);
    
    // Verify the assignments were created correctly
    const assignments = await Patient.find({
      assignedTo: dietitian._id,
      assignmentStatus: 'requested'
    });
    
    console.log(`Found ${assignments.length} assignments with status 'requested' for dietitian ${dietitian.username}`);
    assignments.forEach(a => {
      console.log(`- ${a.encounterId} (ID: ${a._id}), status: ${a.assignmentStatus}, referral: ${a.referral}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating test assignments:', error);
    process.exit(1);
  }
}

createTestAssignments(); 