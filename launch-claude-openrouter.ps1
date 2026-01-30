# OpenRouter + Claude Code Launcher (with y-router)
# This script configures Claude Code to use OpenRouter API through y-router
# Requires: Docker, Docker Compose, and Claude Code CLI

Write-Host ""
Write-Host "=== Claude Code with OpenRouter (y-router) Launcher ===" -ForegroundColor Cyan
Write-Host "This script will configure Claude Code to use OpenRouter API" -ForegroundColor Gray
Write-Host ""

# Check if Docker is running and wait if needed
Write-Host "Checking Docker status..." -ForegroundColor Cyan

$dockerRunning = $false
$maxRetries = 30
$retryCount = 0
$waitTime = 2

while (-not $dockerRunning -and $retryCount -lt $maxRetries) {
    try {
        $dockerStatus = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dockerRunning = $true
            Write-Host "`u{2713} Docker is running" -ForegroundColor Green
        }
        else {
            $retryCount++
            if ($retryCount -eq 1) {
                Write-Host "Waiting for Docker to start..." -ForegroundColor Yellow
            }
            Write-Host "  Attempt $retryCount/$maxRetries..." -ForegroundColor Gray
            Start-Sleep -Seconds $waitTime
        }
    }
    catch {
        $retryCount++
        if ($retryCount -eq 1) {
            Write-Host "Waiting for Docker to start..." -ForegroundColor Yellow
        }
        Write-Host "  Attempt $retryCount/$maxRetries..." -ForegroundColor Gray
        Start-Sleep -Seconds $waitTime
    }
}

if (-not $dockerRunning) {
    Write-Host ""
    Write-Host "`u{2717} Docker is not running after waiting $($maxRetries * $waitTime) seconds" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix this:" -ForegroundColor Yellow
    Write-Host "  1. Open Docker Desktop application" -ForegroundColor White
    Write-Host "  2. Wait for Docker to fully start" -ForegroundColor White
    Write-Host "  3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
    exit 1
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if docker-compose.yml exists
if (-Not (Test-Path "$scriptDir/docker-compose.yml")) {
    Write-Host "`u{2717} docker-compose.yml not found in $scriptDir" -ForegroundColor Red
    Write-Host "Please ensure the file is in the same directory as this script." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Starting y-router proxy service..." -ForegroundColor Cyan
Write-Host "Building Docker image from y-router source (first run: 5-10 minutes)..." -ForegroundColor Gray

# Start proxy
Push-Location $scriptDir
try {
    $output = docker compose up -d 2>&1

    # Check if there was an error
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "`u{2717} Failed to start proxy service" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error details:" -ForegroundColor Yellow
        Write-Host $output -ForegroundColor Gray
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "  1. Check Docker is running and has internet access" -ForegroundColor White
        Write-Host "  2. Try building manually:" -ForegroundColor White
        Write-Host "     docker compose build --no-cache" -ForegroundColor Gray
        Write-Host "  3. Check Docker Desktop logs for details" -ForegroundColor White
        exit 1
    }

    Write-Host "`u{2713} Proxy service started successfully" -ForegroundColor Green
    Write-Host "Waiting for wrangler to initialize..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    Write-Host "`u{2713} Proxy service is ready on http://localhost:8787" -ForegroundColor Green
}
catch {
    Write-Host "`u{2717} Failed to start proxy service: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}

Write-Host ""

# Load .env file if it exists
$envFile = "$scriptDir\.env"
$envVars = @{}

if (Test-Path $envFile) {
    Write-Host "Loading configuration from .env file..." -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $envVars[$key] = $value
        }
    }
    Write-Host "`u{2713} .env file loaded" -ForegroundColor Green
    Write-Host ""
}

# Check if API key is already set (from .env or environment)
$apiKey = $envVars['ANTHROPIC_AUTH_TOKEN']
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    $apiKey = $env:ANTHROPIC_AUTH_TOKEN
}

# Only prompt for API key if not already set
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "Available OpenRouter Models:" -ForegroundColor Yellow
    Write-Host "  - qwen/qwen-2.5-coder-32b-instruct  (Coding specialist)" -ForegroundColor White
    Write-Host "  - anthropic/claude-3.5-sonnet        (General purpose)" -ForegroundColor White
    Write-Host "  - anthropic/claude-3-haiku           (Fast/cheap)" -ForegroundColor White
    Write-Host "  - gpt-4-turbo                        (OpenAI)" -ForegroundColor White
    Write-Host "  - mistral/mistral-large              (Mistral)" -ForegroundColor White
    Write-Host "  - meta-llama/llama-3.1-70b-instruct (Llama)" -ForegroundColor White
    Write-Host ""

    Write-Host "Enter your OpenRouter API key (starts with 'sk-or-v1-'):" -ForegroundColor Cyan
    $apiKey = Read-Host

    # Validate API key
    while ($apiKey -notmatch "^sk-or-v1-") {
        Write-Host "Invalid format. OpenRouter keys should start with 'sk-or-v1-'" -ForegroundColor Red
        $apiKey = Read-Host "Enter your OpenRouter API key"
    }

    Write-Host "`u{2713} API key format valid" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "`u{2713} Using API key from .env file" -ForegroundColor Green
    Write-Host ""
}

# Check if models are already set
$mainModel = $envVars['ANTHROPIC_MODEL']
if ([string]::IsNullOrWhiteSpace($mainModel)) {
    $mainModel = $env:ANTHROPIC_MODEL
}

$smallModel = $envVars['ANTHROPIC_SMALL_FAST_MODEL']
if ([string]::IsNullOrWhiteSpace($smallModel)) {
    $smallModel = $env:ANTHROPIC_SMALL_FAST_MODEL
}

# Only prompt for models if not already set
if ([string]::IsNullOrWhiteSpace($mainModel)) {
    Write-Host "Enter main model name (or press Enter for qwen/qwen-2.5-coder-32b-instruct):" -ForegroundColor Cyan
    $mainModel = Read-Host

    if ([string]::IsNullOrWhiteSpace($mainModel)) {
        $mainModel = "qwen/qwen-2.5-coder-32b-instruct"
        Write-Host "Using default model: $mainModel" -ForegroundColor Gray
    }
}
else {
    Write-Host "Using main model from .env: $mainModel" -ForegroundColor Gray
}

# Prompt for Small/Fast Model (only if not set)
if ([string]::IsNullOrWhiteSpace($smallModel)) {
    Write-Host ""
    Write-Host "Enter small/fast model (or press Enter for z-ai/glm-4.5-air):" -ForegroundColor Cyan
    $smallModel = Read-Host

    if ([string]::IsNullOrWhiteSpace($smallModel)) {
        $smallModel = "z-ai/glm-4.5-air"
        Write-Host "Using default small model: $smallModel" -ForegroundColor Gray
    }
}
else {
    Write-Host "Using small model from .env: $smallModel" -ForegroundColor Gray
}

# Set environment variables
Write-Host ""
Write-Host "Configuring environment..." -ForegroundColor Cyan
$env:ANTHROPIC_BASE_URL = "http://localhost:8787"
$env:ANTHROPIC_AUTH_TOKEN = $apiKey
$env:ANTHROPIC_MODEL = $mainModel
$env:ANTHROPIC_SMALL_FAST_MODEL = $smallModel
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"

Write-Host ""
Write-Host "Environment variables configured:" -ForegroundColor Green
Write-Host "  - ANTHROPIC_BASE_URL: http://localhost:8787" -ForegroundColor Gray
Write-Host "  - ANTHROPIC_AUTH_TOKEN: (set)" -ForegroundColor Gray
Write-Host "  - ANTHROPIC_MODEL: $mainModel" -ForegroundColor Gray
Write-Host "  - ANTHROPIC_SMALL_FAST_MODEL: $smallModel" -ForegroundColor Gray
Write-Host "  - CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1" -ForegroundColor Gray

# Prompt for working directory
Write-Host ""
Write-Host "Enter working directory for Claude Code (or press Enter for current directory):" -ForegroundColor Cyan
$workingDir = Read-Host

if ([string]::IsNullOrWhiteSpace($workingDir)) {
    $workingDir = Get-Location
    Write-Host "Using current directory: $workingDir" -ForegroundColor Gray
} elseif (-Not (Test-Path $workingDir -PathType Container)) {
    Write-Host "Directory does not exist: $workingDir" -ForegroundColor Red
    Write-Host "Using current directory instead." -ForegroundColor Yellow
    $workingDir = Get-Location
} else {
    Write-Host "Using directory: $workingDir" -ForegroundColor Gray
}

# Launch Claude Code
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Usage Dashboard Available:" -ForegroundColor Yellow
Write-Host "  http://localhost:8787/dashboard" -ForegroundColor White
Write-Host "  (or http://localhost:8787/dashboard?format=html for visual view)" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Launching Claude Code..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Tip: To stop proxy later, run: docker compose -f $scriptDir\docker-compose.yml down" -ForegroundColor Gray
Write-Host ""

try {
    Push-Location $workingDir
    & claude
}
catch {
    Write-Host ""
    Write-Host "Error launching Claude Code: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure Claude Code is installed and available in your PATH." -ForegroundColor Yellow
    Write-Host "Installation: https://claude.ai/download" -ForegroundColor Yellow

    # Offer to stop proxy
    Write-Host ""
    Write-Host "Stopping proxy service..." -ForegroundColor Yellow
    Push-Location $scriptDir
    docker compose down 2>$null | Out-Null
    Pop-Location
    exit 1
}
finally {
    Pop-Location
}
