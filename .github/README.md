# GitHub Configuration Files

This directory contains GitHub-specific configuration files and Copilot instructions.

## Copilot Instructions

### Active Instructions
- **[copilot-instructions.md](./copilot-instructions.md)** - Main Copilot instructions for the project
  - Use this as the primary reference for AI coding agents
  - Contains project overview, architecture, workflows, and agent guidance
  - References the reorganized documentation structure

### Supplementary Instructions
- **[frontend-copilot-instructions.md](./frontend-copilot-instructions.md)** - Supplementary frontend information
  - Quick reference for frontend-specific patterns
  - Points to comprehensive frontend documentation in `docs/frontend/`

### Historical/Archived Instructions
- **[instructions.md](./instructions.md)** - **DEPRECATED** - Old Untitled UI instructions
- **[authentication-integration-instructions.md](./authentication-integration-instructions.md)** - **HISTORICAL** - Auth integration from commit `606cbca`
- **[TANSTACK_MIGRATION.md](./TANSTACK_MIGRATION.md)** - **HISTORICAL** - TanStack Router migration

> **Note**: Historical files may be moved to `docs/development/archived/` in the future.

## Documentation Structure

Following the reorganization in PR #47, documentation is now organized by area:

- **[docs/frontend/](../docs/frontend/)** - Frontend-specific documentation
- **[docs/backend/](../docs/backend/)** - Backend-specific documentation  
- **[docs/development/](../docs/development/)** - Development resources
  - **[agent-resources/](../docs/development/agent-resources/)** - Agent prompts and handoffs

See [docs/index.md](../docs/index.md) for complete documentation catalog.

## Workflow Configuration

Other files in this directory:
- **[dependabot.yml](./dependabot.yml)** - Dependency update configuration
- **[labeler.yml](./labeler.yml)** - Automatic PR labeling
- **[workflows/](./workflows/)** - GitHub Actions workflows
- **[ISSUE_TEMPLATE/](./ISSUE_TEMPLATE/)** - Issue templates
- **[DISCUSSION_TEMPLATE/](./DISCUSSION_TEMPLATE/)** - Discussion templates

## For AI Agents

If you're an AI agent working on this project:
1. Start with [copilot-instructions.md](./copilot-instructions.md)
2. Review [docs/index.md](../docs/index.md) for navigation
3. Use prompt templates in [docs/development/agent-resources/prompts/](../docs/development/agent-resources/prompts/)
4. Check handoffs in [docs/development/agent-resources/handoffs/](../docs/development/agent-resources/handoffs/)

**Key principle**: Make minimal, surgical changes. Test early and often.
