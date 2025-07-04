# minecraft-server-setup

curl -O https://raw.githubusercontent.com/Awais6/minecraft-server-setup/refs/heads/main/deploy.sh
chmod +x deploy.sh
./deploy.sh



pass aws secret key like ./deploy1.sh --secret="xyz"

## Complete:
curl -O https://raw.githubusercontent.com/Awais6/minecraft-server-setup/refs/heads/main/deploy1.sh
chmod +x deploy1.sh
./deploy1.sh --secret="your_secret_here"

## Auto Setup Node Js Server
curl -O https://raw.githubusercontent.com/Awais6/minecraft-server-setup/refs/heads/main/server/setupnode.sh
chmod +x setupnode.sh
./setupnode.sh

## Starting node js server
pm2 start node.js
pm2 monit
pm2 save

pm2 list         # shows app name and ID
pm2 stop node

## For updating
pm2 restart node
pm2 save