# minecraft-server-setup

pass aws secret key like ./deploy1.sh --secret="xyz"

## Complete:
curl -O https://raw.githubusercontent.com/Awais6/minecraft-server-setup/refs/heads/main/deploy1.sh
chmod +x deploy1.sh
./deploy1.sh --secret="your_secret_here"

## Starting node js server
pm2 start node.js

pm2 list         # shows app name and ID
pm2 stop node

## For updating
pm2 restart node
pm2 save