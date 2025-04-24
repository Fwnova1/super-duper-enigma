#!/bin/bash
set -e

echo "========================================"
echo "Setting up Feeding Dashboard with Docker"
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

# Create all component files and configs
echo "Setting up all application files..."

# Build and start Docker containers
echo "Building and starting Docker containers..."
docker-compose up -d

echo "========================================"
echo "Docker setup complete!"
echo "========================================"
echo "- MongoDB is running at: mongodb://localhost:27017"
echo "- Backend API is running at: http://localhost:5000"
echo "- Frontend is running at: http://localhost:3000"
echo "========================================"
echo "To stop the containers: docker-compose down"
echo "To view logs: docker-compose logs -f"
echo "To rebuild: docker-compose up -d --build"
echo "======================================== 