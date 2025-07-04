#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Minecraft server setup..."

echo "Updaing System..."
sudo apt-get update

echo "Installing Java..."
sudo apt-get install -y openjdk-21-jdk

echo "Installing zstd..."
sudo apt-get install -y zstd

echo "✅ Zstd found: $(zstd --version)"

echo "Installing pipe viewer"
sudo apt-get install -y pv

echo "✅ PV found: $(pv --version)"

echo "Install AWS CLI"
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip
sudo ./aws/install

echo "✅ AWS found: $(aws --version)"
aws configure set default.s3.signature_version s3v4

BASE_NAME="world" # Zip file name (without extension)
DEST=""           # Path where to download the file
CLOUD_PATH=""     # Optional path inside the bucket (e.g., 'folder/'). Leave empty for root.
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
BUCKET=""         # C2 bucket name
ENDPOINT=""

[[ -z "$DEST" ]] && DEST="./"

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "❌ AWS credentials are not available in the specified environment variables."
  exit 1
fi

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=us-east-1

echo "🔍 Checking available archive formats in s3://<<parameters.bucket>>/${CLOUD_PATH}"

set +e
aws --endpoint-url <<parameters.endpoint>> \
  s3 ls "s3://${BUCKET}/${CLOUD_PATH}${BASE_NAME}.tar.zst" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  FILE="${BASE_NAME}.tar.zst"
  EXT=".tar.zst"
else
  echo "⚠️ .tar.zst file not found in bucket. Skipping download."
  exit 0
fi
set -e

mkdir -p "$DEST"
echo "✅ Found $FILE. Downloading to $DEST/$FILE..."

aws --endpoint-url ${ENDPOINT} \
  s3 cp "s3://${BUCKET}/${CLOUD_PATH}$FILE" "$DEST/$FILE"

if [ ! -f "$DEST/$FILE" ]; then
  echo "❌ Download failed."
  exit 1
fi

downloaded_size=$(stat -c%s "$DEST/$FILE")
downloaded_mb=$(awk "BEGIN {printf \"%.2f\", $downloaded_size/1024/1024}")
echo -e "\nDownloaded file size: ${downloaded_mb} MB"
echo "✅ Downloaded $FILE"




echo "✅ Minecraft server setup complete! Use 'sudo systemctl status minecraft' to check status."
