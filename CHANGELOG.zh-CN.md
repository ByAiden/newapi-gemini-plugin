---
changelogVersion: 1
plugin: gemini
version: 1.0.0
locale: "zh-CN"
---

# Changelog

## [1.0.0]

### Added

- 用 Google AI Studio Key 提供 Gemini Omni Flash 视频生成（`gemini-omni-1.2-flash`、`gemini-omni-1.1-flash`），走 `POST /v1/videos` 和 `POST /v1/responses`：文生视频和图生视频，最多 6 张图，时长 3 到 15 秒，分辨率 `360p`、`720p`、`1080p` 或 `4k`。以 Gemini Interactions API 后台任务的方式执行，从 `GET /v1/videos/{task_id}/content` 下载。
- Gemini Omni 按 token 计费，价格字段为“输入 token 单价”、“文本输出 token 单价”和“视频输出 token 单价”，按请求的时长和分辨率预扣，按 Google 返回的用量结算。
- 支持 Gemini Decision 1（`gemini-decision-1`），走 Gemini API 官方路径 `POST /v1beta/decisions`：对文本、图片、音频、视频和 PDF 输入回答是非题（`noul`）、单选题（`choice`）和评分题（`score`），同一次调用直接返回 Google 的原始结果。
- Gemini Decision 按输入 token 计费，按请求大小预扣（带媒体时按 262,144 token 上下文窗口预扣），按 Google 返回的 `usage.total_input_tokens` 结算。
