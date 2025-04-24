const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Load routes
const patientRoutes = require('./routes/patients');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const reportRoutes = require('./routes/reports');
const systemRoutes = require('./routes/system');
const { auth, adminAuth, dietitianAuth, roleAuth } = require('./middleware/auth');

const app = express();

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for debugging
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Debug middleware for requests
app.use((req, res, next) => {
  console.log(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('[DEBUG] Headers:', req.headers);
  next();
});

// Connect to MongoDB
console.log('Attempting to connect to MongoDB at:', process.env.MONGO_URI);

// Connection options with retry and reconnect logic
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 60000, // Increase timeout to 60 seconds
  socketTimeoutMS: 45000, // Socket timeout
  connectTimeoutMS: 45000, // Connection timeout
  retryWrites: true,
  w: 'majority',
  autoReconnect: true,
  reconnectTries: Number.MAX_VALUE,
  reconnectInterval: 1000,
};

// Connect with retry logic
const connectWithRetry = () => {
  console.log('MongoDB connection attempt...');
  console.log('Using MongoDB URI:', process.env.MONGO_URI);
  
  mongoose.connect(process.env.MONGO_URI, mongooseOptions)
    .then(() => {
      console.log('MongoDB Connected Successfully');
      console.log('Connection Details:', mongoose.connection.host, mongoose.connection.port);
      console.log('Connection State:', mongoose.connection.readyState); // 1 = connected
      
      // Run a simple query to verify the connection is working
      mongoose.connection.db.admin().ping()
        .then(() => console.log('MongoDB ping successful - connection is fully operational'))
        .catch(pingErr => console.error('MongoDB ping failed:', pingErr));
      
      // List collections to verify database access
      mongoose.connection.db.listCollections().toArray()
        .then(collections => {
          console.log(`Available collections in ${mongoose.connection.db.databaseName}:`, 
            collections.map(c => c.name).join(', ') || 'No collections found');
        })
        .catch(listErr => console.error('Error listing collections:', listErr));
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      console.error('Connection URI:', process.env.MONGO_URI);
      
      // Try to get more detailed error information
      if (err.name === 'MongooseServerSelectionError') {
        console.error('Server selection timed out. This usually means MongoDB is not running or is unreachable.');
        console.error('Make sure MongoDB is running with: sudo systemctl status mongodb');
      }
      
      console.error('Will retry connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Set up mongoose connection event handlers
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
  setTimeout(connectWithRetry, 5000);
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// User-related API routes
app.use('/api/auth', authRoutes);

// Patient-related API routes - some endpoints are public, others protected by auth middleware
app.use('/api/patients', patientRoutes);

// List all registered routes for debugging purposes
console.log('Registered API routes:');
const listRoutes = (stack, basePath = '') => {
  stack.forEach(r => {
    if (r.route && r.route.path) {
      console.log(`Route: ${basePath}${r.route.path} [${Object.keys(r.route.methods).join(', ').toUpperCase()}]`);
    } else if (r.name === 'router' && r.handle.stack) {
      const newBase = basePath + (r.regexp.toString().match(/^\/\^(\/[^\/]*)/)?.[1].replace(/\\\//g, '/') || '');
      console.log(`Router base: ${newBase}`);
      listRoutes(r.handle.stack, newBase);
    }
  });
};

// Output registered routes
app.stack?.forEach?.(r => {
  if (r.name === 'router' && r.handle.stack) {
    const base = r.regexp.toString().match(/^\/\^(\/[^\/]*)/)?.[1].replace(/\\\//g, '/') || '';
    console.log(`Base router: ${base}`);
    listRoutes(r.handle.stack, base);
  }
});

// Upload API routes - accessible by both dietitians and admins
app.use('/api/upload', auth, dietitianAuth, uploadRoutes);

// Reports API routes - accessible by both dietitians and admins
app.use('/api/reports', auth, reportRoutes);

// System API routes - accessible by both dietitians and admins
app.use('/api/system', auth, systemRoutes);

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB URI: ${process.env.MONGO_URI}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
}); 