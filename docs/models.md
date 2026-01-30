# Model Guide

Recommendations for choosing OpenRouter models to use with Claude Code.

## Quick Recommendations

| Use Case | Model | Notes |
|----------|-------|-------|
| **Coding (Best)** | `qwen/qwen-2.5-coder-32b-instruct` | Optimized for code |
| **Fast Tasks** | `z-ai/glm-4.5-air` | Very fast responses |
| **General Purpose** | `anthropic/claude-3.5-sonnet` | Versatile |
| **Budget** | `anthropic/claude-3-haiku` | Cheapest option |

## Default Configuration

The launcher uses these defaults if not specified:

```ini
ANTHROPIC_MODEL=qwen/qwen-2.5-coder-32b-instruct
ANTHROPIC_SMALL_FAST_MODEL=z-ai/glm-4.5-air
```

## Models by Category

### Coding Specialists

Best for writing, reviewing, and debugging code.

| Model | Strengths |
|-------|-----------|
| `qwen/qwen-2.5-coder-32b-instruct` | Excellent code generation, large context |
| `deepseek/deepseek-coder` | Strong coding, good at explanations |
| `codellama/codellama-70b-instruct` | Meta's code-focused model |

### Fast/Budget Models

Best for quick operations, initial drafts, or cost-sensitive use.

| Model | Strengths |
|-------|-----------|
| `z-ai/glm-4.5-air` | Very fast, good quality |
| `anthropic/claude-3-haiku` | Fast, cheapest Claude model |
| `google/gemini-flash-1.5` | Fast, good for simple tasks |

### General Purpose

Good all-around models for varied tasks.

| Model | Strengths |
|-------|-----------|
| `anthropic/claude-3.5-sonnet` | Excellent reasoning, versatile |
| `openai/gpt-4-turbo` | Strong capabilities, well-known |
| `google/gemini-pro-1.5` | Large context, multimodal |

### Large Context

Best when working with many files or long documents.

| Model | Context | Notes |
|-------|---------|-------|
| `anthropic/claude-3.5-sonnet` | 200K | High quality |
| `google/gemini-pro-1.5` | 1M | Largest context |
| `qwen/qwen-2.5-coder-32b-instruct` | 128K | Code-focused |

## Choosing a Model

### For Development Work

**Recommended:** `qwen/qwen-2.5-coder-32b-instruct`

- Excellent at code generation and refactoring
- Good understanding of programming patterns
- Large context window for multi-file projects

### For Quick Tasks

**Recommended:** `z-ai/glm-4.5-air`

- Very fast responses
- Good enough for simple edits
- Cost-effective for high-volume use

### For Complex Analysis

**Recommended:** `anthropic/claude-3.5-sonnet`

- Strong reasoning capabilities
- Good at understanding nuanced requirements
- Excellent for code review

## Model Pairing Strategy

Configure two models for different purposes:

```ini
# Main model for complex work
ANTHROPIC_MODEL=qwen/qwen-2.5-coder-32b-instruct

# Fast model for quick operations
ANTHROPIC_SMALL_FAST_MODEL=z-ai/glm-4.5-air
```

Claude Code uses:
- **Main model** for complex tasks, code generation, multi-file edits
- **Small/fast model** for quick completions, simple operations

## Checking Available Models

Browse all models at: https://openrouter.ai/models

Filter by:
- Capability (chat, code, etc.)
- Context length
- Pricing
- Speed

## Pricing Considerations

OpenRouter charges per token. Key factors:

1. **Input tokens** - Your prompts and context
2. **Output tokens** - Model responses
3. **Model pricing** - Varies significantly

Check pricing at: https://openrouter.ai/models

### Cost Optimization Tips

1. Use fast/cheap models for simple tasks
2. Be concise in prompts
3. Use appropriate context (don't send unnecessary files)
4. Monitor usage at https://openrouter.ai/activity

## Testing a New Model

1. Update your `.env`:
   ```ini
   ANTHROPIC_MODEL=new-model-id
   ```

2. Restart the launcher

3. Test with a simple task first

4. Check response quality and speed

## Model Compatibility Notes

Not all models support all features:

| Feature | Requirement |
|---------|-------------|
| Tool/function calling | Model must support functions |
| Streaming | Most models support this |
| System prompts | Most models support this |
| Long context | Check model's context limit |

The proxy handles format conversion, but the underlying model must support the feature.

## See Also

- [OpenRouter Models](https://openrouter.ai/models) - Full model list
- [Configuration Guide](configuration.md) - Setting up models
- [Architecture](architecture.md) - How the proxy works
