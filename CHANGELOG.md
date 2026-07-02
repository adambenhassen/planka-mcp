# Changelog

All notable changes to this project are documented in this file.

## [2.2.2] - 2026-07-03

### Removed
- base64 image uploads. `attachments.create`, `backgroundImages.upload`, and `users.updateAvatar` no longer accept a `base64` field — pass a `url` (fetched server-side, http(s) only, capped at 10 MB). base64 payloads were LLM-emitted, expensive, and capped at ~1 MB anyway.

## [2.2.1] - 2026-07-02

### Changed
- `cards.list` pagination cursor is now a nested `before` object (`{ id, listChangedAt }`) instead of bracket-keyed string params; bracket property names could be rejected by MCP clients that bridge to function-calling APIs with strict key patterns. The query serializer flattens one level of objects to the `before[id]=…` syntax Planka expects, which also removes the `[object Object]` failure when a nested object was passed.
- Upload form shape is now declared per operation (`upload: 'attachment' | 'file'`) instead of inferred from the tool name, so future upload operations can't silently inherit the wrong multipart shape.

## [2.2.0] - 2026-07-02

### Fixed
- Tool descriptions audited field-by-field against `swagger.json` and corrected across all 27 tools. Required fields the API enforces are now stated (`projects.create` `type`, `lists.create` `type`/`position`, `cards.create` `type`, `boards.create` `position`, task/task-list `position`, `users.create` `email`/`password`/`name`/`role`, `webhooks.create` `name`/`url`, custom-field `position`/`name`, `setValue` `content`), update-only fields are scoped (`defaultView`/`defaultCardType`, `isFavorite`/`isHidden`, `assigneeUserId`, list `color`), and wrong claims removed (webhook `isActive` doesn't exist; `events`/`excludedEvents` are comma-separated strings, not arrays; user role enum is `admin`/`projectOwner`/`boardUser`).
- `users.updateAvatar` now sends `multipart/form-data` (was JSON, which Planka rejects) and accepts `url`/`base64` like other uploads.
- Path parameters provided in `data` now take precedence over the `id` fallback, fixing `customFields.setValue`/`clearValue` and `cardMembers.remove`, which previously built URLs with the same ID in every path segment.
- Enum values documented for list `color` and project `backgroundGradient`; card move semantics documented (`position` required with a new `listId`, `boardId` for cross-board moves).

### Added
- Pagination cursors `before[id]`/`before[listChangedAt]` on `cards.list`.
- Test guards: swagger-required body fields must appear in tool data descriptions; `users.updateAvatar` upload flag asserted.

## [2.1.1] - 2026-06-17

### Changed
- Updated dependencies: `undici` 7 → 8, `typescript` 5 → 6, `cross-env` 7 → 10, and `@types/node` to 25.9.x. Build and full test suite pass on the new majors.
- CI: bumped `actions/checkout` and `actions/setup-node` to v5.

### Added
- Dependabot configuration (`.github/dependabot.yml`) for weekly npm, GitHub Actions, and Docker updates.

## [2.1.0] - 2026-06-14

### Added
- Image uploads for the `attachments` and `backgroundImages` tools: pass a `url` (downloaded by the server) or a small `base64` string (provide exactly one), and the server uploads the bytes to Planka as `multipart/form-data`. URLs must be `http(s)` and are capped at 10 MB; base64 is capped at ~1 MB decoded and also accepts `data:` URIs.
- Card cover images: upload an image with `attachments` `create` (`type: 'file'`), then set it via `cards` `update` with `coverAttachmentId`.
- Project background images: upload with `backgroundImages` `upload`, then apply via `projects` `update` (`backgroundType: 'image'`, `backgroundImageId`). Both `coverAttachmentId` and `backgroundImageId` are now documented in their tool schemas.

## [2.0.4] - 2026-03-11

### Changed
- Updated GitHub Actions workflow to use Node.js 24 for building and publishing, ensuring compatibility with latest features and security updates. This change is reflected in the `docker-publish.yml` workflow file.
- Updated Dockerfile to use Node.js 24 for both build and production stages, aligning with the updated GitHub Actions workflow.


## [2.0.3] - 2026-03-10

### Added
- Support for API key authentication via `PLANKA_API_KEY` (`X-Api-Key` header), based on updated `swagger.json` security schemes.
- Versioned changelog to track API/schema-aligned server changes.

### Changed
- Moved `auth` tool from optional tools to core tools so authentication operations are available by default.
- Updated docs and examples to cover both API key and username/password authentication modes.

## [2.0.2] - Previous

### Changed
- Grouped tools architecture introduced with configurable core/admin/optional categories.
