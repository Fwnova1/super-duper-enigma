const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const csv = require('csv-parser');
const fs = require('fs');
const Patient = require('../models/Patient');
const aiReferralService = require('../services/aiReferralService');

// File upload storage configuration
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads');
    }
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Initialize upload with more lenient CSV type checking
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function(req, file, cb) {
    // Accept multiple MIME types for CSV files
    const validMimeTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/x-csv', 'text/comma-separated-values', 'text/plain'];
    
    if (!validMimeTypes.includes(file.mimetype) && !file.originalname.endsWith('.csv')) {
      console.log('File rejected:', file.mimetype, file.originalname);
      return cb(new Error('Only CSV files are allowed'));
    }
    console.log('File accepted:', file.mimetype, file.originalname);
    cb(null, true);
  }
}).single('csvFile');

// Helper function to clean up file
const cleanupFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
};

// CSV file upload route
router.post('/', (req, res) => {
  console.log('Upload request received');
  
  upload(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('File received:', req.file.originalname);
    
    // Process the uploaded CSV file
    const results = [];
    const filePath = req.file.path;
    
    try {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            console.log('CSV parsed, rows found:', results.length);
            
            console.log('Appending data to existing records...');
            
            // Process and insert data in batches
            const batchSize = 100; // Process 100 records at a time
            const patients = [];
            
            // Process the data
            for (const row of results) {
              // Convert numeric fields
              const processedRow = {};
              
              // First add the encounterId which is required
              if (!row.encounterId || row.encounterId.trim() === '') {
                console.error('Skipping row without encounterId:', row);
                continue; // Skip rows without encounterId
              }
              processedRow.encounterId = row.encounterId;
              
              // Set default values for all fields to ensure no missing data
              processedRow.bmi = 0;
              processedRow.end_tidal_co2 = 0;
              processedRow.feed_vol = 0;
              processedRow.feed_vol_adm = 0;
              processedRow.fio2 = 0;
              processedRow.fio2_ratio = 0;
              processedRow.insp_time = 0;
              processedRow.oxygen_flow_rate = 0;
              processedRow.peep = 0;
              processedRow.pip = 0;
              processedRow.resp_rate = 0;
              processedRow.sip = 0;
              processedRow.tidal_vol = 0;
              processedRow.tidal_vol_actual = 0;
              processedRow.tidal_vol_kg = 0;
              processedRow.tidal_vol_spon = 0;
              
              // Now process the actual data from the CSV
              for (const [key, value] of Object.entries(row)) {
                // Skip empty fields - we already have defaults
                if (value === "nan" || value === "") {
                  continue;
                }
                
                // Skip any "referral" field in the CSV - we'll use the AI to determine this
                if (key === 'referral') {
                  continue;
                }
                
                // Handle additional columns like notes (don't try to convert to numbers)
                if (key === 'notes' || key === 'comments' || key === 'description') {
                  processedRow[key] = value;
                  continue;
                }
                
                // Convert numeric fields
                if (!isNaN(parseFloat(value))) {
                  processedRow[key] = parseFloat(value);
                } else {
                  processedRow[key] = value;
                }
              }
              
              patients.push(processedRow);
            }

            // Use AI model to predict referrals for all patients
            console.log('Predicting referrals using AI model...');
            const patientsWithPredictions = await processPatientsWithAI(patients);
            
            // Insert in batches
            console.log(`Inserting ${patientsWithPredictions.length} patients in batches of ${batchSize}...`);
            
            // Track total patients inserted and updated
            let totalInserted = 0;
            let totalUpdated = 0;
            
            for (let i = 0; i < patientsWithPredictions.length; i += batchSize) {
              const batch = patientsWithPredictions.slice(i, i + batchSize);
              
              // Process each patient in the batch
              let inserted = 0;
              let updated = 0;
              
              for (const patient of batch) {
                try {
                  // Check if patient with this encounterId already exists
                  const existingPatient = await Patient.findOne({ encounterId: patient.encounterId });
                  
                  if (existingPatient) {
                    // Update existing patient
                    await Patient.updateOne({ encounterId: patient.encounterId }, patient);
                    updated++;
                    totalUpdated++;
                  } else {
                    // Insert new patient
                    await Patient.create(patient);
                    inserted++;
                    totalInserted++;
                  }
                } catch (error) {
                  console.error(`Error processing patient ${patient.encounterId}:`, error);
                }
              }
              
              console.log(`Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(patientsWithPredictions.length/batchSize)}: ${inserted} new patients, ${updated} updated`);
            }
            
            // Clean up the file
            cleanupFile(filePath);
            
            // Count how many referrals were predicted
            const referralCount = patientsWithPredictions.filter(p => p.referral).length;
            
            res.json({ 
              message: 'File uploaded and processed successfully',
              patientsImported: patientsWithPredictions.length,
              newPatients: totalInserted,
              updatedPatients: totalUpdated,
              referralsPredicted: referralCount
            });
          } catch (error) {
            console.error('Database error:', error);
            cleanupFile(filePath);
            res.status(500).json({ error: error.message });
          }
        })
        .on('error', (error) => {
          console.error('CSV parsing error:', error);
          cleanupFile(filePath);
          res.status(500).json({ error: 'Error parsing CSV file' });
        });
    } catch (error) {
      console.error('File processing error:', error);
      cleanupFile(filePath);
      res.status(500).json({ error: 'Error processing file' });
    }
  });
});

/**
 * Process patients with AI prediction for all patients
 * @param {Array} patients - Array of patient objects from CSV
 * @returns {Array} - Patients with predicted referrals
 */
async function processPatientsWithAI(patients) {
  try {
    // Use batch prediction for efficiency
    console.log(`Predicting referrals for all ${patients.length} patients...`);
    const predictedPatients = await aiReferralService.batchPredictReferrals(patients);
    
    const referralCount = predictedPatients.filter(p => p.referral).length;
    console.log(`AI prediction complete. ${referralCount} out of ${predictedPatients.length} patients predicted to need referral.`);
    return predictedPatients;
  } catch (error) {
    console.error('Error during AI prediction:', error);
    // If AI prediction fails, set all to false
    for (const patient of patients) {
      patient.referral = false;
    }
    return patients;
  }
}

module.exports = router; 