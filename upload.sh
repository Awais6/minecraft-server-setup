#!/bin/bash

# Exit on error
set -e

# Load all variables from secrets.txt
if [ -f "secrets.txt" ]; then
  source secrets.txt
else
  echo "❌ secrets.txt not found. Please run ./configure-secrets.sh first."
  exit 1
fi

echo "🚀 Starting backup"

echo "Check AWS CLI"
aws --version

echo "✅ Zstd found: $(zstd --version)"
echo "✅ PV found: $(pv --version)"

echo "Validate and Zip Folder"

ZIP_FILE="${ZIP_FILE_NAME}.tar.zst"

if [ ! -d "$FOLDER" ]; then
  echo "❌ Folder '$FOLDER' does not exist."
  exit 0
fi

if [ -z "$(ls -A "$FOLDER")" ]; then
  echo "❌ Folder '$FOLDER' is empty."
  exit 0
fi

echo "✅ Folder '$FOLDER' exists and is not empty. Creating zip using zstd with $LEVEL level..."

total_size=$(du -sb "$FOLDER" | awk '{print $1}')
total_mb=$((total_size / 1024 / 1024))
echo "Total size to archive: ${total_mb} MB"

tar -cf - -C "$FOLDER" . | pv -s "$total_size" | zstd -T0 $LEVEL -o "$ZIP_FILE"

if [ ! -f "$ZIP_FILE" ]; then
  echo "❌ Failed to create $ZIP_FILE."
  exit 1
fi

zip_size=$(stat -c%s "$ZIP_FILE")
zip_mb=$(awk "BEGIN {printf \"%.2f\", $zip_size/1024/1024}")
echo -e "✅ Created $ZIP_FILE — final size: ${zip_mb} MB"

echo "Uploading to Cloud..."

if [ ! -f "$ZIP_FILE" ]; then
  echo "❌ Zip file '$ZIP_FILE' not found. Cannot upload."
  exit 0
fi

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "❌ AWS credentials are not available in the specified environment variables."
  exit 1
fi

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=us-east-1

echo "✅ Uploading $ZIP_FILE to $ENDPOINT/$BUCKET/$CLOUD_PATH"

zip_size=$(stat -c%s "$ZIP_FILE")
zip_mb=$(awk "BEGIN {printf \"%.2f\", $zip_size/1024/1024}")
echo -e "\nZip file size: ${zip_mb} MB\n"

#aws configure set default.s3.signature_version s3v4
export AWS_S3_USE_SIGV4=1

aws --endpoint-url ${ENDPOINT} \
  s3 cp "$ZIP_FILE" "s3://${BUCKET}/${CLOUD_PATH}$ZIP_FILE"