# Changelog

All notable changes to this project are documented in this file.

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
