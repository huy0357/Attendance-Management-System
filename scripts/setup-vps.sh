#!/bin/bash
set -e

echo "=========================================="
echo " Starting VPS Initialization & Deployment "
echo "=========================================="

# 1. Update system & install basic tools
sudo apt update && sudo apt install -y curl git ufw ca-certificates gnupg lsb-release
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true

# 2. Setup 4GB Swap
if [ ! -f /swapfile ]; then
    echo "Creating 4GB Swap file..."
    sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap created successfully!"
else
    echo "Swap file already exists."
fi

# 3. Install Docker & Docker Compose if not installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo systemctl enable docker
    sudo systemctl start docker
    rm get-docker.sh
    echo "Docker installed successfully!"
else
    echo "Docker is already installed."
fi

# 4. Create App Directory and Clone Repo
sudo mkdir -p /opt/app
cd /opt/app

if [ ! -d "/opt/app/Attendance-Management-System/.git" ]; then
    echo "Cloning repository..."
    sudo git clone https://github.com/huy0357/Attendance-Management-System.git
else
    echo "Repository exists, pulling latest..."
    cd /opt/app/Attendance-Management-System
    sudo git fetch origin production
    sudo git reset --hard origin/production
fi

cd /opt/app/Attendance-Management-System

# 5. Build and start containers
echo "Starting Docker Compose services..."
sudo docker compose down --remove-orphans || true
sudo docker compose up -d --build

echo "=========================================="
echo " Deployment Complete! "
echo " Check status with: docker compose ps "
echo "=========================================="
