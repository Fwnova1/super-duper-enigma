#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting EC2 deployment process..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
sudo apt-get install -y \
    docker.io \
    docker-compose \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    curl \
    wget

# Start and enable Docker
echo "🐳 Setting up Docker..."
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p ~/app
cd ~/app

# Clone the repository (replace with your actual repository URL)
echo "📥 Cloning the repository..."
git clone https://github.com/yourusername/feeding-dashboard.git .
# If you already have the code, you can skip the clone step

# Create .env file with secure credentials
echo "🔐 Creating environment configuration..."
cat > .env <<EOF
MONGO_URI=mongodb://admin:$(openssl rand -base64 32)@mongodb:27017/feeding-dashboard?authSource=admin
PORT=5000
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
EOF

# Build and start the containers
echo "🏗️ Building and starting containers..."
sudo docker-compose down -v  # Clean up any existing containers
sudo docker-compose build --no-cache
sudo docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
if sudo docker-compose ps | grep -q "healthy"; then
    echo "✅ Services are running and healthy!"
else
    echo "❌ Some services are not healthy. Checking logs..."
    sudo docker-compose logs
    exit 1
fi

# Setup Nginx (if needed)
echo "🌐 Setting up Nginx..."
sudo tee /etc/nginx/sites-available/feeding-dashboard <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/feeding-dashboard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup automatic backups
echo "💾 Setting up automatic backups..."
chmod +x backup-script.sh
(crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/backup-script.sh") | crontab -

echo "✨ Deployment completed successfully!"
echo "🌍 Your application should now be accessible at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "📝 To enable HTTPS, run: sudo ./setup-nginx-ssl.sh"
echo "🔍 To check logs, run: sudo docker-compose logs -f" 