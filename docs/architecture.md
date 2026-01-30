---
layout: default
title: Architecture
---

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

## Retry and Fallback

The proxy includes automatic retry logic with exponential backoff and model fallback support.

### Retry Flow

```
Request with Primary Model
         ↓
      Success? ──────────────────→ Return response
         ↓ No
      Rate Limit (429)?
         ↓ Yes                         ↓ No
   Fallback on 429 enabled?      Retry with backoff
         ↓ Yes        ↓ No              ↓
   Switch to       Retry with      Max retries?
   Fallback        backoff              ↓ Yes
         ↓              ↓          Switch to Fallback
         └──────────────┴──────────────┘
                        ↓
              Retry Fallback Model
                        ↓
                   Success? → Return response
                        ↓ No
                   Max retries? → Return error
```

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `PROXY_MODEL_FALLBACK` | `z-ai/glm-4.5-air` | Fallback model |
| `PROXY_MAX_RETRIES` | `3` | Retries per model |
| `PROXY_RETRY_DELAY_MS` | `1000` | Initial delay (doubles each retry) |
| `PROXY_FALLBACK_ON_RATE_LIMIT` | `true` | Skip retries on 429 |

### Response Headers

The proxy adds an `X-Model-Used` header to indicate which model served the request. This is useful for debugging when fallback occurs.

### Logging

When retry/fallback occurs, the proxy logs:
- Each retry attempt with model name
- Rate limit detection
- Model switches
- Final success or failure

Example log output:
```
Trying model: qwen/qwen-2.5-coder-32b-instruct (attempt 1/3)
Attempt 1/3 failed: rate_limit
Rate limited (429), switching to fallback model: z-ai/glm-4.5-air
Trying model: z-ai/glm-4.5-air (attempt 1/3)
Success with model: z-ai/glm-4.5-air
```

## Usage Dashboard

The proxy includes a real-time usage dashboard at `/dashboard`.

### Accessing the Dashboard

**JSON format (default):**
```bash
curl http://localhost:8787/dashboard
```

**HTML format (visual dashboard):**
```bash
# Open in browser
http://localhost:8787/dashboard?format=html
```

### Dashboard Metrics

| Category | Metrics |
|----------|---------|
| Requests | Total, streaming, non-streaming, with tools |
| Tokens | Total, input, output |
| Models | Per-model request and token counts |
| Errors | Total, rate limits (429), API errors, network errors, error rate |
| Session | Uptime, last request timestamp, fallback count |

### Example Response

```json
{
  "status": "ok",
  "uptime": "2h 15m 30s",
  "lastRequest": "2026-01-30T10:30:00.000Z",
  "requests": {
    "total": 150,
    "streaming": 120,
    "nonStreaming": 30,
    "withTools": 85
  },
  "tokens": {
    "total": 125000,
    "input": 75000,
    "output": 50000
  },
  "models": {
    "qwen/qwen-2.5-coder-32b-instruct": {
      "requests": 140,
      "inputTokens": 70000,
      "outputTokens": 47000
    }
  },
  "errors": {
    "total": 5,
    "rateLimits": 3,
    "apiErrors": 2,
    "networkErrors": 0,
    "rate": "3.33%"
  },
  "fallbacks": 8
}
```

### Notes

- Statistics are stored in-memory and reset when the proxy restarts
- The HTML dashboard auto-refreshes every 10 seconds
- Token counts are only available for non-streaming responses

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
│  │  /health    → OK            │   │
│  │  /dashboard → stats         │   │
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
