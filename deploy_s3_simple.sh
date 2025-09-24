#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Verish App S3 Deployment Script${NC}"
echo "================================="

# Configuration
BUCKET_NAME="verish-app"  # Change this to your desired bucket name
REGION="us-east-1"        # Change to your preferred region

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if bucket exists, create if not
echo -e "\n${YELLOW}🪣 Checking S3 bucket...${NC}"
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "Bucket $BUCKET_NAME already exists"
else
    echo "Creating bucket $BUCKET_NAME..."
    if [ "$REGION" = "us-east-1" ]; then
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION"
    else
        aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" \
            --create-bucket-configuration LocationConstraint="$REGION"
    fi

    # Enable public access
    echo "Configuring bucket for public access..."
    aws s3api put-public-access-block --bucket "$BUCKET_NAME" \
        --public-access-block-configuration \
        "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

    # Wait for the configuration to propagate
    sleep 2
fi

# Configure bucket for static website hosting
echo -e "\n${YELLOW}⚙️  Configuring static website hosting...${NC}"
aws s3 website "s3://$BUCKET_NAME/" \
    --index-document index.html \
    --error-document index.html

# Set bucket policy for public read access
echo "Setting bucket policy..."
cat > /tmp/bucket-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/bucket-policy.json
rm /tmp/bucket-policy.json

# Build the React app if dist doesn't exist
if [ ! -d "react-app/dist" ]; then
    echo -e "\n${YELLOW}📦 Building React app...${NC}"
    cd react-app
    npm run build
    cd ..
fi

# Upload files to S3
echo -e "\n${YELLOW}☁️  Uploading files to S3...${NC}"

# Upload all files except index.html with long cache
aws s3 sync react-app/dist/ "s3://$BUCKET_NAME/" \
    --exclude "index.html" \
    --cache-control "public,max-age=31536000,immutable" \
    --delete

# Upload index.html with no cache (for updates)
aws s3 cp react-app/dist/index.html "s3://$BUCKET_NAME/index.html" \
    --cache-control "public,max-age=0,must-revalidate" \
    --content-type "text/html"

# Get the website URL
if [ "$REGION" = "us-east-1" ]; then
    WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
else
    WEBSITE_URL="http://$BUCKET_NAME.s3-website.$REGION.amazonaws.com"
fi

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "Your app is available at: ${GREEN}$WEBSITE_URL${NC}"
echo ""
echo "S3 Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""
echo "Note: It may take a few minutes for DNS to propagate."