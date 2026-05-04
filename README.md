# OpenCode Memory (jsmjsm fork)

[![npm version](https://img.shields.io/npm/v/opencode-mem-jsmjsm.svg)](https://www.npmjs.com/package/opencode-mem-jsmjsm)
[![npm downloads](https://img.shields.io/npm/dm/opencode-mem-jsmjsm.svg)](https://www.npmjs.com/package/opencode-mem-jsmjsm)
[![license](https://img.shields.io/npm/l/opencode-mem-jsmjsm.svg)](https://www.npmjs.com/package/opencode-mem-jsmjsm)

![OpenCode Memory Banner](.github/banner.png)

A persistent memory system for AI coding agents that enables long-term context retention across sessions using local vector database technology.

> **Why this fork?**
> Upstream `opencode-mem@2.13.0` on npm predates the embedding-engine migration from `@xenova/transformers` to `@huggingface/transformers` (upstream PR [#90](https://github.com/tickernelz/opencode-mem/pull/90), commit [`40508eb`](https://github.com/tickernelz/opencode-mem/commit/40508eb)). The unreleased upstream `main` carries the fix, but no `v2.13.1` tag has been cut, so npm's `latest` still installs the broken `sharp`-dependent code on Apple Silicon and other M-series Macs.
>
> This fork republishes the same merged-but-unreleased code as **`opencode-mem-jsmjsm@2.13.1`** so opencode users can install the working build today via the standard `<name>@latest` install path. When upstream cuts an official `2.13.1+` release on npm, switch back to `opencode-mem@latest` and stop using this fork.

## Visual Overview

**Project Memory Timeline:**

![Project Memory Timeline](.github/screenshot-project-memory.png)

**User Profile Viewer:**

![User Profile Viewer](.github/screenshot-user-profile.png)

## Core Features

Local vector database with SQLite + USearch-first vector indexing and ExactScan fallback, persistent project memories, automatic user profile learning, unified memory-prompt timeline, full-featured web UI, intelligent prompt-based memory extraction, multi-provider AI support (OpenAI, Anthropic), 12+ local embedding models, smart deduplication, and built-in privacy protection.

## Prerequisites

This plugin uses `USearch` for preferred in-memory vector indexing with automatic ExactScan fallback. No custom SQLite build or browser runtime shim is required.

**Recommended runtime:**

- Bun
- Standard OpenCode plugin environment

**Notes:**

- If `USearch` is unavailable or fails at runtime, the plugin automatically falls back to exact vector scanning.
- SQLite remains the source of truth; search indexes are rebuilt from SQLite data when needed.

## Getting Started

Add to your OpenCode configuration at `~/.config/opencode/opencode.json`:

```jsonc
{
  "plugin": ["opencode-mem-jsmjsm@latest"],
}
```

The plugin downloads automatically on next startup.

> **Do not** use `opencode-mem@git+https://github.com/jsmjsm/opencode-mem.git` — opencode has a shim-writer bug that produces a deps-only install (no plugin source) for git+https URLs of this package. Use the npm name `opencode-mem-jsmjsm@latest` above.

If you previously installed via git+https, clean the stale cache once:

```bash
rm -rf ~/.cache/opencode/packages/opencode-mem*
# then quit and restart opencode
```

## Usage Examples

```typescript
memory({ mode: "add", content: "Project uses microservices architecture" });
memory({ mode: "search", query: "architecture decisions" });
memory({ mode: "search", query: "architecture decisions", scope: "all-projects" });
memory({ mode: "profile" });
memory({ mode: "list", limit: 10 });
```

Access the web interface at `http://127.0.0.1:4747` for visual memory browsing and management.

## Configuration Essentials

Configure at `~/.config/opencode/opencode-mem.jsonc`:

```jsonc
{
  "storagePath": "~/.opencode-mem/data",
  "userEmailOverride": "user@example.com",
  "userNameOverride": "John Doe",
  "embeddingModel": "Xenova/nomic-embed-text-v1",
  "memory": {
    "defaultScope": "project",
  },
  "webServerEnabled": true,
  "webServerPort": 4747,

  "autoCaptureEnabled": true,
  "autoCaptureLanguage": "auto",

  "opencodeProvider": "anthropic",
  "opencodeModel": "claude-haiku-4-5-20251001",

  "showAutoCaptureToasts": true,
  "showUserProfileToasts": true,
  "showErrorToasts": true,

  "userProfileAnalysisInterval": 10,
  "maxMemories": 10,

  "compaction": {
    "enabled": true,
    "memoryLimit": 10,
  },
  "chatMessage": {
    "enabled": true,
    "maxMemories": 3,
    "excludeCurrentSession": true,
    "maxAgeDays": undefined,
    "injectOn": "first",
  },
}
```

### Memory Scope

- `scope: "project"`: query only the current project. This is the default.
- `scope: "all-projects"`: query `search` / `list` across all project shards.
- `memory.defaultScope` sets the default query scope when no explicit scope is provided.

### Auto-Capture AI Provider

**Recommended:** Use opencode's built-in providers (no separate API key needed):

```jsonc
"opencodeProvider": "anthropic",
"opencodeModel": "claude-haiku-4-5-20251001",
```

This leverages your existing opencode authentication (OAuth or API key). Works with Claude Pro/Max plans via OAuth - no individual API keys required.

Supported providers: `anthropic`, `openai`

**Fallback:** Manual API configuration (if not using opencodeProvider):

```jsonc
"memoryProvider": "openai-chat",
"memoryModel": "gpt-4o-mini",
"memoryApiUrl": "https://api.openai.com/v1",
"memoryApiKey": "sk-...",
```

**API Key Formats:**

```jsonc
"memoryApiKey": "sk-..."
"memoryApiKey": "file://~/.config/opencode/api-key.txt"
"memoryApiKey": "env://OPENAI_API_KEY"
```

Full documentation available in this README.

## Development & Contribution

Build and test locally:

```bash
bun install
bun run build
bun run typecheck
bun run format
```

This project is actively seeking contributions to become the definitive memory plugin for AI coding agents. Whether you are fixing bugs, adding features, improving documentation, or expanding embedding model support, your contributions are critical. The codebase is well-structured and ready for enhancement. If you hit a blocker or have improvement ideas, submit a pull request - we review and merge contributions quickly.

## License & Links

MIT License - see LICENSE file

- **This fork**: https://github.com/jsmjsm/opencode-mem
- **npm package**: https://www.npmjs.com/package/opencode-mem-jsmjsm
- **Upstream repository**: https://github.com/tickernelz/opencode-mem
- **Upstream issues**: https://github.com/tickernelz/opencode-mem/issues (file there for general bugs)
- **Fork-specific issues**: https://github.com/jsmjsm/opencode-mem/issues (publish/install problems specific to this republished version)
- **OpenCode Platform**: https://opencode.ai

Inspired by [opencode-supermemory](https://github.com/supermemoryai/opencode-supermemory).
All credit to [@tickernelz](https://github.com/tickernelz) and upstream contributors for the actual plugin code; this fork only republishes their merged-but-unreleased fixes to npm.
