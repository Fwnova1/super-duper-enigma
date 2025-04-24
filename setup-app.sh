#!/bin/bash
set -e

echo "========================================"
echo "Setting up Feeding Dashboard Application"
echo "========================================"

# Clean up any existing client directory
if [ -d "client" ]; then
  echo "Removing existing client directory..."
  rm -rf client
fi

# Create React app
echo "Creating React app..."
npx create-react-app client

# Set React app to use port 3000 explicitly
echo "PORT=3000" > client/.env

# Install client dependencies
echo "Installing client dependencies..."
cd client
npm install axios react-router-dom chart.js react-chartjs-2 bootstrap react-bootstrap
cd ..

# Make sure directories exist
mkdir -p models routes uploads

# Set up environment variables
echo "Setting up environment variables..."
cat > .env << EOL
MONGO_URI=mongodb://localhost:27017/feeding-dashboard
PORT=5000
NODE_ENV=development
EOL

# Check if MongoDB is running in Docker
echo "Checking MongoDB status..."
if docker ps | grep -q mongodb; then
  echo "MongoDB container is already running."
else
  if docker ps -a | grep -q mongodb; then
    echo "Starting existing MongoDB container..."
    docker start mongodb
  else
    echo "Creating MongoDB container..."
    docker volume create mongodb_data
    docker run --name mongodb -d \
      -p 27017:27017 \
      -v mongodb_data:/data/db \
      --restart unless-stopped \
      mongodb/mongodb-community-server:latest
  fi
fi

# Copy React component files
echo "Setting up React components..."

# Fix package.json scripts to avoid port conflict
sed -i 's/"start": "react-scripts start"/"start": "PORT=3000 react-scripts start"/' client/package.json

echo "========================================"
echo "Setup complete!"
echo "========================================"
echo "To start the application, run: npm run dev"
echo "- Backend will run on: http://localhost:5000"
echo "- Frontend will run on: http://localhost:3000"
echo "========================================" 