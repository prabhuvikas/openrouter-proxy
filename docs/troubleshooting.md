# Troubleshooting

Common issues and solutions for the OpenRouter proxy.

## Docker Issues

### Docker Not Running

**Symptoms:**
- "Cannot connect to Docker daemon"
- Launcher waits for Docker but times out

**Solutions:**
1. Open Docker Desktop application
2. Wait for it to fully start (watch the system tray icon)
3. The launcher will auto-detect when Docker is ready (up to 60 seconds)

**Linux:**
```bash
# Start Docker daemon
sudo systemctl start docker

# Check status
sudo systemctl status docker
```

### Container Won't Start

**Symptoms:**
- `docker compose up` fails
- Container exits immediately

**Solutions:**

1. Check container logs:
   ```bash
   docker logs y-router
   ```

2. Check if port is in use:
   ```bash
   # Windows
   netstat -an | findstr 8787

   # Mac/Linux
   netstat -an | grep 8787
   ```

3. Free the port or use a different one in docker-compose.yml

### Build Failed

**Symptoms:**
- "repository does not exist" error
- Network issues during build

**Solutions:**

1. Clean rebuild:
   ```bash
   docker image rm y-router:latest
   docker builder prune -a -f
   docker compose build --no-cache
   ```

2. Check Docker has internet access:
   ```bash
   docker run --rm curlimages/curl curl https://openrouter.ai
   ```

## Connection Issues

### "Connection Refused" Error

**Symptoms:**
- Claude Code can't reach the proxy
- `curl http://localhost:8787/health` fails

**Solutions:**

1. Verify container is running:
   ```bash
   docker ps | grep y-router
   ```

2. Start if not running:
   ```bash
   docker compose up -d
   ```

3. Check proxy health:
   ```bash
   curl http://localhost:8787/health
   ```

### Proxy Timeout

**Symptoms:**
- Requests hang for a long time
- Eventually timeout errors

**Solutions:**

1. Check OpenRouter status: https://status.openrouter.ai
2. Try a different/faster model
3. Restart the proxy:
   ```bash
   docker compose restart
   ```

## API Key Issues

### Invalid API Key

**Symptoms:**
- 401 Unauthorized errors
- "Invalid API key" messages

**Solutions:**

1. Verify key format starts with `sk-or-v1-`
2. Get a new key from https://openrouter.ai/keys
3. Check for typos or extra whitespace in `.env`

### API Key Not Loading from .env

**Symptoms:**
- Launcher still prompts for API key
- Wrong key being used

**Solutions:**

1. Check file exists and is named exactly `.env`
2. Verify variable name: `ANTHROPIC_AUTH_TOKEN` (case-sensitive)
3. No spaces around `=`: `ANTHROPIC_AUTH_TOKEN=sk-or...`
4. Use UTF-8 encoding

## Model Issues

### Model Not Found (404)

**Symptoms:**
- "Model not found" errors
- 404 responses

**Solutions:**

1. Check model spelling exactly matches OpenRouter's ID
2. Verify model at https://openrouter.ai/models
3. Some models require credits - check your balance

### Wrong Model Being Used

**Symptoms:**
- Different model responding than expected
- Performance doesn't match model capabilities

**Solutions:**

1. Check `ANTHROPIC_MODEL` in `.env`
2. Clear shell environment:
   ```powershell
   # PowerShell
   $env:ANTHROPIC_MODEL=""
   ```
   ```bash
   # Bash
   unset ANTHROPIC_MODEL
   ```
3. Verify `.env` was saved after editing

## Response Issues

### Incomplete or Truncated Responses

**Symptoms:**
- Responses cut off mid-sentence
- Agent loops stop unexpectedly

**Solutions:**

1. Increase `max_tokens` in your requests
2. Check for rate limits on OpenRouter
3. Try a different model

### Tool Calls Not Working

**Symptoms:**
- Tools not being called
- Tool results not being processed

**Solutions:**

1. Check proxy logs for conversion errors:
   ```bash
   docker logs y-router -f
   ```
2. Verify model supports function calling
3. See [architecture.md](architecture.md) for supported features

## Launcher Issues

### Script Execution Blocked (Windows)

**Symptoms:**
- "Running scripts is disabled on this system"
- PowerShell security error

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Permission Denied (Mac/Linux)

**Symptoms:**
- "Permission denied" when running launcher
- Script not executable

**Solution:**
```bash
chmod +x launch-claude-openrouter.sh
```

## Getting Help

### Collect Diagnostic Information

Before asking for help, gather:

1. **Proxy logs:**
   ```bash
   docker logs y-router > proxy-logs.txt
   ```

2. **Docker status:**
   ```bash
   docker ps -a
   docker compose ps
   ```

3. **Environment check:**
   ```bash
   echo $ANTHROPIC_BASE_URL
   echo $ANTHROPIC_MODEL
   ```

4. **Health check:**
   ```bash
   curl -v http://localhost:8787/health
   ```

### Resources

- [y-router GitHub](https://github.com/luohy15/y-router) - Report proxy issues
- [OpenRouter Docs](https://openrouter.ai/docs) - API documentation
- [OpenRouter Status](https://status.openrouter.ai) - Service status
