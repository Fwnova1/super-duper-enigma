#!/bin/bash

# Exit on any error
set -e

echo "====== Building and Deploying Feeding Dashboard ======"
echo "$(date)"

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "Node.js $(node -v) installed"
    echo "npm $(npm -v) installed"
fi

# 1. Build the client first
echo "Building React client..."
cd client
npm install
npm run build
cd ..

# 2. Start Docker containers
echo "Starting Docker containers..."
sudo docker-compose down || true
sudo docker-compose up -d

# 3. Check status
echo "Container status:"
sudo docker-compose ps

echo ""
echo "====== Deployment Completed ======"
echo "Your application should now be running at:"
echo "http://$(curl -s http://checkip.amazonaws.com):80"
echo ""
echo "MongoDB is running on port 27017"
echo ""
echo "To view application logs:"
echo "  sudo docker-compose logs -f app"
echo ""
echo "To stop the application:"
echo "  sudo docker-compose down"
echo "======================================" 