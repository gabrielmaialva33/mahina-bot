#!/bin/bash

# Deployment script for Mahina Bot
# This script can be run on the server for manual deployments

set -e  # Exit on error

echo "🚀 Starting Mahina Bot deployment..."

# Navigate to project directory
cd /root/mahina-bot

echo "📥 Pulling latest changes from Git..."
git pull origin master

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🔨 Building the application..."
pnpm run build

echo "🗄️  Pushing database schema..."
pnpm run db:push

echo "♻️  Restarting application with PM2..."
pm2 restart mahina-bot || pm2 start ecosystem.config.cjs --name mahina-bot

echo "💾 Saving PM2 process list..."
pm2 save

echo "✅ Deployment complete!"
echo "📊 Current PM2 status:"
pm2 status