---
layout: default
title: Configuration
---

# Configuration Guide

This guide explains how to configure the OpenRouter proxy using environment variables and `.env` files.

## Quick Setup

1. Copy the template: `cp .env.example .env`
2. Edit `.env` with your API key
3. Run the launcher

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ANTHROPIC_AUTH_TOKEN` | Yes | - | Your OpenRouter API key |
| `ANTHROPIC_MODEL` | No | `qwen/qwen-2.5-coder-32b-instruct` | Main model for most tasks |
| `ANTHROPIC_SMALL_FAST_MODEL` | No | `z-ai/glm-4.5-air` | Fast model for quick operations |
| `ANTHROPIC_BASE_URL` | No | `http://localhost:8787` | Proxy URL (auto-set by launcher) |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | No | `1` | Reduce network traffic (auto-set) |

## Retry and Fallback Configuration

The proxy supports automatic retries with exponential backoff and model fallback when the primary model fails or is rate-limited.

| Variable | Default | Purpose |
|----------|---------|---------|
| `PROXY_MODEL_FALLBACK` | `z-ai/glm-4.5-air` | Fallback model when primary fails |
| `PROXY_MAX_RETRIES` | `3` | Max retry attempts per model |
| `PROXY_RETRY_DELAY_MS` | `1000` | Initial retry delay in ms (doubles each retry) |
| `PROXY_FALLBACK_ON_RATE_LIMIT` | `true` | Immediately switch to fallback on 429 |

### Retry Behavior

1. Request fails with primary model
2. Retry with exponential backoff (1s, 2s, 4s...)
3. After max retries, switch to fallback model
4. Retry fallback model with same backoff
5. Return error if all attempts fail

### Rate Limit Handling

When OpenRouter returns HTTP 429 (rate limit):

- If `PROXY_FALLBACK_ON_RATE_LIMIT=true`: Immediately switch to fallback model
- If `PROXY_FALLBACK_ON_RATE_LIMIT=false`: Retry with backoff, then fallback

The proxy respects the `Retry-After` header if provided by OpenRouter.

### Example Configuration

```ini
# Use a fast model as fallback
PROXY_MODEL_FALLBACK=z-ai/glm-4.5-air

# Retry 2 times before switching to fallback
PROXY_MAX_RETRIES=2

# Start with 500ms delay
PROXY_RETRY_DELAY_MS=500

# Don't immediately fallback on rate limit, retry first
PROXY_FALLBACK_ON_RATE_LIMIT=false
```

## .env File Format

Create a `.env` file in the project root:

```ini
# Your OpenRouter API key (from https://openrouter.ai/keys)
ANTHROPIC_AUTH_TOKEN=sk-or-v1-your-actual-key-here

# Main model for most tasks
ANTHROPIC_MODEL=qwen/qwen-2.5-coder-32b-instruct

# Fast/small model for quick operations
ANTHROPIC_SMALL_FAST_MODEL=z-ai/glm-4.5-air
```

## Configuration Priority

The launcher checks values in this order:

1. **`.env` file** - Highest priority if file exists
2. **Environment variables** - If already set in shell
3. **User prompts** - If not found in above
4. **Defaults** - If no input provided

## Usage Examples

### Single Machine Setup

Create `.env` once with your credentials. Run the launcher anytime without prompts.

### Multiple Configurations

Create multiple env files for different scenarios:

```bash
.env.production   # For production models
.env.testing      # For cheaper test models
.env.fast         # For speed-optimized models
```

Load a specific configuration:

**PowerShell:**
```powershell
$env:ANTHROPIC_AUTH_TOKEN = (Get-Content .env.fast | Select-String "ANTHROPIC_AUTH_TOKEN").Line.Split("=")[1]
.\launch-claude-openrouter.ps1
```

**Bash:**
```bash
source .env.fast
./launch-claude-openrouter.sh
```

### CI/CD Integration

Set environment variables in your CI/CD system:

```yaml
# GitHub Actions example
env:
  ANTHROPIC_AUTH_TOKEN: ${{ secrets.OPENROUTER_API_KEY }}
  ANTHROPIC_MODEL: qwen/qwen-2.5-coder-32b-instruct
```

## Security Best Practices

### 1. Never Commit .env to Git

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

### 2. Secure File Permissions (Linux/Mac)

```bash
chmod 600 .env
```

### 3. Use .env.example for Templates

The `.env.example` file is safe to commit (no real credentials). It shows the expected format for other developers.

### 4. API Key Safety

- Treat `.env` files like passwords
- Don't share API keys
- Rotate keys if compromised
- Get keys from https://openrouter.ai/keys

## Troubleshooting

### Launcher Still Prompting for API Key

Check that:
- `.env` file exists in the launcher directory
- Variable name is exact: `ANTHROPIC_AUTH_TOKEN` (case-sensitive)
- API key format starts with `sk-or-v1-`
- No extra spaces: `ANTHROPIC_AUTH_TOKEN=sk-or...` (correct) vs `ANTHROPIC_AUTH_TOKEN = sk-or...` (wrong)

### Wrong Model Being Used

Check that:
- Variable names match exactly
- Model exists at https://openrouter.ai/models
- You saved the `.env` file after editing
- Clear conflicting env vars: `$env:ANTHROPIC_MODEL=""` (PowerShell)

### .env Not Being Loaded

Check that:
- File is named exactly `.env` (not `.env.txt`)
- File is in the same directory as the launcher
- File uses UTF-8 encoding

## See Also

- [Model Guide](models.md) - Choosing the right model
- [Setup Guide](setup.md) - Installation instructions
