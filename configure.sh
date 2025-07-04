#!/bin/bash

echo "🛠️  Configuring backup variables..."

#FOLDER="mc1"                   // upload folder dir
#ZIP_FILE_NAME="world1"         // zip file name on cloud without ext
#LEVEL="-3"                     // compression level
#CLOUD_PATH="mc/"               // cloud path of zip file
#AWS_ACCESS_KEY_ID="usrMsIu1Ki7LQuQsUi29ndOJQCi9pR93"    // c2 access key
#AWS_SECRET_ACCESS_KEY="$SECRET"                          // c2 secret
#BUCKET="mcstorage"         # C2 bucket name
#ENDPOINT="https://us-003.s3.synologyc2.net"              // c2 endpoint

read -p "Enter folder to backup (FOLDER): " folder
read -p "Enter name of zip file name without ext (ZIP_FILE_NAME): " zip_file
read -p "Enter zstd compression level (e.g. -3) (LEVEL): " level
read -p "Enter cloud path inside the bucket (e.g., 'folder/'). Leave empty for root (CLOUD_PATH): " cloud_path
read -p "Enter AWS Access Key ID (AWS_ACCESS_KEY_ID): " access_key
read -p "Enter AWS Secret Access Key (AWS_SECRET_ACCESS_KEY): " secret_key
read -p "Enter bucket name (BUCKET): " bucket
read -p "Enter endpoint URL (ENDPOINT): " endpoint

cat <<EOF > secrets.txt
FOLDER="$folder"
ZIP_FILE_NAME="$zip_file"
LEVEL="$level"
CLOUD_PATH="$cloud_path"
AWS_ACCESS_KEY_ID="$access_key"
AWS_SECRET_ACCESS_KEY="$secret_key"
BUCKET="$bucket"
ENDPOINT="$endpoint"
EOF

echo "✅ secrets.txt saved."
