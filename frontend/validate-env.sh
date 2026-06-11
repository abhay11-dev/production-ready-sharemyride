#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔍 Frontend Environment Validator${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if .env.local file exists
if [ ! -f .env.local ]; then
  echo -e "${RED}❌ ERROR: .env.local file not found${NC}"
  echo -e "   Please create .env.local file: cp .env.example .env.local"
  exit 1
fi

echo -e "${YELLOW}Loading environment variables...${NC}\n"

# Read env variables from .env.local
VITE_API_URL=$(grep VITE_API_URL .env.local | cut -d '=' -f2)
VITE_GOOGLE_MAPS_API_KEY=$(grep VITE_GOOGLE_MAPS_API_KEY .env.local | cut -d '=' -f2)
VITE_APP_URL=$(grep VITE_APP_URL .env.local | cut -d '=' -f2)

ERRORS=0

echo -e "${BLUE}Checking Required Variables:${NC}\n"

# Check VITE_API_URL
if [ -z "$VITE_API_URL" ]; then
  echo -e "${RED}❌ VITE_API_URL${NC} - NOT SET"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ VITE_API_URL${NC} - $VITE_API_URL"
fi

# Check VITE_GOOGLE_MAPS_API_KEY
if [ -z "$VITE_GOOGLE_MAPS_API_KEY" ]; then
  echo -e "${RED}❌ VITE_GOOGLE_MAPS_API_KEY${NC} - NOT SET"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ VITE_GOOGLE_MAPS_API_KEY${NC} - ***HIDDEN***"
fi

# Check VITE_APP_URL
if [ -z "$VITE_APP_URL" ]; then
  echo -e "${YELLOW}⚠️  VITE_APP_URL${NC} - NOT SET (Optional)"
else
  echo -e "${GREEN}✅ VITE_APP_URL${NC} - $VITE_APP_URL"
fi

echo ""

# Check for common issues
echo -e "${BLUE}Checking for Common Issues:${NC}\n"

# Check if VITE_API_URL contains localhost
if [[ "$VITE_API_URL" == *"localhost"* ]]; then
  echo -e "${YELLOW}⚠️  VITE_API_URL contains localhost${NC}"
  echo -e "   This will NOT work in production!"
  ERRORS=$((ERRORS + 1))
else
  if [[ "$VITE_API_URL" == *"https://"* ]]; then
    echo -e "${GREEN}✅ VITE_API_URL uses HTTPS${NC}"
  else
    echo -e "${YELLOW}⚠️  VITE_API_URL should use HTTPS${NC}"
  fi
fi

# Check if VITE_API_URL ends with /api
if [[ "$VITE_API_URL" == *"/api" ]]; then
  echo -e "${GREEN}✅ VITE_API_URL has /api suffix${NC}"
else
  echo -e "${YELLOW}⚠️  VITE_API_URL should end with /api${NC}"
fi

echo ""

# Final summary
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}✅ Frontend Environment is Valid!${NC}"
  echo -e "${GREEN}You're ready to build and deploy! 🚀${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo -e "\nNext steps:"
  echo -e "  npm run build"
  echo -e "  npm run preview  (test locally)"
  echo ""
  exit 0
else
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}❌ Found $ERRORS issues${NC}"
  echo -e "${RED}Please fix the issues above and try again${NC}"
  echo -e "${RED}========================================${NC}"
  exit 1
fi
