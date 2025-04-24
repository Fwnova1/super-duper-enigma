require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('MongoDB Connected');
  
  try {
    // Find user by email and update role to admin
    const result = await User.updateOne(
      { email: 'test@example.com' },
      { $set: { role: 'admin' } }
    );
    
    console.log('Update result:', result);
    
    // Verify the update
    const user = await User.findOne({ email: 'test@example.com' });
    console.log('Updated user:', user);
    
    mongoose.disconnect();
    console.log('MongoDB Disconnected');
  } catch (error) {
    console.error('Error updating user:', error);
    mongoose.disconnect();
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
}); 