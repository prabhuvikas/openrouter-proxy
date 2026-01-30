---
layout: default
title: OpenRouter Proxy
---

# OpenRouter Proxy

**Use any OpenRouter model with Claude Code CLI**

OpenRouter Proxy is a local API bridge that enables Claude Code to work with any model available on [OpenRouter](https://openrouter.ai), including Qwen, Llama, Mistral, GPT-4, and more.

---

## How It Works

```
Claude Code CLI → Local Proxy (localhost:8787) → OpenRouter API
     │                    │                           │
     │ Anthropic format   │ Format conversion         │ OpenAI format
     └────────────────────┴───────────────────────────┘
```

The proxy translates between Anthropic's API format (used by Claude Code) and OpenAI's format (used by OpenRouter), enabling seamless compatibility.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Model Support** | Use any OpenRouter model with Claude Code |
| **Full Tool Support** | Agent capabilities and MCP tools work seamlessly |
| **Streaming** | Real-time streaming responses |
| **Auto-Retry** | Automatic retry with exponential backoff |
| **Model Fallback** | Switch to backup model on rate limits |
| **Usage Dashboard** | Real-time statistics at `/dashboard` |

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/prabhuvikas/openrouter-proxy.git
cd openrouter-proxy
```

### 2. Configure your API key

```bash
cp .env.example .env
# Edit .env and add your OpenRouter API key
```

### 3. Start the proxy

```bash
docker compose up -d
```

### 4. Launch Claude Code

**Windows:**
```powershell
.\launch-claude-openrouter.ps1
```

**Mac/Linux:**
```bash
./launch-claude-openrouter.sh
```

---

## Recommended Models

| Model | Best For | Cost |
|-------|----------|------|
| `qwen/qwen-2.5-coder-32b-instruct` | Coding tasks | Free |
| `anthropic/claude-3.5-sonnet` | General purpose | Paid |
| `meta-llama/llama-3.1-70b-instruct` | Open source | Free |
| `google/gemini-pro` | Versatile | Free tier |
| `mistral/mistral-large` | European AI | Paid |

[View all models →](https://openrouter.ai/models)

---

## Usage Dashboard

Monitor your proxy usage in real-time:

- **JSON:** `http://localhost:8787/dashboard`
- **Visual:** `http://localhost:8787/dashboard?format=html`

Track requests, tokens, errors, and per-model statistics.

---

## Documentation

- [Setup Guide](docs/setup) - Detailed installation instructions
- [Configuration](docs/configuration) - Environment variables reference
- [Architecture](docs/architecture) - How the proxy works
- [Troubleshooting](docs/troubleshooting) - Common issues and solutions
- [Model Guide](docs/models) - OpenRouter model recommendations

---

## Requirements

- Docker and Docker Compose
- Claude Code CLI ([install](https://claude.ai/download))
- OpenRouter API key ([get one](https://openrouter.ai/keys))

---

## Links

- [GitHub Repository](https://github.com/prabhuvikas/openrouter-proxy)
- [OpenRouter](https://openrouter.ai)
- [Claude Code](https://claude.ai/download)

---

<p align="center">
  <sub>Built with Claude Code</sub>
</p>
