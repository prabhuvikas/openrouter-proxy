#!/bin/bash

# OpenRouter + Claude Code Launcher (with y-router)
# This script configures Claude Code to use OpenRouter API through y-router
# Requires: Docker, Docker Compose, and Claude Code CLI

set -e

echo ""
echo "=== Claude Code with OpenRouter (y-router) Launcher ==="
echo "This script will configure Claude Code to use OpenRouter API"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if Docker is running
echo "Checking Docker status..."
if ! docker ps > /dev/null 2>&1; then
    echo "⚠ Waiting for Docker to start..."
    
    # Wait up to 60 seconds for Docker to start
    for i in {1..30}; do
        if docker ps > /dev/null 2>&1; then
            echo "✓ Docker is running"
            break
        fi
        echo "  Attempt $i/30..."
        sleep 2
    done
    
    if ! docker ps > /dev/null 2>&1; then
        echo ""
        echo "✗ Docker is not running after waiting 60 seconds"
        echo ""
        echo "To fix this:"
        echo "  1. Start Docker Desktop or Docker daemon"
        echo "  2. Run this script again"
        echo ""
        exit 1
    fi
else
    echo "✓ Docker is running"
fi

# Check if docker-compose.yml exists
if [ ! -f "$SCRIPT_DIR/docker-compose.yml" ]; then
    echo "✗ docker-compose.yml not found in $SCRIPT_DIR"
    echo "Please ensure the file is in the same directory as this script."
    exit 1
fi

echo ""
echo "Starting y-router proxy service..."
echo "Building Docker image from source (first run: 5-10 minutes)..."

# Start proxy
cd "$SCRIPT_DIR"
if ! docker compose up -d; then
    echo ""
    echo "✗ Failed to start proxy service"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check Docker is running and has internet access"
    echo "  2. Try building manually: docker compose build --no-cache"
    echo "  3. Check Docker logs for details"
    exit 1
fi

echo "✓ Proxy service started successfully"
echo "Waiting for service to initialize..."
sleep 5
echo "✓ Proxy service is ready on http://localhost:8787"

echo ""

# Load .env file if it exists
ENV_FILE="$SCRIPT_DIR/.env"
declare -A env_vars

if [ -f "$ENV_FILE" ]; then
    echo "Loading configuration from .env file..."
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^[[:space:]]*# ]] && continue
        [[ -z "$key" ]] && continue
        
        key=$(echo "$key" | xargs)  # trim whitespace
        value=$(echo "$value" | xargs)  # trim whitespace
        env_vars[$key]="$value"
    done < "$ENV_FILE"
    echo "✓ .env file loaded"
    echo ""
fi

# Check if API key is already set
API_KEY="${env_vars[ANTHROPIC_AUTH_TOKEN]:-$ANTHROPIC_AUTH_TOKEN}"

# Only prompt for API key if not already set
if [ -z "$API_KEY" ]; then
    echo "Available OpenRouter Models:"
    echo "  - qwen/qwen-2.5-coder-32b-instruct  (Coding specialist)"
    echo "  - anthropic/claude-3.5-sonnet        (General purpose)"
    echo "  - anthropic/claude-3-haiku           (Fast/cheap)"
    echo "  - gpt-4-turbo                        (OpenAI)"
    echo "  - mistral/mistral-large              (Mistral)"
    echo "  - meta-llama/llama-3.1-70b-instruct (Llama)"
    echo ""
    
    read -p "Enter your OpenRouter API key (starts with 'sk-or-v1-'): " API_KEY
    
    while [[ ! "$API_KEY" =~ ^sk-or-v1- ]]; do
        echo "Invalid format. OpenRouter keys should start with 'sk-or-v1-'"
        read -p "Enter your OpenRouter API key: " API_KEY
    done
    
    echo "✓ API key format valid"
    echo ""
else
    echo "✓ Using API key from .env file"
    echo ""
fi

# Check if models are already set
MAIN_MODEL="${env_vars[ANTHROPIC_MODEL]:-$ANTHROPIC_MODEL}"
SMALL_MODEL="${env_vars[ANTHROPIC_SMALL_FAST_MODEL]:-$ANTHROPIC_SMALL_FAST_MODEL}"

# Only prompt for models if not already set
if [ -z "$MAIN_MODEL" ]; then
    read -p "Enter main model name (or press Enter for qwen/qwen-2.5-coder-32b-instruct): " MAIN_MODEL
    
    if [ -z "$MAIN_MODEL" ]; then
        MAIN_MODEL="qwen/qwen-2.5-coder-32b-instruct"
        echo "Using default model: $MAIN_MODEL"
    fi
else
    echo "Using main model from .env: $MAIN_MODEL"
fi

# Prompt for Small/Fast Model (only if not set)
if [ -z "$SMALL_MODEL" ]; then
    echo ""
    read -p "Enter small/fast model (or press Enter for z-ai/glm-4.5-air): " SMALL_MODEL
    
    if [ -z "$SMALL_MODEL" ]; then
        SMALL_MODEL="z-ai/glm-4.5-air"
        echo "Using default small model: $SMALL_MODEL"
    fi
else
    echo "Using small model from .env: $SMALL_MODEL"
fi

# Set environment variables
echo ""
echo "Configuring environment..."
export ANTHROPIC_BASE_URL="http://localhost:8787"
export ANTHROPIC_AUTH_TOKEN="$API_KEY"
export ANTHROPIC_MODEL="$MAIN_MODEL"
export ANTHROPIC_SMALL_FAST_MODEL="$SMALL_MODEL"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"

echo ""
echo "Environment variables configured:"
echo "  - ANTHROPIC_BASE_URL: http://localhost:8787"
echo "  - ANTHROPIC_AUTH_TOKEN: (set)"
echo "  - ANTHROPIC_MODEL: $MAIN_MODEL"
echo "  - ANTHROPIC_SMALL_FAST_MODEL: $SMALL_MODEL"
echo "  - CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1"

# Launch Claude Code
echo ""
echo "Launching Claude Code..."
echo ""
echo "Tip: To stop proxy later, run: docker compose -f $SCRIPT_DIR/docker-compose.yml down"
echo ""

if ! command -v claude &> /dev/null; then
    echo ""
    echo "✗ Claude Code is not installed or not in PATH"
    echo ""
    echo "Please ensure Claude Code is installed."
    echo "Installation: https://claude.ai/download"
    echo ""
    
    echo "Stopping proxy service..."
    cd "$SCRIPT_DIR"
    docker compose down 2>/dev/null || true
    exit 1
fi

# Launch Claude Code
claude
