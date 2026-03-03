#!/bin/bash
set -e

echo "============================================"
echo " inuvps-enterprise VPS Setup Script"
echo " Server: api.justadev.site"
echo "============================================"

# -----------------------------------------------
# STEP 1: System Update & Essential Packages
# -----------------------------------------------
echo "[1/8] Updating system and installing packages..."
apt update && apt upgrade -y
apt install -y curl wget git build-essential ufw ffmpeg postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# -----------------------------------------------
# STEP 2: Firewall
# -----------------------------------------------
echo "[2/8] Configuring firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
echo "Firewall enabled."

# -----------------------------------------------
# STEP 3: Install Node.js 20 LTS
# -----------------------------------------------
echo "[3/8] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# -----------------------------------------------
# STEP 4: Install PM2
# -----------------------------------------------
echo "[4/8] Installing PM2..."
npm install -g pm2

# -----------------------------------------------
# STEP 5: Configure PostgreSQL
# -----------------------------------------------
echo "[5/8] Configuring PostgreSQL..."
DB_PASSWORD="InuVps2026SecureDB!"

sudo -u postgres psql -c "CREATE USER inuvps WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE inuvps_db OWNER inuvps;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE inuvps_db TO inuvps;"

echo "PostgreSQL configured. DB Password: ${DB_PASSWORD}"

# -----------------------------------------------
# STEP 6: Clone & Build Project
# -----------------------------------------------
echo "[6/8] Cloning and building project..."
mkdir -p /var/www
cd /var/www

if [ -d "inuvps-enterprise" ]; then
    echo "Project directory already exists, pulling latest..."
    cd inuvps-enterprise
    git fetch
    git checkout development
    git pull origin development
else
    git clone -b development https://github.com/VoidFalseZ/inuvps-enterprise.git
    cd inuvps-enterprise
fi

# Create production .env
cat > .env << 'EOF'
DATABASE_URL="postgresql://inuvps:InuVps2026SecureDB!@localhost:5432/inuvps_db"

# R2 Configuration
R2_ENDPOINT="https://9c5b8149f320844083c787102960309c.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="56685d83851bf0115a88f738ad7f255b"
R2_SECRET_ACCESS_KEY="4da7c0abd24fcc30d8c8b27c0be0c251fabbb06747390709d06badf8f84f959d"
R2_BUCKET_NAME="inupoi-hentai"
R2_PUBLIC_URL="https://cdn.inupoi.site"

PORT=3000
HOST="0.0.0.0"
NODE_ENV="production"
EOF

# Install dependencies
npm ci

# Generate Prisma client & create tables
npx prisma generate
npx prisma db push

# Build the app
npm run build

# -----------------------------------------------
# STEP 7: Start with PM2
# -----------------------------------------------
echo "[7/8] Starting app with PM2..."
mkdir -p /var/log/pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# -----------------------------------------------
# STEP 8: Configure Nginx + SSL
# -----------------------------------------------
echo "[8/8] Configuring Nginx..."

cp nginx.conf /etc/nginx/sites-available/inuvps
ln -sf /etc/nginx/sites-available/inuvps /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

echo ""
echo "============================================"
echo " Setup Complete!"
echo "============================================"
echo " API URL:  http://api.justadev.site"
echo " PM2:      pm2 status"
echo " Logs:     pm2 logs inuvps-enterprise"
echo ""
echo " Next: Run this for SSL (HTTPS):"
echo "   certbot --nginx -d api.justadev.site"
echo "============================================"
