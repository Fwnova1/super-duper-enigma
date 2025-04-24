const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');

/**
 * Service to handle automatic assignment of patients to dietitians
 */
class AssignmentService {
  /**
   * Assign a patient to the dietitian with the fewest patients
   * @param {Object} patient - Patient object or patient ID
   * @returns {Promise<Object>} - Updated patient with assignment details
   */
  async assignPatientToDietitian(patient) {
    try {
      // If patient is an ID, fetch the full patient object
      let patientObj = patient;
      if (typeof patient === 'string' || patient instanceof mongoose.Types.ObjectId) {
        patientObj = await Patient.findById(patient);
        if (!patientObj) {
          throw new Error('Patient not found');
        }
      }

      // Only assign patients that need referral
      if (!patientObj.referral) {
        console.log(`Patient ${patientObj.encounterId} does not need referral, not assigning`);
        return patientObj;
      }
      
      // Check if patient is already assigned
      if (patientObj.assignedTo) {
        console.log(`Patient ${patientObj.encounterId} already assigned to dietitian`);
        return patientObj;
      }

      // Find all dietitians
      const dietitians = await User.find({ role: 'dietitian' }).lean();
      
      if (dietitians.length === 0) {
        console.log('No dietitians available for assignment');
        return patientObj;
      }

      // Find patient counts for each dietitian
      const dietitianCounts = [];
      for (const dietitian of dietitians) {
        const count = await Patient.countDocuments({ assignedTo: dietitian._id });
        dietitianCounts.push({
          _id: dietitian._id,
          username: dietitian.username,
          patientCount: count
        });
      }

      // Sort dietitians by patient count (ascending)
      dietitianCounts.sort((a, b) => a.patientCount - b.patientCount);
      
      // Get dietitian with fewest patients
      const selectedDietitian = dietitianCounts[0];
      
      console.log(`Sending assignment request for patient ${patientObj.encounterId} to dietitian ${selectedDietitian.username} (${selectedDietitian.patientCount} patients)`);
      
      // Update patient with assignment request
      patientObj.assignedTo = selectedDietitian._id;
      patientObj.assignedDate = new Date();
      patientObj.assignmentAccepted = false;
      patientObj.assignmentStatus = 'requested';
      
      await patientObj.save();

      return patientObj;
    } catch (error) {
      console.error('Error assigning patient to dietitian:', error);
      throw error;
    }
  }

  /**
   * Assign all unassigned patients who need referral
   * @returns {Promise<Object>} - Results of the assignment process
   */
  async assignAllUnassignedPatients() {
    try {
      // Find all patients that need referral but don't have an assignment
      const unassignedPatients = await Patient.find({
        referral: true,
        assignedTo: null
      });

      console.log(`Found ${unassignedPatients.length} unassigned patients that need referral`);
      
      if (unassignedPatients.length === 0) {
        return { 
          success: true, 
          message: 'No unassigned patients found that need referral',
          assignedCount: 0,
          totalPatients: 0
        };
      }

      // Request assignment for each patient
      let assignedCount = 0;
      for (const patient of unassignedPatients) {
        try {
          await this.assignPatientToDietitian(patient);
          assignedCount++;
        } catch (err) {
          console.error(`Error requesting assignment for patient ${patient.encounterId}:`, err);
        }
      }

      return {
        success: true,
        message: `Sent assignment requests for ${assignedCount} patients to dietitians`,
        assignedCount,
        totalPatients: unassignedPatients.length
      };
    } catch (error) {
      console.error('Error requesting assignments for patients:', error);
      return {
        success: false,
        message: error.message,
        assignedCount: 0,
        totalPatients: 0
      };
    }
  }

  /**
   * Manually assign or transfer a patient to a specific dietitian
   * @param {string} patientId - ID of the patient to assign
   * @param {string} dietitianId - ID of the dietitian to assign to
   * @param {Object} initiator - User who initiated the assignment (for logging)
   * @returns {Promise<Object>} - Result of the assignment operation
   */
  async manuallyAssignPatient(patientId, dietitianId, initiator) {
    try {
      console.log('======== MANUAL ASSIGNMENT DEBUG ========');
      console.log(`Requesting assignment of patient ${patientId} to dietitian ${dietitianId}`);
      console.log(`Initiated by ${initiator.username} (${initiator.role})`);

      // Ensure IDs are properly formatted
      const patientObjectId = mongoose.Types.ObjectId.isValid(patientId) 
        ? new mongoose.Types.ObjectId(patientId) 
        : null;
        
      const dietitianObjectId = mongoose.Types.ObjectId.isValid(dietitianId) 
        ? new mongoose.Types.ObjectId(dietitianId) 
        : null;

      if (!patientObjectId) {
        throw new Error(`Invalid patient ID format: ${patientId}`);
      }

      if (!dietitianObjectId) {
        throw new Error(`Invalid dietitian ID format: ${dietitianId}`);
      }

      // Find the patient
      const patient = await Patient.findById(patientObjectId);
      if (!patient) {
        throw new Error(`Patient with ID ${patientId} not found`);
      }
      console.log(`Found patient: ${patient.encounterId}`);

      // Find the dietitian
      const dietitian = await User.findById(dietitianObjectId);
      if (!dietitian) {
        throw new Error(`Dietitian with ID ${dietitianId} not found`);
      }
      console.log(`Found dietitian: ${dietitian.username}`);

      // Verify the dietitian has the correct role
      if (dietitian.role !== 'dietitian') {
        throw new Error(`User ${dietitian.username} is not a dietitian`);
      }

      // Check if this is a reassignment
      const isTransfer = patient.assignedTo 
        && patient.assignedTo.toString() !== dietitianObjectId.toString();
      const previousDietitianId = patient.assignedTo;
      
      console.log(`Is transfer: ${isTransfer}`);
      console.log(`Previous dietitian: ${previousDietitianId || 'none'}`);
      
      // Get previous dietitian name for logging if this is a transfer
      let previousDietitianName = null;
      if (isTransfer && previousDietitianId) {
        const previousDietitian = await User.findById(previousDietitianId);
        previousDietitianName = previousDietitian ? previousDietitian.username : 'Unknown';
        console.log(`Previous dietitian name: ${previousDietitianName}`);
      }

      // Update patient assignment request
      patient.assignedTo = dietitianObjectId;
      patient.assignedDate = new Date();
      patient.assignmentAccepted = false; // Reset acceptance flag on new assignment
      patient.assignmentStatus = 'requested'; // Set status to requested
      
      // Add a note about the assignment/transfer request
      const transferNote = isTransfer ? 
        `Assignment request: Transfer from ${previousDietitianName} to ${dietitian.username}` : 
        `Assignment request: Assign to ${dietitian.username}`;
        
      const assignmentNote = `${transferNote} by ${initiator.username} (${initiator.role}) on ${new Date().toLocaleString()}`;
      
      // Add notes if applicable
      if (!patient.notes) {
        patient.notes = assignmentNote;
      } else {
        patient.notes = `${patient.notes}\n\n${assignmentNote}`;
      }
      
      // Update referral status to 'pending' when requesting assignment to a dietitian
      if (patient.referral) {
        // Set the status to pending for newly assigned patients
        patient.referralStatus = 'pending';
        
        // Add entry to referral history
        if (!patient.referralHistory) {
          patient.referralHistory = [];
        }
        
        patient.referralHistory.push({
          status: 'pending',
          changedBy: initiator._id,
          changedByName: initiator.username,
          timestamp: new Date(),
          notes: `Assignment requested: Patient ${patient.encounterId} to dietitian ${dietitian.username}. Awaiting dietitian's response.`
        });
      }
      
      console.log(`Saving patient with assignment request`);
      await patient.save();
      console.log(`Patient assignment request saved successfully`);
      
      return {
        success: true,
        message: isTransfer 
          ? `Assignment request sent to ${dietitian.username} to transfer the patient`
          : `Assignment request sent to ${dietitian.username}`,
        patient: patient
      };
    } catch (error) {
      console.error('Error in assignment request:', error);
      return {
        success: false,
        message: error.message || 'Error requesting patient assignment to dietitian'
      };
    }
  }
  
  /**
   * Get a list of all dietitians with their current patient counts
   * @returns {Promise<Array>} - List of dietitians with patient counts
   */
  async getDietitiansWithPatientCounts() {
    try {
      console.log('========== GET DIETITIANS SERVICE DEBUG ==========');
      console.log('Finding all dietitians with role="dietitian"');
      
      // Verify User model is valid
      if (!User || typeof User.find !== 'function') {
        console.error('Invalid User model:', User);
        throw new Error('User model is not properly initialized');
      }
      
      // Verify connection state
      if (mongoose.connection.readyState !== 1) {
        console.error('MongoDB connection is not ready:', mongoose.connection.readyState);
        throw new Error(`Database connection not ready (state: ${mongoose.connection.readyState})`);
      }
      
      // Add timeout to query to prevent long-running operations
      const findOptions = { 
        maxTimeMS: 30000 // 30 second timeout
      };
      
      // Find all dietitians with proper error handling
      let dietitians = [];
      try {
        dietitians = await User.find({ role: 'dietitian' }, null, findOptions)
          .select('_id username email createdAt')
          .lean();
          
        console.log(`Successfully queried User model, found ${dietitians.length} dietitians`);
      } catch (findError) {
        console.error('Error querying User model:', findError);
        throw new Error(`Database error: ${findError.message}`);
      }
      
      console.log(`Found ${dietitians.length} dietitians in database`);
      
      if (dietitians.length === 0) {
        console.log('Warning: No dietitians found in the database');
        return [];
      }
      
      // Process each dietitian to ensure _id is a String for consistent behavior
      dietitians = dietitians.map(dietitian => ({
        ...dietitian,
        _id: dietitian._id.toString() // Convert ObjectId to string
      }));
      
      // Get patient counts for each dietitian
      const dietitiansWithCounts = [];
      for (const dietitian of dietitians) {
        try {
          console.log(`Counting patients for dietitian: ${dietitian.username} (${dietitian._id})`);
          
          // Convert string ID back to ObjectId for query
          const dietitianObjectId = mongoose.Types.ObjectId.isValid(dietitian._id) 
            ? new mongoose.Types.ObjectId(dietitian._id)
            : null;
            
          if (!dietitianObjectId) {
            console.error(`Invalid dietitian ID format: ${dietitian._id}`);
            dietitiansWithCounts.push({
              ...dietitian,
              patientCount: 0
            });
            continue;
          }
          
          // Add timeout to count query as well
          const patientCount = await Patient.countDocuments(
            { assignedTo: dietitianObjectId },
            { maxTimeMS: 10000 }
          );
          
          console.log(`Dietitian ${dietitian.username} has ${patientCount} patients`);
          
          dietitiansWithCounts.push({
            ...dietitian,
            patientCount
          });
        } catch (countError) {
          console.error(`Error counting patients for dietitian ${dietitian.username}:`, countError);
          // Continue with zero count even if error
          dietitiansWithCounts.push({
            ...dietitian,
            patientCount: 0
          });
        }
      }
      
      // Sort by username
      dietitiansWithCounts.sort((a, b) => a.username.localeCompare(b.username));
      console.log(`Returning ${dietitiansWithCounts.length} dietitians with patient counts`);
      console.log('Dietitians list:', dietitiansWithCounts);
      console.log('========== END GET DIETITIANS SERVICE DEBUG ==========');
      
      return dietitiansWithCounts;
    } catch (error) {
      console.error('========== GET DIETITIANS SERVICE ERROR ==========');
      console.error('Error getting dietitians with patient counts:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      console.error('Mongoose connection state:', mongoose.connection.readyState);
      console.error('=========================================');
      throw error;
    }
  }

  /**
   * Reassign all patients who need referral, including those already assigned
   * @returns {Promise<Object>} - Results of the reassignment process
   */
  async reassignAllPatients() {
    try {
      // Find all patients that need referral, regardless of current assignment
      const patientsToReassign = await Patient.find({
        referral: true
      });

      console.log(`Found ${patientsToReassign.length} patients that need referral for reassignment`);
      
      if (patientsToReassign.length === 0) {
        return { 
          success: true, 
          message: 'No patients found that need referral',
          reassignedCount: 0,
          totalPatients: 0
        };
      }

      // Find all dietitians
      const dietitians = await User.find({ role: 'dietitian' }).lean();
      
      if (dietitians.length === 0) {
        throw new Error('No dietitians available for assignment');
      }

      // Initialize patient counts for each dietitian
      const dietitianCounts = dietitians.map(d => ({
        _id: d._id,
        username: d.username,
        patientCount: 0
      }));

      // Request reassignment for each patient
      let reassignedCount = 0;
      for (const patient of patientsToReassign) {
        try {
          // Find dietitian with fewest patients
          dietitianCounts.sort((a, b) => a.patientCount - b.patientCount);
          const selectedDietitian = dietitianCounts[0];

          // Store previous assignment for logging
          const previousDietitianId = patient.assignedTo;
          let previousDietitianName = 'None';
          
          if (previousDietitianId) {
            const previousDietitian = dietitians.find(d => 
              d._id.toString() === previousDietitianId.toString()
            );
            previousDietitianName = previousDietitian ? previousDietitian.username : 'Unknown';
          }

          // Update patient assignment request
          patient.assignedTo = selectedDietitian._id;
          patient.assignedDate = new Date();
          patient.assignmentAccepted = false;
          patient.assignmentStatus = 'requested';
          
          // Add a note about the reassignment request
          const reassignmentNote = `Reassignment request: from ${previousDietitianName} to ${selectedDietitian.username} by system on ${new Date().toLocaleString()}`;
          patient.notes = patient.notes 
            ? `${patient.notes}\n\n${reassignmentNote}`
            : reassignmentNote;

          await patient.save();

          // Update the dietitian's patient count
          selectedDietitian.patientCount++;
          reassignedCount++;

          console.log(`Requested reassignment for patient ${patient.encounterId} from ${previousDietitianName} to ${selectedDietitian.username}`);
        } catch (err) {
          console.error(`Error requesting reassignment for patient ${patient.encounterId}:`, err);
        }
      }

      return {
        success: true,
        message: `Sent reassignment requests for ${reassignedCount} patients to dietitians`,
        reassignedCount,
        totalPatients: patientsToReassign.length
      };
    } catch (error) {
      console.error('Error requesting reassignments for patients:', error);
      return {
        success: false,
        message: error.message,
        reassignedCount: 0,
        totalPatients: 0
      };
    }
  }
}

module.exports = new AssignmentService(); 