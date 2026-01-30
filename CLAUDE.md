# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenRouter Proxy enables Claude Code to use any OpenRouter model by acting as a local API bridge that translates Anthropic API format to OpenAI format (which OpenRouter uses).

**Architecture:**
```
Claude Code CLI → Local Proxy (http://localhost:8787) → OpenRouter API (https://openrouter.ai/api/v1)
```

## Quick Start

**Start the proxy:**
```bash
docker compose up -d
```

**Launch Claude Code with proxy (Windows):**
```powershell
.\launch-claude-openrouter.ps1
```

**Launch Claude Code with proxy (Mac/Linux):**
```bash
./launch-claude-openrouter.sh
```

## Project Structure

```
openrouter-proxy/
├── README.md                    # Quick start and overview
├── CLAUDE.md                    # This file - Claude Code guidelines
├── CHANGELOG.md                 # Version history
├── .env.example                 # Configuration template
│
├── docs/                        # Documentation
│   ├── setup.md                 # Detailed installation guide
│   ├── configuration.md         # Environment variables reference
│   ├── architecture.md          # How the proxy works
│   ├── troubleshooting.md       # Common issues and solutions
│   └── models.md                # OpenRouter model recommendations
│
├── tests/                       # Test files
│   ├── test-conversion.js       # Format conversion tests
│   ├── test-integration.js      # API integration tests
│   ├── test-mcp-tools.js        # MCP/tools support tests
│   └── fixtures/
│       └── agent-request.json   # Sample agent request
│
├── Dockerfile.y-router          # Proxy server (Express.js)
├── docker-compose.yml           # Docker service definition
├── launch-claude-openrouter.ps1 # Windows launcher
└── launch-claude-openrouter.sh  # Mac/Linux launcher
```

## Key Files

| File | Purpose |
|------|---------|
| `Dockerfile.y-router` | Contains full proxy server (Express.js) with format conversion logic |
| `docker-compose.yml` | Docker service definition (port 8787, y-router container) |
| `launch-claude-openrouter.ps1` | Windows launcher - handles Docker, env vars, launches Claude |
| `launch-claude-openrouter.sh` | Mac/Linux launcher - same as PowerShell version |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_BASE_URL` | Set to `http://localhost:8787` by launcher |
| `ANTHROPIC_AUTH_TOKEN` | Your OpenRouter API key (`sk-or-v1-*`) |
| `ANTHROPIC_MODEL` | Main model (default: `qwen/qwen-2.5-coder-32b-instruct`) |
| `ANTHROPIC_SMALL_FAST_MODEL` | Fast model (default: `z-ai/glm-4.5-air`) |

Configure via `.env` file or environment variables. See `docs/configuration.md`.

## Format Conversion (in Dockerfile.y-router)

The proxy handles:
- System prompts → OpenAI system messages
- Tool definitions (Anthropic) → Function definitions (OpenAI)
- Tool use/results → Function calls/results
- Multi-turn agent interactions with tool execution loops

## Testing

```bash
# Test proxy health
curl http://localhost:8787/health

# Run unit tests
node tests/test-conversion.js

# Run integration tests (requires OPENROUTER_API_KEY)
OPENROUTER_API_KEY=sk-or-v1-... node tests/test-integration.js

# View proxy logs
docker logs y-router
```

## Debugging

1. **Proxy not responding:** Check `docker ps` for y-router container
2. **API key issues:** Must start with `sk-or-v1-`
3. **Model errors:** Verify model name matches OpenRouter's model IDs
4. **Agent/tool issues:** Check proxy logs for conversion errors

See `docs/troubleshooting.md` for more details.
