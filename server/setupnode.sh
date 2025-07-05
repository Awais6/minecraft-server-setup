#!/bin/bash

# Exit on error
set -e

echo "server setting..."
echo "npm version: $(npm --version)"
echo "pm2 version: $(pm2 --version)"

echo "Stopping previous node"
pm2 stop node

mkdir -p "server"
cd server

echo "Creating Package.json"
curl -O "https://raw.githubusercontent.com/Awais6/minecraft-server-setup/refs/heads/main/server/package.json"

echo "Creating Node App"
curl -O "https://raw.githubusercontent.com/Awais6/minecraft-server-setup/refs/heads/main/server/node.js"

echo "Installing packages..."
npm install

pm2 start node.js
pm2 save