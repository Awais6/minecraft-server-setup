#!/bin/bash

# Exit on error
set -e

# Load all variables from secrets.txt
if [ -f "secrets.txt" ]; then
  source secrets.txt
else
  echo "❌ secrets.txt not found. Please run ./configure.sh first."
  exit 1
fi

echo "🚀 Starting restore"

echo "Check AWS CLI"
aws --version

echo "✅ Zstd found: $(zstd --version)"
echo "✅ PV found: $(pv --version)"

DEST="$FOLDER"
BASE_NAME="$ZIP_FILE_NAME" # Zip file name (without extension)

[[ -z "$DEST" ]] && DEST="./"

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "❌ AWS credentials are not available in the specified environment variables."
  exit 1
fi

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=us-east-1

echo "🔍 Checking available archive formats in s3://${ENDPOINT}/${CLOUD_PATH}"

set +e
aws --endpoint-url ${ENDPOINT} \
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

echo "Extracting Archive..."

FILE_ZST="$DEST/${BASE_NAME}.tar.zst"

if [ -f "$FILE_ZST" ]; then
  echo "📦 Extracting $FILE_ZST to $DEST"
  total_size=$(stat -c%s "$FILE_ZST")
  pv -s "$total_size" "$FILE_ZST" | tar -I zstd -xf - -C "$DEST"
  rm -f "$FILE_ZST"
  echo "✅ Extracted and deleted $FILE_ZST"
else
  echo "⚠️ No archive file found to extract."
  exit 0
fi

echo "✅ Extracted contents:"
ls -l "$DEST"
extracted_size=$(du -sb "$DEST" | awk '{print $1}')
extracted_mb=$(awk "BEGIN {printf \"%.2f\", $extracted_size/1024/1024}")
echo -e "\nExtracted output size: ${extracted_mb} MB"