<p align="center">
  <img src="assets/banner.svg" alt="Planka MCP Server" width="100%">
</p>

# Planka MCP Server

[![npm version](https://img.shields.io/npm/v/@chmald/planka-mcp)](https://www.npmjs.com/package/@chmald/planka-mcp)
[![Docker Image Version](https://img.shields.io/docker/v/chmald/planka-mcp?sort=semver&label=Docker)](https://hub.docker.com/r/chmald/planka-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP server that enables AI assistants (Claude, VS Code Copilot, etc.) to interact with [Planka](https://planka.app/) - a real-time Kanban board application.

## About This Fork

This is a fork of [chmald/planka-mcp](https://github.com/chmald/planka-mcp) that adds:

- **Image uploads** — the `attachments` and `backgroundImages` tools can upload image bytes from a `url` (fetched server-side) or a `base64` string, sent to Planka as `multipart/form-data`. See [Image Uploads](#image-uploads).
- **Card cover images** — upload an image, then set it as a card's cover via `coverAttachmentId`.
- **Project background images** — upload and apply a custom project background via `backgroundImageId`.
- **Docker images on GHCR** — published to the GitHub Container Registry (`ghcr.io`) instead of Docker Hub.

See [CHANGELOG.md](CHANGELOG.md) for full details.

## Quick Start

### Prerequisites

- **Node.js 18+** or **Docker**
- **Planka instance** running and accessible
- **Planka user account** with appropriate permissions

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "planka": {
      "command": "npx",
      "args": ["@chmald/planka-mcp"],
      "env": {
        "PLANKA_BASE_URL": "http://localhost:3000",
        "PLANKA_API_KEY": "your-api-key"
      }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "planka": {
      "type": "stdio",
      "command": "npx",
      "args": ["@chmald/planka-mcp"],
      "env": {
        "PLANKA_BASE_URL": "http://localhost:3000",
        "PLANKA_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Docker

```json
{
  "mcpServers": {
    "planka": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "PLANKA_BASE_URL=http://host.docker.internal:3000",
        "-e", "PLANKA_API_KEY=your-api-key",
        "chmald/planka-mcp:latest"
      ]
    }
  }
}
```

> **Note:** Use `host.docker.internal` instead of `localhost` when running Docker.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PLANKA_BASE_URL` | Yes | `http://localhost:3000` | Your Planka instance URL |
| `PLANKA_API_KEY` | No* | - | Planka API key sent as `X-Api-Key` |
| `PLANKA_USERNAME` | No* | - | Planka username or email |
| `PLANKA_PASSWORD` | No* | - | Planka password |
| `MCP_TRANSPORT` | No | `stdio` | MCP transport mode: `stdio` or `sse` |
| `MCP_PORT` | No | `3001` | HTTP port used when `MCP_TRANSPORT=sse` |
| `PLANKA_HTTP_MAX_RETRIES` | No | `2` | Max retry attempts for transient HTTP/network failures per request |
| `PLANKA_HTTP_RETRY_BASE_DELAY_MS` | No | `250` | Base retry delay in milliseconds (exponential backoff) |
| `ENABLE_ALL_TOOLS` | No | `false` | Enable all 27 tools |
| `ENABLE_ADMIN_TOOLS` | No | `false` | Enable admin tools |
| `ENABLE_OPTIONAL_TOOLS` | No | `false` | Enable optional tools |

\* Authentication is required. Provide either `PLANKA_API_KEY`, or both `PLANKA_USERNAME` and `PLANKA_PASSWORD`.

### Authentication Modes

- **API key (recommended):** Set `PLANKA_API_KEY`.
- **Username/password:** Set `PLANKA_USERNAME` and `PLANKA_PASSWORD`.
- If both are set, the server uses `PLANKA_API_KEY`.

### Retry Behavior

- Retries apply to transient failures (`408`, `429`, `5xx`) and network request errors.
- Delay uses exponential backoff: `PLANKA_HTTP_RETRY_BASE_DELAY_MS * 2^attempt`.
- `PLANKA_HTTP_MAX_RETRIES` controls additional attempts after the initial request.

### Tool Categories

By default, **10 core tools** are enabled for essential Kanban operations:

| Category | Tools | Description |
|----------|-------|-------------|
| **Core** | 10 | Auth, projects, boards, lists, cards, tasks, comments, labels (always enabled) |
| **Optional** | 13 | Attachments, custom fields, notifications, etc. |
| **Admin** | 4 | User management, webhooks, config |

Enable more tools:
```json
"env": {
  "ENABLE_ALL_TOOLS": "true"
}
```

---

## Available Tools

Each tool uses an `action` parameter. Example: `{ "action": "list" }` or `{ "action": "get", "id": "123" }`

<details>
<summary><strong>Core Tools</strong> (always enabled)</summary>

| Tool | Actions |
|------|---------|
| `auth` | `login`, `logout`, `acceptTerms`, `oidcExchange`, `revokePending`, `getTerms` |
| `bootstrap` | `get` - Get app data, user info, projects |
| `projects` | `list`, `get`, `create`, `update`, `delete` |
| `boards` | `get`, `create`, `update`, `delete` |
| `lists` | `get`, `create`, `update`, `delete` |
| `cards` | `list`, `get`, `create`, `update`, `delete` |
| `comments` | `list`, `create` |
| `tasks` | `getList`, `createList`, `create`, `update` |
| `labels` | `create`, `update`, `delete`, `addToCard`, `removeFromCard` |
| `cardMembers` | `add`, `remove` |

</details>

<details>
<summary><strong>Admin Tools</strong> (ENABLE_ADMIN_TOOLS=true)</summary>

| Tool | Actions |
|------|---------|
| `config` | `get`, `update`, `testSmtp` |
| `users` | `list`, `create`, `update`, `delete`, `updateEmail`, `updatePassword`, etc. |
| `webhooks` | `list`, `create`, `update`, `delete` |
| `projectManagers` | `add`, `remove` |

</details>

<details>
<summary><strong>Optional Tools</strong> (ENABLE_OPTIONAL_TOOLS=true)</summary>

| Tool | Actions |
|------|---------|
| `attachments` | `create`, `update`, `delete` |
| `boardMembers` | `add`, `update`, `remove` |
| `customFields` | `createBaseGroup`, `createField`, `setValue`, etc. |
| `notifications` | `list`, `get`, `markRead`, `markAllRead`, `markCardRead`, `createUserService`, `createBoardService`, `updateService`, `deleteService`, `testService` |
| `actions` | `boardActions`, `cardActions` |
| `cardExtras` | `duplicate` |
| `commentExtras` | `update`, `delete` |
| `listExtras` | `clear`, `moveCards`, `sort` |
| `taskExtras` | `updateList`, `deleteList`, `deleteTask` |
| `labelExtras` | `update`, `delete`, `removeFromCard` |
| `cardMemberExtras` | `remove` |
| `backgroundImages` | `upload`, `delete` |
| `userInfo` | `get` |

</details>

---

## Image Uploads

The `attachments` and `backgroundImages` tools upload image bytes to Planka. Rather than sending raw bytes through the model, pass a **`url`** (downloaded by the server) or a small **`base64`** string — provide exactly one. These tools require `ENABLE_OPTIONAL_TOOLS=true`.

- **`url`** (recommended): the server fetches the image and uploads it to Planka, so no image data passes through the model. Must be `http(s)`; downloads are capped at 10 MB.
- **`base64`** (fallback): for tiny images only — capped at ~1 MB decoded. Accepts a bare base64 string or a `data:` URI.

### Attach an image to a card

`attachments` tool:

```json
{ "action": "create", "id": "<cardId>",
  "data": { "type": "file", "name": "diagram.png", "url": "https://files.example.com/diagram.png" } }
```

For a plain link (no upload), use `{ "type": "link", "url": "...", "name": "..." }` instead.

### Set a card's cover image (two steps)

1. Upload the image with `attachments` (above) and note the returned attachment `id`.
2. Point the card's cover at it with the `cards` tool:

```json
{ "action": "update", "id": "<cardId>", "data": { "coverAttachmentId": "<attachmentId>" } }
```

### Set a project background image (two steps)

1. Upload the background with the `backgroundImages` tool and note the returned `id`:

```json
{ "action": "upload", "id": "<projectId>", "data": { "url": "https://files.example.com/bg.jpg" } }
```

2. Apply it with the `projects` tool:

```json
{ "action": "update", "id": "<projectId>",
  "data": { "backgroundType": "image", "backgroundImageId": "<backgroundImageId>" } }
```

> Gradient backgrounds need no upload — use `projects` `update` with `{ "backgroundType": "gradient", "backgroundGradient": "<name>" }`.

---

## Multi-Client Mode (SSE)

For team deployments where multiple clients share one server:

```bash
docker run -d \
  --name planka-mcp \
  -p 3001:3001 \
  -e MCP_TRANSPORT=sse \
  -e PLANKA_BASE_URL=http://your-planka-server:3000 \
  -e PLANKA_API_KEY=your-api-key \
  chmald/planka-mcp:latest
```

Connect clients to `http://localhost:3001/sse`.

---

## Troubleshooting

### "Authentication failed"
- Verify your API key (or username/password) is correct
- Check that `PLANKA_BASE_URL` is accessible

### "Connection refused" with Docker
- Use `host.docker.internal` instead of `localhost`
- Ensure Planka is running

### npx fails
- Ensure Node.js 18+ is installed: `node --version`
- Try: `npm cache clean --force`

### Debug logs
```bash
npx @chmald/planka-mcp 2>&1 | tee debug.log
```

---

## Upgrade Notes

Check [CHANGELOG.md](CHANGELOG.md) for full version-by-version details.

### Upgrading to 2.1.0

- `attachments` and `backgroundImages` now upload image bytes from a `url` (fetched server-side) or `base64`. See [Image Uploads](#image-uploads). Requires `ENABLE_OPTIONAL_TOOLS=true`.

### Upgrading to 2.0.3

- The `auth` tool moved from optional tools to core tools and is now always available.
- API key authentication is now supported with `PLANKA_API_KEY` (`X-Api-Key`).
- If both API key and username/password are configured, `PLANKA_API_KEY` is used.

---

## Links

- [GitHub Issues](https://github.com/chmald/planka-mcp/issues) - Report bugs
- [Planka](https://planka.app/) - The Kanban board application
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development & publishing guide
- [CHANGELOG.md](CHANGELOG.md) - Versioned API and tooling updates
- [SECURITY.md](SECURITY.md) - Security policy

## License

MIT - see [LICENSE](LICENSE)
