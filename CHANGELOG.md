---
changelogVersion: 1
plugin: byaiden_gemini
version: 1.2.0
locale: "en"
translations:
  zh-CN: CHANGELOG.zh-CN.md
---

# Changelog

## [1.2.0]

### Added

- Gemini Omni works through another New API gateway. On a New API channel (type 60), video requests go to that gateway's `POST /v1/videos` with the token as a Bearer key, are polled at `GET /v1/videos/{id}`, and download from `GET /v1/videos/{id}/content`. Gemini Decision keeps using `/byaiden_gemini/v1beta/decisions` there.
- A finished Gemini Omni video object (`GET /v1/videos/{task_id}`) now carries `usage` with the billed `input_tokens`, `output_tokens` and `video_tokens`, so a gateway in front settles on the same usage.
