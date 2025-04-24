# EC2 Deployment Guide for Feeding Dashboard

This guide provides step-by-step instructions for deploying the Feeding Dashboard application on an AWS EC2 instance using Docker.

## Prerequisites

1. An AWS account
2. An EC2 instance running Ubuntu 20.04 or later
3. Basic knowledge of SSH, Docker, and AWS EC2

## EC2 Instance Setup

1. Launch an EC2 instance with the following specifications:
   - **AMI**: Ubuntu Server 20.04 LTS (or later)
   - **Instance Type**: t2.micro (for testing) or t2.small/t2.medium (for production)
   - **Storage**: At least 20GB EBS volume
   - **Security Group**: 
     - SSH (port 22) - restricted to your IP
     - HTTP (port 80) - open to all
     - HTTPS (port 443) - open to all

2. Create an Elastic IP and associate it with your instance (optional, but recommended)

3. Update your domain DNS to point to your EC2 instance's IP address (if you plan to use a domain)

## Deployment Options

You have two deployment options:

### Option 1: Automatic Deployment (Recommended)

1. SSH into your EC2 instance:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/feeding-dashboard.git
   cd feeding-dashboard
   ```

3. Make the deployment script executable:
   ```bash
   chmod +x deployment-script.sh
   ```

4. Run the deployment script:
   ```bash
   ./deployment-script.sh
   ```

5. Wait for the script to complete. Your application will be available at http://your-ec2-ip

### Option 2: Manual Deployment

If you prefer to deploy manually, follow these steps:

1. SSH into your EC2 instance:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

2. Update packages and install Docker + Docker Compose:
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose
   sudo systemctl enable --now docker
   sudo usermod -aG docker $USER
   # Log out and log back in for group changes to take effect
   ```

3. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/feeding-dashboard.git
   cd feeding-dashboard
   ```

4. Create a `.env` file:
   ```bash
   cat > .env <<EOF
   MONGO_URI=mongodb://admin:password@mongodb:27017/feeding-dashboard?authSource=admin
   PORT=5000
   NODE_ENV=production
   JWT_SECRET=$(openssl rand -hex 32)
   EOF
   ```

5. Start the application:
   ```bash
   sudo docker-compose up -d
   ```

## Adding HTTPS with Let's Encrypt

If you want to secure your site with HTTPS, run the provided SSL setup script:

```bash
cd feeding-dashboard
sudo chmod +x setup-nginx-ssl.sh
sudo ./setup-nginx-ssl.sh
```

Follow the prompts to configure HTTPS with your domain.

## Database Backups

To enable automated database backups:

1. Make the backup script executable:
   ```bash
   cd feeding-dashboard
   chmod +x backup-script.sh
   ```

2. Edit the script to configure your backup settings:
   ```bash
   nano backup-script.sh
   ```

3. Set up a daily cron job:
   ```bash
   crontab -e
   ```

4. Add the following line to run backups daily at 2 AM:
   ```
   0 2 * * * /home/ubuntu/feeding-dashboard/backup-script.sh
   ```

## Troubleshooting

### Application Issues

Check the application logs:
```bash
sudo docker-compose logs -f app
```

### MongoDB Issues

Check the MongoDB logs:
```bash
sudo docker-compose logs -f mongodb
```

To access the MongoDB shell:
```bash
sudo docker exec -it mongodb mongosh -u admin -p password --authenticationDatabase admin
```

### Nginx/SSL Issues

Check Nginx logs:
```bash
sudo cat /var/log/nginx/error.log
```

Test Nginx configuration:
```bash
sudo nginx -t
```

## Updating the Application

To update the application to the latest version:

```bash
cd ~/feeding-dashboard
git pull
sudo docker-compose up --build -d
```

## Security Considerations

1. Change the default MongoDB credentials in `docker-compose.yml`
2. Use a strong, randomly generated JWT_SECRET
3. Consider setting up AWS WAF for additional protection
4. Regularly update your system with `sudo apt-get update && sudo apt-get upgrade` 