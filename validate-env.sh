#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔍 Environment Variables Validator${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
  echo -e "${RED}❌ ERROR: .env file not found${NC}"
  echo -e "   Please create .env file: cp .env.example .env"
  exit 1
fi

echo -e "${YELLOW}Loading environment variables...${NC}\n"
export $(cat .env | grep -v '#' | xargs)

# Define required variables
REQUIRED_VARS=(
  "NODE_ENV"
  "PORT"
  "MONGO_URI"
  "JWT_SECRET"
  "REFRESH_TOKEN_SECRET"
  "FRONTEND_URL"
  "API_BASE_URL"
  "EMAIL_USER"
  "EMAIL_PASSWORD"
  "RAZORPAY_KEY_ID"
  "RAZORPAY_KEY_SECRET"
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "AWS_S3_BUCKET"
  "GOOGLE_MAPS_API_KEY"
)

ERRORS=0

echo -e "${BLUE}Checking Required Variables:${NC}\n"

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}❌ ${var}${NC} - NOT SET"
    ERRORS=$((ERRORS + 1))
  else
    # Mask sensitive values
    if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"PASSWORD"* ]] || [[ "$var" == *"KEY"* ]]; then
      VALUE="***HIDDEN***"
    else
      VALUE="${!var}"
    fi
    echo -e "${GREEN}✅ ${var}${NC} - $VALUE"
  fi
done

echo ""

# Check for common issues
echo -e "${BLUE}Checking for Common Issues:${NC}\n"

# Check if JWT_SECRET is strong enough
if [ ! -z "$JWT_SECRET" ] && [ ${#JWT_SECRET} -lt 32 ]; then
  echo -e "${YELLOW}⚠️  JWT_SECRET is too short${NC} (${#JWT_SECRET} chars, min 32)"
  ERRORS=$((ERRORS + 1))
else
  [ ! -z "$JWT_SECRET" ] && echo -e "${GREEN}✅ JWT_SECRET is strong enough${NC}"
fi

# Check if FRONTEND_URL contains localhost
if [[ "$FRONTEND_URL" == *"localhost"* ]]; then
  echo -e "${YELLOW}⚠️  FRONTEND_URL contains localhost${NC} - OK for development, NOT for production"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ FRONTEND_URL looks like production URL${NC}"
fi

# Check if API_BASE_URL contains localhost
if [[ "$API_BASE_URL" == *"localhost"* ]]; then
  echo -e "${YELLOW}⚠️  API_BASE_URL contains localhost${NC} - OK for development, NOT for production"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ API_BASE_URL looks like production URL${NC}"
fi

# Check MongoDB connection string format
if [[ "$MONGO_URI" == *"mongodb"* ]]; then
  echo -e "${GREEN}✅ MONGO_URI looks valid${NC}"
else
  echo -e "${RED}❌ MONGO_URI doesn't look like a valid MongoDB connection string${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Final summary
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}✅ All Environment Variables are Set!${NC}"
  echo -e "${GREEN}You're ready to deploy! 🚀${NC}"
  echo -e "${GREEN}========================================${NC}"
  exit 0
else
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}❌ Found $ERRORS issues${NC}"
  echo -e "${RED}Please fix the issues above and try again${NC}"
  echo -e "${RED}========================================${NC}"
  exit 1
fi
