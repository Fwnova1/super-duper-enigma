const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const User = require('../models/User');
const assignmentService = require('./assignmentService');

/**
 * Service to handle referral management for patients
 */
class ReferralService {
  /**
   * Update a patient's referral status
   * @param {string} patientId - ID of the patient
   * @param {string} status - New referral status ('pending', 'in_progress', 'completed')
   * @param {Object} user - User making the change
   * @param {string} notes - Optional notes about the status change
   * @returns {Promise<Object>} - Updated patient with new referral status
   */
  async updateReferralStatus(patientId, status, user, notes = '') {
    try {
      // Validate status
      const validStatuses = ['pending', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid referral status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Find the patient
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error(`Patient with ID ${patientId} not found`);
      }

      // Only update if the patient has a referral
      if (!patient.referral) {
        throw new Error(`Patient ${patient.encounterId} does not have a dietitian referral`);
      }

      // Create a history entry for this status change
      const historyEntry = {
        status,
        changedBy: user._id,
        changedByName: user.username,
        timestamp: new Date(),
        notes
      };

      // Update the patient
      patient.referralStatus = status;
      patient.referralHistory = patient.referralHistory || [];
      patient.referralHistory.push(historyEntry);
      
      // Update assignment acceptance flag if changing to in_progress
      if (status === 'in_progress') {
        patient.assignmentAccepted = true;
      }

      // Add notes if provided
      if (notes) {
        patient.referralNotes = patient.referralNotes 
          ? `${patient.referralNotes}\n\n${notes}`
          : notes;
      }

      // Save the patient
      await patient.save();

      return {
        success: true,
        message: `Referral status updated to ${status}`,
        patient
      };
    } catch (error) {
      console.error('Error updating referral status:', error);
      throw error;
    }
  }

  /**
   * Accept or decline a patient assignment
   * @param {string} patientId - ID of the patient
   * @param {boolean} accept - Whether to accept or decline the assignment
   * @param {Object} dietitian - The dietitian user
   * @param {string} notes - Optional notes about the decision
   * @returns {Promise<Object>} - Result of the operation
   */
  async handleAssignmentResponse(patientId, accept, dietitian, notes = '') {
    try {
      // Find the patient
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error(`Patient with ID ${patientId} not found`);
      }

      // Verify this patient is assigned to this dietitian
      if (!patient.assignedTo || patient.assignedTo.toString() !== dietitian._id.toString()) {
        throw new Error(`This patient is not assigned to you`);
      }

      // Verify this is a pending assignment request
      if (patient.assignmentStatus !== 'requested') {
        throw new Error(`This patient doesn't have a pending assignment request`);
      }

      if (accept) {
        // Accept the assignment
        patient.assignmentAccepted = true;
        patient.assignmentStatus = 'accepted';
        patient.referralStatus = 'in_progress';

        // Add a history entry
        const historyEntry = {
          status: 'in_progress',
          changedBy: dietitian._id,
          changedByName: dietitian.username,
          timestamp: new Date(),
          notes: notes || 'Dietitian accepted the assignment'
        };

        patient.referralHistory = patient.referralHistory || [];
        patient.referralHistory.push(historyEntry);

        // Add notes if provided
        if (notes) {
          patient.referralNotes = patient.referralNotes 
            ? `${patient.referralNotes}\n\n${notes}`
            : notes;
        }

        await patient.save();

        return {
          success: true,
          message: `Assignment accepted for patient ${patient.encounterId}`,
          patient
        };
      } else {
        // Decline the assignment - unassign the patient and keep as pending
        patient.assignedTo = null;
        patient.assignedDate = null;
        patient.assignmentAccepted = false;
        patient.assignmentStatus = 'declined';

        // Add a history entry
        const historyEntry = {
          status: 'pending',
          changedBy: dietitian._id,
          changedByName: dietitian.username,
          timestamp: new Date(),
          notes: notes || 'Dietitian declined the assignment'
        };

        patient.referralHistory = patient.referralHistory || [];
        patient.referralHistory.push(historyEntry);

        // Add notes if provided
        if (notes) {
          patient.referralNotes = patient.referralNotes 
            ? `${patient.referralNotes}\n\n${notes}`
            : notes;
        }

        await patient.save();

        return {
          success: true,
          message: `Assignment declined for patient ${patient.encounterId}`,
          patient
        };
      }
    } catch (error) {
      console.error('Error handling assignment response:', error);
      throw error;
    }
  }

  /**
   * Get referral history for a patient
   * @param {string} patientId - ID of the patient
   * @returns {Promise<Array>} - Array of referral history entries
   */
  async getReferralHistory(patientId) {
    try {
      let patient;
      
      try {
        // Try with populate
        patient = await Patient.findById(patientId)
          .populate('referralHistory.changedBy', 'username email role');
      } catch (populateError) {
        console.error('Error populating referral history:', populateError);
        // Fallback without populate
        patient = await Patient.findById(patientId);
      }
      
      if (!patient) {
        throw new Error(`Patient with ID ${patientId} not found`);
      }

      return {
        success: true,
        encounterId: patient.encounterId,
        referral: patient.referral,
        referralStatus: patient.referralStatus,
        assignmentAccepted: patient.assignmentAccepted,
        referralNotes: patient.referralNotes,
        referralHistory: patient.referralHistory || []
      };
    } catch (error) {
      console.error('Error getting referral history:', error);
      throw error;
    }
  }

  /**
   * Get all patients with active referrals grouped by status
   * @returns {Promise<Object>} - Object with patients grouped by referral status
   */
  async getActiveReferrals() {
    try {
      // Get all patients with referrals
      let patients;
      
      try {
        // Try to get patients with populated assignedTo
        patients = await Patient.find({ referral: true })
          .populate('assignedTo', 'username email')
          .sort({ created: -1 });
      } catch (populateError) {
        console.error('Error populating assignedTo:', populateError);
        // Fallback to fetching without populate
        patients = await Patient.find({ referral: true })
          .sort({ created: -1 });
      }

      // Group patients by referral status
      const grouped = {
        pending: [],
        in_progress: [],
        completed: []
      };

      for (const patient of patients) {
        const status = patient.referralStatus || 'pending';
        grouped[status].push(patient);
      }

      return {
        success: true,
        counts: {
          pending: grouped.pending.length,
          in_progress: grouped.in_progress.length,
          completed: grouped.completed.length,
          total: patients.length
        },
        referrals: grouped
      };
    } catch (error) {
      console.error('Error getting active referrals:', error);
      throw error;
    }
  }

  /**
   * Get pending assignments for a specific dietitian that need response
   * @param {string} dietitianId - ID of the dietitian
   * @returns {Promise<Object>} - Result object with success flag, count and patients array
   */
  async getPendingAssignments(dietitianId) {
    // Add a failsafe wrapper to catch any unexpected errors
    try {
      console.log(`=== Getting pending assignments for dietitian ${dietitianId} ===`);
      
      // Extra debug logging
      console.log('Database connection state:', mongoose.connection.readyState);
      console.log('Diet ID type:', typeof dietitianId);
      
      // Validate database connection first
      if (mongoose.connection.readyState !== 1) {
        console.error(`Database not connected properly. Current state: ${mongoose.connection.readyState}`);
        return {
          success: false,
          message: `Database connection not ready. Current state: ${mongoose.connection.readyState}`,
          count: 0,
          patients: []
        };
      }
      
      // Safeguard against undefined dietitianId
      if (!dietitianId) {
        console.error('DietitianId is undefined or null');
        return {
          success: false,
          message: 'Dietitian ID is required but was not provided',
          count: 0,
          patients: []
        };
      }
      
      // Validate models
      const validation = await this.validateModels();
      if (!validation.isValid) {
        console.error('Model validation failed:', validation.message);
        return {
          success: false,
          message: `Database connection issue: ${validation.message}`,
          count: 0,
          patients: []
        };
      }
      
      // Verify the dietitianId is valid
      if (!mongoose.Types.ObjectId.isValid(dietitianId)) {
        console.error(`Invalid dietitian ID format: ${dietitianId}`);
        return {
          success: false,
          message: 'Invalid dietitian ID format',
          count: 0,
          patients: []
        };
      }
      
      try {
        // Make sure dietitianId is properly converted to ObjectId
        const dietitianObjectId = new mongoose.Types.ObjectId(dietitianId);
        console.log('Converted to ObjectId:', dietitianObjectId);
        console.log('Dietitian ObjectId as string:', dietitianObjectId.toString());
        
        // First try with direct query with explicit error handling
        console.log(`Querying for patients with assignedTo=${dietitianObjectId}, assignmentStatus=requested, referral=true`);
        let pendingAssignments = [];
        
        try {
          pendingAssignments = await Patient.find({
            assignedTo: dietitianObjectId,
            assignmentStatus: 'requested',
            referral: true
          }).sort({ assignedDate: -1 });
        } catch (findError) {
          console.error('Error in Patient.find query:', findError);
          return {
            success: false,
            message: `Error querying database: ${findError.message}`,
            count: 0,
            patients: []
          };
        }
        
        console.log(`Found ${pendingAssignments.length} pending assignments for dietitian ${dietitianId}`);
        
        // For debugging, add some more info about the found assignments
        if (pendingAssignments.length > 0) {
          console.log('Assignment details:');
          pendingAssignments.forEach(patient => {
            console.log(`- Patient ${patient.encounterId}, ID: ${patient._id}, assignmentStatus: ${patient.assignmentStatus}`);
          });
          
          // Return the successful result
          return {
            success: true,
            count: pendingAssignments.length,
            patients: pendingAssignments
          };
        } else {
          console.log('No pending assignments found with the query criteria');
          
          // Let's check if there are any assignments with this dietitian at all
          try {
            // Try direct approach: Get all pending assignments in the system
            console.log('Checking if there are any pending assignments in the system...');
            const allPendingAssignments = await Patient.find({
              assignmentStatus: 'requested',
              referral: true
            });
            console.log(`Total pending assignments in system (all dietitians): ${allPendingAssignments.length}`);
            
            if (allPendingAssignments.length > 0) {
              console.log('Some pending assignments found for other dietitians:');
              const matchingAssignments = [];
              
              // Check each assignment to see if it matches our dietitian
              allPendingAssignments.forEach(patient => {
                const patientAssignedTo = patient.assignedTo ? patient.assignedTo.toString() : 'none';
                console.log(`- Patient ${patient.encounterId}, Assigned To: ${patientAssignedTo}`);
                console.log(`  Matches current dietitian? ${patientAssignedTo === dietitianObjectId.toString()}`);
                
                // If there's a string match that the original query missed, add it to our results
                if (patientAssignedTo === dietitianObjectId.toString()) {
                  matchingAssignments.push(patient);
                }
              });
              
              // If we found matches using string comparison that the query missed
              if (matchingAssignments.length > 0) {
                console.log(`Found ${matchingAssignments.length} assignments using string comparison`);
                return {
                  success: true,
                  count: matchingAssignments.length,
                  patients: matchingAssignments
                };
              }
            }
            
            // Last attempt - check ANY assignments to this dietitian
            const anyAssignments = await Patient.find({
              assignedTo: dietitianObjectId
            });
            console.log(`Total assignments for this dietitian (any status): ${anyAssignments.length}`);
            
            if (anyAssignments.length > 0) {
              console.log('Some assignments found, but they may not have the requested status:');
              anyAssignments.forEach(patient => {
                console.log(`- Patient ${patient.encounterId}, Status: ${patient.assignmentStatus}, Referral: ${patient.referral}`);
              });
            }
            
            // Return empty success
            return {
              success: true,
              count: 0,
              patients: [],
              message: 'No pending assignments found'
            };
          } catch (checkError) {
            console.error('Error checking for other assignments:', checkError);
            return {
              success: false,
              message: 'Error checking for other assignments: ' + checkError.message,
              count: 0,
              patients: []
            };
          }
        }
      } catch (processError) {
        console.error('Error processing patient assignments:', processError);
        return {
          success: false,
          message: 'Error processing assignments: ' + processError.message,
          count: 0,
          patients: []
        };
      }
    } catch (outerError) {
      // This is the universal error catcher in case something unexpected happens
      console.error('CRITICAL ERROR in getPendingAssignments:', outerError);
      console.error('Error stack:', outerError.stack);
      return {
        success: false,
        message: 'Unexpected error: ' + outerError.message,
        error: outerError.toString(),
        stack: outerError.stack,
        count: 0,
        patients: []
      };
    }
  }

  /**
   * Get referral statistics for dashboard
   * @returns {Promise<Object>} - Referral statistics
   */
  async getReferralStats() {
    try {
      const totalPatients = await Patient.countDocuments();
      const referredPatients = await Patient.countDocuments({ referral: true });
      
      const statusCounts = await Patient.aggregate([
        { $match: { referral: true } },
        { $group: { 
          _id: '$referralStatus', 
          count: { $sum: 1 } 
        }}
      ]);

      // Convert to a more usable format
      const referralStatusCounts = {
        pending: 0,
        in_progress: 0,
        completed: 0
      };

      for (const status of statusCounts) {
        if (status._id && referralStatusCounts.hasOwnProperty(status._id)) {
          referralStatusCounts[status._id] = status.count;
        } else if (!status._id) {
          // Handle null status (default to pending)
          referralStatusCounts.pending += status.count;
        }
      }

      return {
        success: true,
        totalPatients,
        referredPatients,
        referralPercentage: totalPatients > 0 ? (referredPatients / totalPatients * 100).toFixed(1) : 0,
        statusCounts: referralStatusCounts
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      throw error;
    }
  }

  /**
   * Check if database models are properly initialized
   * @returns {boolean} - Whether models are properly initialized
   */
  async validateModels() {
    let isValid = true;
    let statusMessage = '';

    try {
      console.log('======== VALIDATING DATABASE MODELS ========');
      
      // Check mongoose connection
      const connectionState = mongoose.connection.readyState;
      console.log(`Mongoose connection state: ${connectionState}`);
      if (connectionState !== 1) {
        statusMessage += `Database not connected (state: ${connectionState}). `;
        isValid = false;
      }
      
      // Check if User model is valid
      if (!User || typeof User.find !== 'function') {
        console.error('User model is invalid:', User);
        statusMessage += 'User model is not properly initialized. ';
        isValid = false;
      } else {
        console.log('User model is valid');
        
        // Test a simple query
        try {
          const userCount = await User.countDocuments();
          console.log(`User model test: ${userCount} users found`);
        } catch (userError) {
          console.error('Error testing User model:', userError);
          statusMessage += `Error querying User model: ${userError.message}. `;
          isValid = false;
        }
      }
      
      // Check if Patient model is valid
      if (!Patient || typeof Patient.find !== 'function') {
        console.error('Patient model is invalid:', Patient);
        statusMessage += 'Patient model is not properly initialized. ';
        isValid = false;
      } else {
        console.log('Patient model is valid');
        
        // Test a simple query
        try {
          const patientCount = await Patient.countDocuments();
          console.log(`Patient model test: ${patientCount} patients found`);
        } catch (patientError) {
          console.error('Error testing Patient model:', patientError);
          statusMessage += `Error querying Patient model: ${patientError.message}. `;
          isValid = false;
        }
      }
      
      console.log(`Models validation result: ${isValid ? 'VALID' : 'INVALID'}`);
      console.log('====================================');
      
      return { 
        isValid, 
        message: statusMessage || 'All models are properly initialized'
      };
    } catch (error) {
      console.error('Error validating models:', error);
      return { 
        isValid: false, 
        message: `Error validating models: ${error.message}`
      };
    }
  }
}

module.exports = new ReferralService(); 