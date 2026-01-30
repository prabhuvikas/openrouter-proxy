# OpenRouter Proxy for Claude Code

Use any OpenRouter model (Qwen, Llama, Mistral, etc.) with Claude Code.

## Architecture

```
Claude Code CLI → Local Proxy (localhost:8787) → OpenRouter API
```

The proxy converts Anthropic API format to OpenAI format, enabling Claude Code to work with any OpenRouter model.

## Quick Start

### 1. Prerequisites

- [Docker Desktop](https://docker.com)
- [Claude Code CLI](https://claude.ai/download)
- [OpenRouter API Key](https://openrouter.ai/keys)

### 2. Configure (Optional)

For prompt-free setup, create a `.env` file:

```bash
cp .env.example .env
# Edit .env with your API key
```

### 3. Launch

**Windows:**
```powershell
.\launch-claude-openrouter.ps1
```

**Mac/Linux:**
```bash
./launch-claude-openrouter.sh
```

## Documentation

| Guide | Description |
|-------|-------------|
| [Setup Guide](docs/setup.md) | Detailed installation instructions |
| [Configuration](docs/configuration.md) | Environment variables and .env setup |
| [Architecture](docs/architecture.md) | How the proxy works, agent/MCP support |
| [Model Guide](docs/models.md) | Choosing the right OpenRouter model |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and solutions |

## Stop the Proxy

```bash
docker compose down
```

## Links

- [OpenRouter Models](https://openrouter.ai/models)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [y-router](https://github.com/luohy15/y-router)
