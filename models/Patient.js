const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// We create a flexible schema to accommodate any physiological measurements from the CSV
const PatientSchema = new Schema({
  encounterId: {
    type: String,
    required: true,
    unique: true
  },
  // Basic patient information
  name: {
    type: String,
    default: 'Unnamed Patient'
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  admissionDate: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', null],
    default: null
  },
  age: {
    type: Number,
    default: null
  },
  referral: {
    type: Boolean,
    default: false
  },
  // New referral status fields
  referralStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  referralHistory: [{
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed']
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    },
    changedByName: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String
    }
  }],
  referralNotes: {
    type: String
  },
  // End of new referral fields
  bmi: {
    type: Number
  },
  // Physiological measurements
  end_tidal_co2: {
    type: Number
  },
  feed_vol: {
    type: Number
  },
  feed_vol_adm: {
    type: Number
  },
  fio2: {
    type: Number
  },
  fio2_ratio: {
    type: Number
  },
  insp_time: {
    type: Number
  },
  oxygen_flow_rate: {
    type: Number
  },
  peep: {
    type: Number
  },
  pip: {
    type: Number
  },
  resp_rate: {
    type: Number
  },
  sip: {
    type: Number
  },
  tidal_vol: {
    type: Number
  },
  tidal_vol_actual: {
    type: Number
  },
  tidal_vol_kg: {
    type: Number
  },
  tidal_vol_spon: {
    type: Number
  },
  // Clinical notes and additional fields
  notes: {
    type: String
  },
  comments: {
    type: String
  },
  description: {
    type: String
  },
  // Dietitian assignment fields
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    default: null
  },
  assignedDate: {
    type: Date,
    default: null
  },
  // Flag to track if the dietitian has accepted the assignment
  assignmentAccepted: {
    type: Boolean,
    default: false
  },
  // New field to track assignment request status
  assignmentStatus: {
    type: String,
    enum: ['requested', 'accepted', 'declined', null],
    default: null
  },
  // Additional metadata
  created: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to calculate BMI if not provided
PatientSchema.pre('save', function(next) {
  if (this.isModified('weight') || this.isModified('height')) {
    this.bmi = (this.weight / Math.pow(this.height / 100, 2)).toFixed(2);
  }
  next();
});

module.exports = Patient = mongoose.model('patient', PatientSchema); 