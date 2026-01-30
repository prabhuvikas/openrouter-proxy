# .env Configuration Guide

## Overview

The launcher scripts now support loading configuration from a `.env` file, eliminating the need to enter your API key and model preferences each time you run the launcher.

## Setup Instructions

### Step 1: Create Your .env File

Copy the example file:
```bash
cp .env.example .env
```

### Step 2: Edit .env with Your Credentials

Edit the `.env` file and add your actual values:

```ini
# Your OpenRouter API key (from https://openrouter.ai/keys)
ANTHROPIC_AUTH_TOKEN=sk-or-v1-your-actual-key-here

# Main model for most tasks
ANTHROPIC_MODEL=qwen/qwen-2.5-coder-32b-instruct

# Fast/small model for quick operations  
ANTHROPIC_SMALL_FAST_MODEL=z-ai/glm-4.5-air
```

### Step 3: Run the Launcher

Simply run the launcher - it will automatically load your `.env` file:

**Windows (PowerShell)**:
```powershell
.\launch-claude-openrouter.ps1
```

**Mac/Linux (Bash)**:
```bash
./launch-claude-openrouter.sh
```

The launcher will:
- ✅ Load your `.env` file
- ✅ Skip API key prompt (uses value from .env)
- ✅ Skip model prompts (uses values from .env)
- ✅ Start Docker proxy
- ✅ Launch Claude Code

## Environment Variables Recognized

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ANTHROPIC_AUTH_TOKEN` | Yes | None | Your OpenRouter API key |
| `ANTHROPIC_MODEL` | No | qwen/qwen-2.5-coder-32b-instruct | Main model to use |
| `ANTHROPIC_SMALL_FAST_MODEL` | No | z-ai/glm-4.5-air | Fast model for quick tasks |
| `ANTHROPIC_BASE_URL` | No | http://localhost:8787 | Proxy URL (auto-set) |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | No | 1 | Reduce traffic (auto-set) |

## How the Loader Works

### Priority Order

The launcher checks values in this order:
1. **`.env` file** (highest priority if file exists)
2. **Environment variables** (if already set in shell)
3. **Prompts** (if not found in above)
4. **Defaults** (if no input provided)

### Example Flows

#### With .env file (no prompts):
```
.env exists with ANTHROPIC_AUTH_TOKEN=sk-or-v1-xxx
  ↓
Launcher loads from .env
  ↓
Skips all prompts
  ↓
Launches Claude Code immediately
```

#### Without .env (with prompts):
```
.env doesn't exist or is empty
  ↓
Launcher shows available models
  ↓
Prompts for API key
  ↓
Prompts for main model
  ↓
Prompts for fast model
  ↓
Launches Claude Code
```

#### With pre-set environment variables:
```
ANTHROPIC_AUTH_TOKEN already set in shell
  ↓
Launcher detects it
  ↓
Skips API key prompt
  ↓
Uses environment variable value
```

## Use Cases

### Case 1: Single Machine Setup
Create `.env` once with your OpenRouter credentials. Run the launcher anytime - no prompts.

### Case 2: Multiple Developers
Each developer creates their own `.env` with their API key (don't commit .env to git).

### Case 3: Different Configurations
Create multiple env files:
- `.env.production` - for production models
- `.env.testing` - for cheaper test models
- `.env.quick` - for fast responses

Then manually load them:
```bash
# PowerShell
$env:ANTHROPIC_AUTH_TOKEN = (Get-Content .env.quick | Select-String "ANTHROPIC_AUTH_TOKEN").Line.Split("=")[1]
.\launch-claude-openrouter.ps1

# Bash
source .env.quick
./launch-claude-openrouter.sh
```

### Case 4: CI/CD Integration
Set environment variables in CI/CD and the launcher will skip all prompts:
```yaml
# GitHub Actions example
env:
  ANTHROPIC_AUTH_TOKEN: ${{ secrets.OPENROUTER_API_KEY }}
  ANTHROPIC_MODEL: qwen/qwen-2.5-coder-32b-instruct
```

## Security Notes

### .env File Best Practices

1. **Don't Commit .env to Git**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   ```

2. **Keep API Keys Secure**
   - Don't share `.env` files
   - Treat like passwords
   - Rotate keys if compromised

3. **File Permissions** (Linux/Mac)
   ```bash
   # Make .env readable only by owner
   chmod 600 .env
   ```

4. **Use .env.example for Templates**
   - `.env.example` is safe to commit (no real credentials)
   - Shows expected format for other developers

## Available Models

Common OpenRouter models to use:

**Coding Specialists**:
- `qwen/qwen-2.5-coder-32b-instruct` - Excellent for code
- `anthropic/claude-3.5-sonnet` - Versatile coding

**Fast/Budget**:
- `z-ai/glm-4.5-air` - Fast responses
- `anthropic/claude-3-haiku` - Very fast, cheap

**General Purpose**:
- `anthropic/claude-3.5-sonnet` - Best quality
- `gpt-4-turbo` - OpenAI model

**Specialized**:
- `mistral/mistral-large` - Mistral model
- `meta-llama/llama-3.1-70b-instruct` - Meta model

Find more at: https://openrouter.ai/models

## Troubleshooting

### Problem: Launcher Still Asking for API Key

**Causes**:
- `.env` file doesn't exist or has typos
- `ANTHROPIC_AUTH_TOKEN` not in `.env`
- Environment variable not set

**Fix**:
1. Check `.env` exists in launcher directory
2. Verify exact variable name: `ANTHROPIC_AUTH_TOKEN` (case-sensitive)
3. Verify API key format starts with `sk-or-v1-`
4. Check for extra spaces: `ANTHROPIC_AUTH_TOKEN = sk-or...` (wrong)

### Problem: Wrong Model Being Used

**Causes**:
- Variable name typo
- Model doesn't exist
- Different value in environment variable

**Fix**:
1. Check variable names match exactly
2. Verify model exists at https://openrouter.ai/models
3. Clear environment variables: `$env:ANTHROPIC_MODEL=""` (PowerShell)

### Problem: .env Not Being Loaded

**Causes**:
- Wrong file location
- Wrong file name (must be exactly `.env`)
- Encoding issues (should be UTF-8)

**Fix**:
1. Verify `.env` is in same directory as launcher script
2. Check file is named exactly `.env` (not `.env.txt` or `.env.local`)
3. Use UTF-8 encoding when editing

## For Shell Integration

### Set Environment Variables for Current Session

**PowerShell**:
```powershell
# Load .env temporarily for current session
$content = Get-Content .env -Raw
$content | ForEach-Object {
    if ($_ -match '^\s*([^=]+)=(.*)$') {
        $env:PSItem = $matches[2]
    }
}
```

**Bash**:
```bash
# Load .env temporarily for current session
export $(cat .env | xargs)
```

## Next Steps

1. Copy `.env.example` to `.env`
2. Add your OpenRouter API key
3. Run the launcher - enjoy prompt-free setup!

For more info: See [README.md](README.md)
