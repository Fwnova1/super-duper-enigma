const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execPromise } = require('../utils/execPromise');

/**
 * AI Referral Service - Handles interaction with the Python ML model
 * for predicting patient referrals to dietitians
 */
class AIReferralService {
  constructor() {
    // Paths to the model files
    this.scriptPath = path.join(__dirname, '..', 'predict.py');
    this.modelPath = path.join(__dirname, '..', 'referral_prediction_model.pkl');
    this.scalerPath = path.join(__dirname, '..', 'scaler.pkl');
    this.pythonPath = 'python'; // Add the python path
    
    // Verify files exist
    this.verifyFiles();
  }

  /**
   * Verify that all required model files exist
   */
  verifyFiles() {
    const files = [this.scriptPath, this.modelPath, this.scalerPath];
    files.forEach(file => {
      if (!fs.existsSync(file)) {
        console.error(`Missing required file: ${file}`);
      }
    });
  }

  /**
   * Ensure patient data has no missing values by setting defaults
   * @param {Object} patientData - Patient data object
   * @returns {Object} - Patient data with default values for missing fields
   */
  ensureCompleteData(patientData) {
    // Required fields with default values
    const requiredFields = {
      bmi: 0,
      end_tidal_co2: 0, 
      feed_vol: 0,
      feed_vol_adm: 0,
      fio2: 0,
      fio2_ratio: 0,
      insp_time: 0,
      oxygen_flow_rate: 0,
      peep: 0,
      pip: 0,
      resp_rate: 0,
      sip: 0,
      tidal_vol: 0,
      tidal_vol_actual: 0,
      tidal_vol_kg: 0,
      tidal_vol_spon: 0
    };
    
    // Create a new object with all required fields
    const completeData = { ...patientData };
    
    // Set default values for any missing fields
    for (const [field, defaultValue] of Object.entries(requiredFields)) {
      if (completeData[field] === undefined || completeData[field] === null) {
        completeData[field] = defaultValue;
      }
    }
    
    return completeData;
  }

  /**
   * Predict referral for a single patient using the ML model
   * @param {Object} patientData - Patient physiological measurements
   * @returns {Promise<boolean>} - True if patient needs referral, false otherwise
   */
  async predictReferral(patientData) {
    try {
      // Log what we're predicting
      console.log(`Predicting referral for patient: ${patientData.encounterId || 'Unknown ID'}`);
      
      // Ensure patient data has no missing values
      const completeData = this.ensureCompleteData(patientData);
      
      // Prepare patient data for prediction
      const patientJson = JSON.stringify(completeData);
      
      const options = {
        mode: 'json',
        pythonPath: 'python', // Use system Python
        pythonOptions: ['-u'], // Unbuffered output for immediate logging
        args: [
          '--predict-single',
          patientJson
        ]
      };

      console.log(`Running prediction script: ${this.scriptPath}`);
      
      // Run Python script with patient data
      const results = await PythonShell.run(this.scriptPath, options);
      
      console.log(`Python script results:`, results);
      
      // Check if we got a prediction result
      if (results && results.length > 0) {
        // The prediction should be the last output from the script
        const prediction = results[results.length - 1];
        console.log(`Raw prediction result:`, prediction);
        
        // Convert to boolean (1.0 = needs referral, 0.0 = no referral)
        const boolResult = prediction === 1.0 || prediction === true || prediction === '1' || prediction === 1;
        console.log(`Converted prediction to boolean:`, boolResult);
        return boolResult;
      }
      
      console.error('No prediction result returned from model');
      return false;
    } catch (error) {
      console.error('Error predicting referral:', error);
      // If we have error.stderr from PythonShell, log it for debugging
      if (error.stderr) {
        console.error('Python error output:', error.stderr);
      }
      // Default to false if prediction fails
      return false;
    }
  }

  /**
   * Batch predict referrals for multiple patients
   * @param {Array<Object>} patients - Array of patient data objects
   * @returns {Promise<Array<Object>>} - Array of patients with predicted referrals
   */
  async batchPredictReferrals(patients) {
    // Ensure all patients have complete data
    const completePatients = patients.map(patient => this.ensureCompleteData(patient));

    try {
      // Create a temporary JSON file with the patients data
      const tempFile = path.join(os.tmpdir(), `patients_${Date.now()}.json`);
      fs.writeFileSync(tempFile, JSON.stringify(completePatients));
      
      console.log(`Created temporary file for batch prediction: ${tempFile}`);
      console.log(`Predicting referrals for ${completePatients.length} patients`);
      
      // Run the Python script for batch prediction
      const { stdout, stderr } = await execPromise(
        `${this.pythonPath} ${this.scriptPath} --predict-batch "${tempFile}"`
      );
      
      if (stderr) {
        console.error('Python script stderr:', stderr);
      }
      
      console.log('Python script stdout:', stdout);
      
      // Parse the predictions - this is an array of 1.0/0.0 values
      const predictions = JSON.parse(stdout);
      
      if (!Array.isArray(predictions)) {
        console.error('Predictions is not an array:', predictions);
        return completePatients; // Return patients with unchanged referrals
      }
      
      console.log(`Received ${predictions.length} predictions for ${completePatients.length} patients`);
      
      // Map predictions back to patients
      const predictedPatients = completePatients.map((patient, index) => {
        if (index < predictions.length) {
          // Convert prediction value to boolean (1.0 = true, 0.0 = false)
          const referral = predictions[index] === 1.0 || 
                          predictions[index] === 1 || 
                          predictions[index] === true || 
                          predictions[index] === '1';
          
          // Create a new patient object with the predicted referral
          return {
            ...patient,
            referral
          };
        }
        // For patients without predictions (if any), return unchanged
        return patient;
      });
      
      // Log results
      const referralCount = predictedPatients.filter(p => p.referral).length;
      console.log(`Prediction complete: ${referralCount} out of ${predictedPatients.length} predicted to need referral`);
      
      // Clean up the temporary file
      fs.unlinkSync(tempFile);
      
      return predictedPatients;
    } catch (error) {
      console.error('Error in batch prediction:', error);
      console.error('Error details:', error.message);
      if (error.stderr) {
        console.error('Python stderr:', error.stderr);
      }
      if (error.stdout) {
        console.error('Python stdout:', error.stdout);
      }
      
      // Even if prediction fails, return the original patients
      // This ensures the UI doesn't break and lets the rest of the app continue
      console.log('Returning original patients with referrals unchanged');
      return completePatients;
    }
  }
}

module.exports = new AIReferralService(); 