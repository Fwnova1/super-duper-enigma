const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/feeding-dashboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 45000
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.log('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Get the patient model
const Patient = require('./models/Patient');

async function fixIndexes() {
  try {
    console.log('Fixing database indexes...');

    // Get the collection
    const collection = mongoose.connection.collection('patients');
    
    // Get existing indexes
    const indexInfo = await collection.indexes();
    console.log('Current indexes:', indexInfo);
    
    // Drop the patientId index if it exists
    const patientIdIndex = indexInfo.find(idx => 
      idx.name === 'patientId_1' || 
      (idx.key && idx.key.patientId));
    
    if (patientIdIndex) {
      console.log('Dropping patientId index...');
      await collection.dropIndex(patientIdIndex.name);
      console.log('Dropped patientId index successfully');
    } else {
      console.log('No patientId index found');
    }
    
    // Drop any existing encounterId index
    const encounterIdIndex = indexInfo.find(idx => 
      idx.name === 'encounterId_1' || 
      (idx.key && idx.key.encounterId));
    
    if (encounterIdIndex) {
      console.log('Dropping existing encounterId index...');
      await collection.dropIndex(encounterIdIndex.name);
      console.log('Dropped encounterId index successfully');
    }
    
    // Create a new encounterId index with a custom name
    console.log('Creating new encounterId index...');
    await collection.createIndex(
      { encounterId: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: 'encounter_id_unique_idx'
      }
    );
    
    // Check the new indexes
    const newIndexInfo = await collection.indexes();
    console.log('Updated indexes:', newIndexInfo);
    
    console.log('Index fix completed successfully');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error fixing indexes:', error);
  }
}

// Run the function
fixIndexes(); 