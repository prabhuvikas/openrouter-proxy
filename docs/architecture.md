# Architecture

This document explains how the OpenRouter proxy works and its support for Claude Code agents and MCP.

## Overview

The proxy acts as a bridge between Claude Code (which uses Anthropic's API format) and OpenRouter (which uses OpenAI's API format).

```
Claude Code CLI → Local Proxy (localhost:8787) → OpenRouter API (openrouter.ai)
     │                    │                              │
     │ Anthropic format   │ Format conversion            │ OpenAI format
     └────────────────────┴──────────────────────────────┘
```

## How It Works

1. Claude Code sends requests in Anthropic API format
2. The proxy converts requests to OpenAI format
3. Requests are forwarded to OpenRouter
4. Responses are converted back to Anthropic format
5. Claude Code receives responses it understands

## Format Conversion

### System Prompts

Anthropic format uses a top-level `system` field:

```json
{
  "system": "You are a helpful assistant...",
  "messages": [...]
}
```

OpenAI format uses a system message:

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant..." },
    ...
  ]
}
```

### Tool Definitions

Anthropic tools use `input_schema`:

```json
{
  "tools": [{
    "name": "get_weather",
    "description": "Get weather info",
    "input_schema": { "type": "object", "properties": {...} }
  }]
}
```

OpenAI functions use `parameters`:

```json
{
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "Get weather info",
      "parameters": { "type": "object", "properties": {...} }
    }
  }]
}
```

### Tool Calls and Results

The proxy handles the full tool execution loop:

1. Model returns `tool_calls` (OpenAI) → converted to `tool_use` (Anthropic)
2. Claude Code executes tools
3. Tool results sent as `tool_result` (Anthropic) → converted to tool message (OpenAI)
4. Loop continues until model completes

## Agent & MCP Support

The proxy fully supports Claude Code's agent capabilities and MCP (Model Context Protocol).

### Supported Features

| Feature | Status | Notes |
|---------|--------|-------|
| System prompts | Supported | Converted to system message |
| Tool definitions | Supported | Converted to functions format |
| Tool choice | Supported | Passed through for agent control |
| Multi-turn tool loops | Supported | Full conversation history maintained |
| Tool result metadata | Supported | Error flags preserved |
| Streaming | Supported | Both streaming and non-streaming |
| Stop sequences | Supported | Converted to `stop` parameter |

### Agent Loop Flow

```
1. Claude Code sends request with tools
2. Proxy converts to OpenAI format
3. OpenRouter returns tool_calls
4. Proxy converts to tool_use format
5. Claude Code executes tools
6. Claude Code sends tool_results
7. Proxy converts for OpenRouter
8. Loop continues...
```

### Request Parameters

| Anthropic | OpenAI | Conversion |
|-----------|--------|------------|
| `system` | `messages[0]` | Becomes first message |
| `messages` | `messages` | With content conversion |
| `tools` | `tools` | Schema renamed |
| `tool_choice` | `tool_choice` | Passed through |
| `max_tokens` | `max_tokens` | Preserved |
| `temperature` | `temperature` | Preserved |
| `top_p` | `top_p` | Preserved |
| `stop_sequences` | `stop` | Renamed |
| `stream` | `stream` | Preserved |

### Response Parameters

| OpenAI | Anthropic | Conversion |
|--------|-----------|------------|
| `choices[0].message.content` | `content[].text` | Text blocks |
| `choices[0].message.tool_calls` | `content[].tool_use` | Tool blocks |
| `choices[0].finish_reason` | `stop_reason` | Mapped values |
| `usage` | `usage` | Preserved |
| `id` | `id` | Preserved |
| `model` | `model` | Preserved |

## Docker Container

The proxy runs in a Docker container:

- **Base image**: Node.js 22 (Bookworm Slim)
- **Port**: 8787
- **Health check**: `/health` endpoint
- **Logs**: `docker logs y-router`

### Container Architecture

```
┌─────────────────────────────────────┐
│        y-router container           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Express.js Server       │   │
│  │                             │   │
│  │  /v1/messages → convert →   │   │
│  │              → forward →    │   │
│  │              → convert →    │   │
│  │              → respond      │   │
│  │                             │   │
│  │  /health → OK               │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
              ↓
       Port 8787 exposed
              ↓
┌─────────────────────────────────────┐
│         Claude Code CLI             │
│    (ANTHROPIC_BASE_URL=:8787)       │
└─────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `Dockerfile.y-router` | Contains full proxy server code |
| `docker-compose.yml` | Docker service configuration |
| `launch-claude-openrouter.ps1` | Windows launcher |
| `launch-claude-openrouter.sh` | Mac/Linux launcher |

## Debugging

### View Proxy Logs

```bash
docker logs y-router -f
```

The proxy logs:
- System prompt presence
- Number and names of tools
- Tool call conversions
- Error details

### Test Requests

See `tests/fixtures/agent-request.json` for example agent requests.

## References

- [y-router GitHub](https://github.com/luohy15/y-router)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)
