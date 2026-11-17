---
changelogVersion: 1
plugin: byaiden_gemini
version: 1.2.0
locale: "zh-CN"
---

# Changelog

## [1.2.0]

### Added

- Gemini Omni 支持经由另一个 New API 网关调用。在 New API 渠道（类型 60）上，视频请求发往该网关的 `POST /v1/videos`（令牌作 Bearer 密钥），在 `GET /v1/videos/{id}` 查询，从 `GET /v1/videos/{id}/content` 下载。Gemini Decision 仍走该网关的 `/byaiden_gemini/v1beta/decisions`。
- 完成的 Gemini Omni 视频对象（`GET /v1/videos/{task_id}`）带上 `usage`，含计费用的 `input_tokens`、`output_tokens` 和 `video_tokens`，前面一层网关据此按相同用量结算。
