# Claude Code + OpenRouter Setup Guide

This folder contains everything needed to run Claude Code with any OpenRouter model (including Qwen).

## Architecture

```
Claude Code → Proxy Server (Local) → OpenRouter API
```

The local proxy server forwards requests from Claude Code to OpenRouter API. It:
- Listens on `http://localhost:8787`
- Forwards all requests to `https://openrouter.ai/api/v1`
- Preserves headers and authentication
- Provides a health check endpoint

## Prerequisites

1. **Docker Desktop** - Download from https://www.docker.com/products/docker-desktop
2. **Claude Code CLI** - Download from https://claude.ai/download
3. **OpenRouter API Key** - Get from https://openrouter.ai/keys

## Quick Start

### Option 1: Use the PowerShell Script (Windows)

```powershell
# Navigate to this directory
cd openrouter

# Run the launcher script
.\launch-claude-openrouter.ps1
```

The script will:
- Check Docker service is running (waits up to 60 seconds if starting)
- Start y-router in Docker
- Prompt for your OpenRouter API key
- Prompt for model selection
- Launch Claude Code

**Note:** If Docker is not running, the script will wait up to 60 seconds for it to start automatically. Open Docker Desktop to trigger startup.

### Option 2: Manual Setup

#### Step 1: Start y-router

```bash
cd openrouter
docker compose up -d
```

**First run:** The script will build the Docker image from source (this takes a few minutes). Subsequent runs will be faster.

Verify it's running:
```bash
docker ps | grep y-router
```

You should see the y-router container running on port 8787.

Check if y-router is healthy:
```bash
curl http://localhost:8787/health
```

You should get a 200 response.

#### Step 2: Set Environment Variables

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

#### Step 3: Launch Claude Code

```bash
claude
```

## Available Models

### For Coding (Recommended)
- `qwen/qwen-2.5-coder-32b-instruct` - Best for code
- `anthropic/claude-3.5-sonnet` - Strong general purpose
- `deepseek/deepseek-coder` - Coding specialist

### For General Use
- `anthropic/claude-3.5-sonnet`
- `anthropic/claude-3-haiku` - Fast, cheap
- `gpt-4-turbo` - OpenAI model
- `mistral/mistral-large` - Mistral

### For Speed/Cost
- `z-ai/glm-4.5-air` - Very fast
- `anthropic/claude-3-haiku`

For a complete list: https://openrouter.ai/models

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `ANTHROPIC_BASE_URL` | y-router endpoint | `http://localhost:8787` |
| `ANTHROPIC_AUTH_TOKEN` | OpenRouter API key | `sk-or-v1-...` |
| `ANTHROPIC_MODEL` | Main model to use | `qwen/qwen-2.5-coder-32b-instruct` |
| `ANTHROPIC_SMALL_FAST_MODEL` | Fast model for quick tasks | `z-ai/glm-4.5-air` |

## Troubleshooting

### Docker image pull error: "repository does not exist"
This is normal on first run. The script builds y-router from source.

```bash
# Build the image manually if needed
docker compose build --no-cache

# Then start the service
docker compose up -d
```

If it fails with network issues:
```bash
# Check Docker has internet access
docker run --rm curlimages/curl curl https://openrouter.ai

# Try building again
docker compose build --no-cache
```

### y-router won't start
```bash
# Check Docker is running
docker ps

# View detailed logs
docker logs y-router

# Check if port 8787 is already in use
netstat -an | grep 8787

# Restart
docker compose restart
```

### "Connection refused" error
Make sure y-router is running:
```bash
docker compose ps
```

If it's not running, start it:
```bash
docker compose up -d
```

### Claude Code won't launch
1. Verify Claude Code is installed: `claude --version`
2. Check API key is valid (should start with `sk-or-v1-`)
3. Verify environment variables are set

### Model not found (404)
This typically means:
- API key is invalid
- Model name is misspelled
- Model is not available on OpenRouter

Check available models at: https://openrouter.ai/models

## Stopping y-router

```bash
# Stop the container
docker compose down
```

## Advanced: Using .env File

Create a `.env` file in this folder:

```env
ANTHROPIC_BASE_URL=http://localhost:8787
ANTHROPIC_AUTH_TOKEN=sk-or-v1-YOUR_KEY_HERE
ANTHROPIC_MODEL=qwen/qwen-2.5-coder-32b-instruct
ANTHROPIC_SMALL_FAST_MODEL=z-ai/glm-4.5-air
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
```

Then in PowerShell:
```powershell
# Load from .env file
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^=]+)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}
```

## Monitoring

### Check y-router logs
```bash
docker logs y-router -f
```

### Monitor OpenRouter usage
Visit your OpenRouter Activity Dashboard: https://openrouter.ai/activity

## Security Notes

- Never commit `.env` files with real API keys to git
- Your API key is stored locally - keep it secure
- y-router runs locally, requests are routed through your machine

## References

- y-router GitHub: https://github.com/luohy15/y-router
- OpenRouter Docs: https://openrouter.ai/docs
- Claude Code Integration Guide: https://ishan.rs/posts/claude-code-with-openrouter
