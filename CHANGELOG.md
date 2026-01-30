# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- Restructured documentation into `docs/` folder
- Moved test files to `tests/` folder
- Streamlined README.md with links to detailed docs

### Added
- `docs/setup.md` - Detailed installation guide
- `docs/configuration.md` - Environment variable reference
- `docs/architecture.md` - Proxy internals and agent/MCP support
- `docs/troubleshooting.md` - Common issues and solutions
- `docs/models.md` - OpenRouter model recommendations
- `tests/fixtures/` folder for test data

### Removed
- `LATEST_UPDATES.md` (replaced by CHANGELOG.md)
- `ENV_CONFIGURATION_GUIDE.md` (merged into docs/configuration.md)
- `AGENT_MCP_SUPPORT.md` (merged into docs/architecture.md)

## [1.0.0] - 2026-01-30

### Added
- `.env` file support for configuration
  - Launcher scripts load `.env` automatically
  - Skip prompts when values are pre-configured
  - Priority: .env file > environment variables > prompts > defaults
- `.env.example` template file
- Working directory support in launcher scripts
- Full agent and MCP (Model Context Protocol) support
  - System prompt handling
  - Tool/function definition conversion
  - Multi-turn tool execution loops
  - Tool result metadata preservation
  - Streaming support

### Changed
- Launcher scripts now wait up to 60 seconds for Docker to start
- Improved error handling and logging in proxy

### Fixed
- Working directory no longer passed as chat message
- Tool argument parsing handles edge cases
