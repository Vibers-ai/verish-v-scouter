#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Verish App Deployment Script${NC}"
echo "================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed. Please install it first.${NC}"
    exit 1
fi

# Step 1: Build the React app
echo -e "\n${YELLOW}📦 Building React app...${NC}"
cd react-app
npm run build
cd ..

# Step 2: Initialize and apply Terraform
echo -e "\n${YELLOW}🏗️  Setting up infrastructure with Terraform...${NC}"
cd terraform

# Initialize Terraform if not already done
if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform..."
    terraform init
fi

# Plan and apply
echo "Planning Terraform changes..."
terraform plan

echo -e "\n${YELLOW}Do you want to apply these changes? (yes/no)${NC}"
read -r response
if [[ "$response" != "yes" ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo "Applying Terraform configuration..."
terraform apply -auto-approve

# Get outputs
BUCKET_NAME=$(terraform output -raw s3_bucket_name)
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
APP_URL=$(terraform output -raw app_url)

cd ..

# Step 3: Upload files to S3
echo -e "\n${YELLOW}☁️  Uploading files to S3...${NC}"

# Upload all files except index.html with long cache
aws s3 sync react-app/dist/ s3://$BUCKET_NAME/ \
    --exclude "index.html" \
    --cache-control "public,max-age=31536000,immutable" \
    --delete

# Upload index.html with no cache (for updates)
aws s3 cp react-app/dist/index.html s3://$BUCKET_NAME/index.html \
    --cache-control "public,max-age=0,must-revalidate"

# Step 4: Invalidate CloudFront cache
echo -e "\n${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "Your app is available at: ${GREEN}$APP_URL${NC}"
echo ""
echo "It may take a few minutes for CloudFront to fully propagate the changes."
echo "CloudFront Distribution ID: $DISTRIBUTION_ID"
echo "S3 Bucket: $BUCKET_NAME"