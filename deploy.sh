#!/bin/bash

# it is used to deploy server settings

# Exit on error
set -e

echo "🚀 Starting M-C server setup..."

read -p "Enter folder name: " folder

FOLDER_NAME="$folder"

echo "Updaing System..."
sudo apt-get update

# Check and install Java
if ! command -v java &> /dev/null; then
  echo "Installing Java..."
  sudo apt-get update
  sudo apt-get install -y openjdk-21-jdk
else
  echo "✅ Java found: $(java -version 2>&1 | head -n 1)"
fi

# Check and install zstd
if ! command -v zstd &> /dev/null; then
  echo "Installing zstd..."
  sudo apt-get install -y zstd
else
  echo "✅ Zstd found: $(zstd --version)"
fi

# Check and install pv
if ! command -v pv &> /dev/null; then
  echo "Installing pipe viewer (pv)..."
  sudo apt-get install -y pv
else
  echo "✅ PV found: $(pv --version)"
fi

# Check and install unzip
if ! command -v unzip &> /dev/null; then
  echo "Installing unzip..."
  sudo apt-get install -y unzip
else
  echo "✅ Unzip found: $(unzip -v | head -n 1)"
fi

# Check and install AWS CLI
if ! command -v aws &> /dev/null; then
  echo "Installing AWS CLI..."
  
  ARCH=$(uname -m)
  if [ "$ARCH" == "x86_64" ]; then
    ARCH_DL="awscli-exe-linux-x86_64.zip"
  elif [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
    ARCH_DL="awscli-exe-linux-aarch64.zip"
  else
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
  fi

  curl "https://awscli.amazonaws.com/$ARCH_DL" -o "awscliv2.zip"
  unzip -q awscliv2.zip
  sudo ./aws/install
  rm -rf aws awscliv2.zip
else
  echo "✅ AWS CLI found: $(aws --version)"
fi

# Ensure AWS CLI uses S3 Signature Version 4
aws configure set default.s3.signature_version s3v4

echo "✅ All dependencies are installed!"

echo -e "\n\nSetting world dir: $FOLDER_NAME"
mkdir -p "$FOLDER_NAME"

cd $FOLDER_NAME



echo "✅ M-C server setup complete!"
