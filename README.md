# OpenRouter + Claude Code Integration

Use any OpenRouter model (including Qwen, Llama, Mistral, etc.) with Claude Code.

## Quick Start

### Option 1: Using Launcher (Recommended)

#### Windows (PowerShell)
```powershell
.\launch-claude-openrouter.ps1
```

#### Mac/Linux (Bash)
```bash
chmod +x launch-claude-openrouter.sh
./launch-claude-openrouter.sh
```

### Option 2: Using .env File (Skip Prompts)

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and add your OpenRouter API key:
```
ANTHROPIC_AUTH_TOKEN=sk-or-v1-YOUR_API_KEY_HERE
ANTHROPIC_MODEL=qwen/qwen-2.5-coder-32b-instruct
ANTHROPIC_SMALL_FAST_MODEL=z-ai/glm-4.5-air
```

3. Run the launcher - it will skip prompts and use values from `.env`:
```powershell
.\launch-claude-openrouter.ps1  # Windows
# or
./launch-claude-openrouter.sh   # Mac/Linux
```

### Option 3: Manual Setup

```bash
docker compose up -d
export ANTHROPIC_BASE_URL="http://localhost:8787"
export ANTHROPIC_AUTH_TOKEN="sk-or-v1-YOUR_KEY"
export ANTHROPIC_MODEL="qwen/qwen-2.5-coder-32b-instruct"
claude
```

## What You Need

- ✅ Docker Desktop (https://docker.com)
- ✅ Claude Code CLI (https://claude.ai/download)
- ✅ OpenRouter API Key (https://openrouter.ai/keys)

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Docker setup for y-router |
| `launch-claude-openrouter.ps1` | PowerShell launcher (Windows) |
| `launch-claude-openrouter.sh` | Bash launcher (Mac/Linux) |
| `.env.example` | Environment variables template |
| `.env` | Your configuration (copy from .env.example, auto-loaded by launcher) |
| `setup.md` | Detailed setup guide |
| `README.md` | This file |

## Usage Example

```powershell
# Windows - run the launcher
.\launch-claude-openrouter.ps1

# When prompted:
# - Enter your OpenRouter API key (sk-or-v1-...)
# - Choose your model: qwen/qwen-2.5-coder-32b-instruct
# - Claude Code launches with Qwen 2.5 Coder
```

## Configuration with .env File

To avoid prompts and use pre-configured settings:

1. **Copy the template**:
```bash
cp .env.example .env
```

2. **Edit .env with your settings**:
```
ANTHROPIC_AUTH_TOKEN=sk-or-v1-your-api-key-here
ANTHROPIC_MODEL=qwen/qwen-2.5-coder-32b-instruct
ANTHROPIC_SMALL_FAST_MODEL=z-ai/glm-4.5-air
```

3. **Run the launcher** - it will automatically load your .env file and skip prompts:
```powershell
.\launch-claude-openrouter.ps1
```

**Benefits**:
- No more prompts for API key or models
- Easy to switch between configurations (just edit .env)
- Safe storage of credentials in a local .env file
- Can commit different configurations per environment

## How It Works

The launcher script automatically:
1. Detects if Docker is running
2. Waits up to 60 seconds for Docker to start (if not already running)
3. Starts y-router service
4. Configures Claude Code environment variables
5. Launches Claude Code

## Troubleshooting

**Build failed?**
```powershell
# Clean and rebuild
docker image rm y-router:latest 2>$null
docker builder prune -a -f
docker compose build --no-cache

# Then run the launcher again
.\launch-claude-openrouter.ps1
```

**Proxy won't start?**
```powershell
# Check container logs
docker logs y-router

# Restart
docker compose restart

# Check if port 8787 is already in use
netstat -an | findstr 8787
```

**Script waiting for Docker?**
- The script automatically waits up to 60 seconds for Docker to start
- Simply open Docker Desktop if it's not already running
- The script will detect when Docker is ready and continue

**Docker still not detected after waiting?**
```powershell
# Start Docker Desktop from Applications (Windows/Mac)
# Or start Docker daemon (Linux)
# Then run the script again
```

**API key format error?**
- Must start with `sk-or-v1-`
- Get it from https://openrouter.ai/keys

**Model not found?**
- Check spelling
- Verify model exists at https://openrouter.ai/models
- Confirm your API key has credits

## Stop y-router

```bash
docker compose down
```

## More Info

- Full setup guide: `setup.md`
- y-router project: https://github.com/luohy15/y-router
- OpenRouter docs: https://openrouter.ai/docs
