#!/bin/bash

# EC2 Deployment Script for Feeding Dashboard Application
# This script automates the deployment process on an EC2 instance

# Exit on any error
set -e

echo "====== Starting Feeding Dashboard Deployment ======"
echo "$(date)"

# 1. Update system packages
echo "Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker and Docker Compose
echo "Installing Docker and Docker Compose..."
sudo apt-get install -y docker.io docker-compose

# Make sure Docker service is running
sudo systemctl enable --now docker

# Add current user to docker group to run docker without sudo
sudo usermod -aG docker $USER
echo "You may need to log out and back in for docker group membership to take effect"

# 3. Clone the repository (if not already cloned)
REPO_DIR="$HOME/feeding-dashboard"
if [ ! -d "$REPO_DIR" ]; then
    echo "Cloning repository..."
    git clone https://github.com/yourusername/feeding-dashboard.git $REPO_DIR
else
    echo "Repository directory already exists. Pulling latest changes..."
    cd $REPO_DIR
    git pull
fi

# 4. Navigate to the project directory
cd $REPO_DIR

# 5. Create .env file (if it doesn't exist)
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env <<EOF
MONGO_URI=mongodb://admin:password@mongodb:27017/feeding-dashboard?authSource=admin
PORT=5000
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
EOF
    echo ".env file created with random JWT_SECRET"
else
    echo ".env file already exists"
fi

# 6. Pull/build and start containers
echo "Starting Docker containers..."
sudo docker-compose down || true
sudo docker-compose up --build -d

# 7. Print container status
echo "Container status:"
sudo docker-compose ps

# 8. Print application URL
echo ""
echo "====== Deployment Completed ======"
echo "Your application should now be running at:"
echo "http://$(curl -s http://checkip.amazonaws.com):80"
echo ""
echo "MongoDB is running on port 27017 (only accessible within Docker network by default)"
echo ""
echo "To view application logs:"
echo "  sudo docker-compose logs -f app"
echo ""
echo "To stop the application:"
echo "  sudo docker-compose down"
echo ""
echo "To update to the latest version:"
echo "  cd $REPO_DIR && git pull && sudo docker-compose up --build -d"
echo "======================================" 