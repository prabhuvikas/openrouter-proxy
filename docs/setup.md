---
layout: default
title: Setup Guide
---

# Setup Guide

This guide covers installing and configuring the OpenRouter proxy for Claude Code.

## Prerequisites

Before starting, ensure you have:

1. **Docker Desktop** - Download from https://www.docker.com/products/docker-desktop
2. **Claude Code CLI** - Download from https://claude.ai/download
3. **OpenRouter API Key** - Get from https://openrouter.ai/keys

## Installation

### Option 1: Using Launcher Scripts (Recommended)

The launcher scripts handle everything automatically.

**Windows (PowerShell):**
```powershell
.\launch-claude-openrouter.ps1
```

**Mac/Linux (Bash):**
```bash
chmod +x launch-claude-openrouter.sh
./launch-claude-openrouter.sh
```

The script will:
- Check if Docker is running (waits up to 60 seconds if starting)
- Build and start the y-router proxy
- Prompt for your OpenRouter API key (if not configured)
- Prompt for model selection (if not configured)
- Launch Claude Code

### Option 2: Using .env File (Skip Prompts)

For a prompt-free experience, configure a `.env` file first.

1. **Copy the template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env with your settings:**
   ```ini
   ANTHROPIC_AUTH_TOKEN=sk-or-v1-your-api-key-here
   ANTHROPIC_MODEL=qwen/qwen-2.5-coder-32b-instruct
   ANTHROPIC_SMALL_FAST_MODEL=z-ai/glm-4.5-air
   ```

3. **Run the launcher** - it will use your .env automatically:
   ```powershell
   .\launch-claude-openrouter.ps1
   ```

See [configuration.md](configuration.md) for detailed .env options.

### Option 3: Manual Setup

If you prefer manual control:

1. **Start the proxy:**
   ```bash
   docker compose up -d
   ```

2. **Verify it's running:**
   ```bash
   curl http://localhost:8787/health
   ```

3. **Set environment variables:**

   **Windows (PowerShell):**
   ```powershell
   $env:ANTHROPIC_BASE_URL = "http://localhost:8787"
   $env:ANTHROPIC_AUTH_TOKEN = "sk-or-v1-YOUR_API_KEY_HERE"
   $env:ANTHROPIC_MODEL = "qwen/qwen-2.5-coder-32b-instruct"
   $env:ANTHROPIC_SMALL_FAST_MODEL = "z-ai/glm-4.5-air"
   ```

   **Mac/Linux (Bash):**
   ```bash
   export ANTHROPIC_BASE_URL="http://localhost:8787"
   export ANTHROPIC_AUTH_TOKEN="sk-or-v1-YOUR_API_KEY_HERE"
   export ANTHROPIC_MODEL="qwen/qwen-2.5-coder-32b-instruct"
   export ANTHROPIC_SMALL_FAST_MODEL="z-ai/glm-4.5-air"
   ```

4. **Launch Claude Code:**
   ```bash
   claude
   ```

## Verifying Your Setup

After installation, verify everything works:

```bash
# Check proxy is running
docker ps | grep y-router

# Check proxy health
curl http://localhost:8787/health

# View proxy logs
docker logs y-router
```

## Stopping the Proxy

```bash
docker compose down
```

## Rebuilding After Updates

If you've updated the proxy code:

```bash
# Clean rebuild
docker compose build --no-cache

# Restart
docker compose up -d
```

## Next Steps

- [Configuration Guide](configuration.md) - Environment variables and .env setup
- [Model Guide](models.md) - Choosing the right OpenRouter model
- [Troubleshooting](troubleshooting.md) - Common issues and solutions
