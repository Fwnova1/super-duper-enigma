#!/bin/bash

# Script to set up Nginx with Let's Encrypt SSL on EC2
# Run this after the main deployment script if you want HTTPS support

# Exit on any error
set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root or with sudo"
    exit 1
fi

# Get domain name from user
read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN_NAME
read -p "Enter your email address (for Let's Encrypt notifications): " EMAIL_ADDRESS

# Update system packages
apt-get update

# Install Nginx and Certbot
apt-get install -y nginx certbot python3-certbot-nginx

# Make sure Nginx is running
systemctl enable nginx
systemctl start nginx

# Copy the Nginx configuration template
cp nginx-config.conf /etc/nginx/sites-available/$DOMAIN_NAME.conf

# Update domain name in the configuration
sed -i "s/yourdomain.com/$DOMAIN_NAME/g" /etc/nginx/sites-available/$DOMAIN_NAME.conf

# Enable the site
ln -sf /etc/nginx/sites-available/$DOMAIN_NAME.conf /etc/nginx/sites-enabled/

# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Reload Nginx to apply changes
systemctl reload nginx

# Request Let's Encrypt certificate
certbot --nginx --non-interactive --agree-tos --email $EMAIL_ADDRESS --domains $DOMAIN_NAME,www.$DOMAIN_NAME

# Set up auto-renewal cron job
echo "0 3 * * * /usr/bin/certbot renew --quiet" | crontab -

echo "==================================================="
echo "Nginx has been set up with HTTPS for $DOMAIN_NAME"
echo "Your site is now accessible at https://$DOMAIN_NAME"
echo "==================================================="
echo "Certificates will auto-renew via the cron job" 