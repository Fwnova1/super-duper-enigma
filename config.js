module.exports = {
  jwtSecret: 'dietitian-referral-system-secret-key',
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/dietitian-system',
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development'
}; 