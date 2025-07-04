echo "server setting..."
echo "npm version: $(npm --version)"

mkdir -p "server"
cd server

echo "Creating Package.json"
curl -O "xyz/package.json"


