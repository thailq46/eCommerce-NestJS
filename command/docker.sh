#!/bin/bash

# filepath: d:\Github\thailq46\eCommerce-NestJS\my-app\command\docker.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_NAME="ecom-nest"
COMPOSE_FILE="docker-compose-dev.yml"
ENV_FILE="./.env.dev"

echo -e "${GREEN}🐳 Starting Docker Compose for eCommerce NestJS...${NC}"
echo -e "${YELLOW}📁 Project: $PROJECT_NAME${NC}"
echo -e "${YELLOW}📄 Compose file: $COMPOSE_FILE${NC}"
echo -e "${YELLOW}🔧 Environment file: $ENV_FILE${NC}"
echo "----------------------------------------"

# Check if files exist
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ File $COMPOSE_FILE not found!${NC}"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ File $ENV_FILE not found!${NC}"
    exit 1
fi

# Run docker-compose
echo -e "${GREEN}🚀 Starting containers...${NC}"
docker-compose -p $PROJECT_NAME -f $COMPOSE_FILE --env-file $ENV_FILE up "$@"