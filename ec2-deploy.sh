#!/bin/bash

# EC2 Deployment Script for Feeding Dashboard
# This script will set up and deploy the Feeding Dashboard application on an EC2 instance
set -e

echo "🚀 Starting Feeding Dashboard deployment on EC2"

# Update system and install dependencies
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

echo "🔧 Installing required dependencies..."
sudo apt-get install -y \
    git \
    nodejs \
    npm \
    mongodb \
    nginx \
    python3 \
    python3-pip \
    certbot \
    python3-certbot-nginx

# Configure MongoDB
echo "💾 Setting up MongoDB..."
sudo systemctl enable mongod
sudo systemctl start mongod

# Create MongoDB admin user
echo "👤 Creating MongoDB admin user..."
mongo --eval '
db = db.getSiblingDB("admin");
if (!db.getUser("admin")) {
    db.createUser({
        user: "admin",
        pwd: "password",
        roles: [{ role: "root", db: "admin" }]
    });
    print("Admin user created");
} else {
    print("Admin user already exists");
}'

# Enable MongoDB authentication
echo "🔐 Enabling MongoDB authentication..."
sudo tee /etc/mongod.conf > /dev/null << EOF
# mongod.conf
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
net:
  port: 27017
  bindIp: 0.0.0.0
security:
  authorization: enabled
EOF

# Restart MongoDB with new configuration
sudo systemctl restart mongod

# Create application directory
echo "📁 Creating application directory..."
mkdir -p ~/feeding-dashboard
cd ~/feeding-dashboard

# Clone the application repository
echo "📥 Cloning application repository..."
# Replace with your actual repository URL
git clone https://github.com/yourusername/feeding-dashboard.git .

# Install Node.js dependencies
echo "📚 Installing Node.js dependencies..."
npm install

# Build the client application
echo "🏗️ Building client application..."
npm run install-client
npm run build

# Create environment configuration
echo "⚙️ Creating environment configuration..."
cat > .env << EOF
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb://admin:password@localhost:27017/feeding-dashboard?authSource=admin
JWT_SECRET=$(openssl rand -hex 32)
EOF

# Install Python dependencies for the ML model
echo "🐍 Installing Python dependencies..."
pip3 install numpy pandas scikit-learn joblib flask

# Set up Nginx configuration
echo "🌐 Setting up Nginx..."
sudo tee /etc/nginx/sites-available/feeding-dashboard << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable Nginx site configuration
sudo ln -sf /etc/nginx/sites-available/feeding-dashboard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Create a systemd service for the application
echo "🔄 Creating application service..."
sudo tee /etc/systemd/system/feeding-dashboard.service << EOF
[Unit]
Description=Feeding Dashboard Node.js Application
After=network.target mongodb.service

[Service]
Environment=NODE_ENV=production
Type=simple
User=$USER
WorkingDirectory=$HOME/feeding-dashboard
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the application service
sudo systemctl enable feeding-dashboard
sudo systemctl start feeding-dashboard

# Create an admin user
echo "👑 Creating admin user..."
node -e "
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    await mongoose.connect('mongodb://admin:password@localhost:27017/feeding-dashboard?authSource=admin', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    const UserSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, enum: ['admin', 'dietitian'], default: 'dietitian' }
    });
    
    const User = mongoose.model('User', UserSchema);
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin'
    });
    
    await adminUser.save();
    console.log('Admin user created successfully');
    mongoose.disconnect();
  } catch (err) {
    console.error('Error creating admin user:', err);
  }
}

createAdmin();
"

# Check if the application is running
echo "🔍 Checking application status..."
sudo systemctl status feeding-dashboard

# Get the public IP address
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo "✅ Deployment completed successfully!"
echo "🌍 Your application should now be accessible at http://$PUBLIC_IP"
echo "🔑 Admin credentials: username: admin, password: admin123"
echo ""
echo "📋 Useful commands:"
echo "  - Check application logs: sudo journalctl -u feeding-dashboard"
echo "  - Restart application: sudo systemctl restart feeding-dashboard"
echo "  - Check MongoDB status: sudo systemctl status mongod"
echo "  - Update application: cd ~/feeding-dashboard && git pull && npm install && npm run build && sudo systemctl restart feeding-dashboard"
echo ""
echo "⚠️ Important security notes:"
echo "  - Change the default admin password after first login"
echo "  - Consider setting up HTTPS using Let's Encrypt"
echo "  - Update MongoDB admin password in production" 