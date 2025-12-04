#!/bin/bash

# Apex Trading Platform - Workspace Cleanup Script
# This script cleans temporary files and prepares workspace for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   Apex Trading Platform - Workspace Cleanup${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""

# Check we're in the right directory
if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
    echo -e "${RED}Error: docker-compose.yml not found. Are you in the project root?${NC}"
    exit 1
fi

cd "$PROJECT_ROOT"

# Get initial disk usage
INITIAL_SIZE=$(du -sb . | cut -f1)

echo -e "${YELLOW}Project directory: ${PROJECT_ROOT}${NC}"
echo ""

# Function to remove files
remove_files() {
    local pattern=$1
    local description=$2
    
    if ls $pattern 1> /dev/null 2>&1; then
        echo -e "${YELLOW}Removing ${description}...${NC}"
        rm -f $pattern
        echo -e "${GREEN}✓ Done${NC}"
    else
        echo -e "${BLUE}No ${description} found${NC}"
    fi
}

# Function to remove directories
remove_dirs() {
    local pattern=$1
    local description=$2
    
    echo -e "${YELLOW}Removing ${description}...${NC}"
    # Use -exec rm -rf for safer directory removal
    find . -type d -name "$pattern" -exec rm -rf {} + 2>/dev/null || true
    echo -e "${GREEN}✓ Done${NC}"
}

echo -e "${BLUE}Step 1: Removing temporary text files${NC}"
remove_files "temp.txt segment.txt segment_current.txt new_segment.txt" "temporary text files"
echo ""

echo -e "${BLUE}Step 2: Removing empty or generated files${NC}"
remove_files "openapi.json" "empty OpenAPI spec"
echo ""

echo -e "${BLUE}Step 3: Removing media files${NC}"
remove_files "*.mp4 *.mov *.avi" "video files"
echo ""

echo -e "${BLUE}Step 4: Cleaning Python cache${NC}"
remove_dirs "__pycache__" "Python cache directories"
remove_files "*.pyc *.pyo" "Python compiled files"
echo ""

echo -e "${BLUE}Step 5: Cleaning build artifacts${NC}"
if [ -d "frontend/dist" ]; then
    echo -e "${YELLOW}Removing frontend/dist...${NC}"
    rm -rf frontend/dist
    echo -e "${GREEN}✓ Done${NC}"
else
    echo -e "${BLUE}No frontend build artifacts found${NC}"
fi
echo ""

echo -e "${BLUE}Step 6: Cleaning test artifacts${NC}"
remove_dirs ".pytest_cache" "pytest cache"
remove_dirs "htmlcov" "coverage HTML reports"
remove_files ".coverage" "coverage data files"
echo ""

# Get final disk usage
FINAL_SIZE=$(du -sb . | cut -f1)
SAVED=$((INITIAL_SIZE - FINAL_SIZE))
SAVED_MB=$((SAVED / 1024 / 1024))

echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN}✓ Workspace cleanup complete!${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""
echo -e "${GREEN}Disk space saved: ${SAVED_MB} MB${NC}"
echo ""

# Check for files that might need manual review
echo -e "${YELLOW}Files that might need manual review:${NC}"
echo ""

# Check for .env files
if find . -name ".env" -type f 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}⚠ .env files found (ensure not committed):${NC}"
    find . -name ".env" -type f 2>/dev/null | grep -v node_modules
    echo ""
fi

# Check for large files (> 1MB)
echo -e "${YELLOW}Large files (> 1MB):${NC}"
find . -type f -size +1M -not -path './node_modules/*' -not -path './.git/*' 2>/dev/null | head -10 || echo "None found"
echo ""

# Check for .log files
if find . -name "*.log" -type f 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}⚠ Log files found:${NC}"
    find . -name "*.log" -type f 2>/dev/null | grep -v node_modules | head -10
    echo ""
fi

# Verify git status
echo -e "${BLUE}Git status:${NC}"
if git rev-parse --git-dir > /dev/null 2>&1; then
    git status --short | head -20
    if [ -z "$(git status --short)" ]; then
        echo "Working directory clean"
    fi
else
    echo "Not a git repository"
fi
echo ""

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}Next steps:${NC}"
echo -e "${GREEN}==================================================${NC}"
echo "1. Review files listed above"
echo "2. Verify no secrets in git: git log --all --full-history -- .env"
echo "3. Test application still works: docker compose up -d"
echo "4. Proceed with deployment checklist: DEPLOYMENT.md"
echo ""
echo -e "${BLUE}==================================================${NC}"
