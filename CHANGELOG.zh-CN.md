---
changelogVersion: 1
plugin: byaiden_gemini
version: 2.1.0
locale: "zh-CN"
---

# Changelog

## [2.1.0]

### Added

- 渠道设置「上游类型」：Gemini 官方 API（默认，行为不变）或 OpenAI 兼容中转。中转渠道的 Base URL 填中转根地址，Key 以 `Authorization: Bearer` 发送；Gemini 原生 `generateContent` 和 `streamGenerateContent`、OpenAI Chat Completions、OpenAI Responses 与 Claude Messages 发往中转的 `/v1/chat/completions`，回复和流转换回 Gemini 格式，并按中转返回的用量计费；Gemini `embedContent`、`batchEmbedContents` 与 OpenAI 向量发往 `/v1/embeddings`，生图发往 `/v1/images/generations`，获取模型列表读取中转的 `/v1/models`。
- 中转渠道上，Gemini Omni、Gemini Decision 以及中转协议无法承载的 Gemini 功能（Google 搜索和代码执行工具、经 `generateContent` 输出图像或音频、缓存内容、Files API 引用）会被拒绝并给出提示，不计费。

### Changed

- Gemini 原生、向量、Chat Completions 和 Responses 路由现在经过插件的请求钩子；在 Gemini 官方 API 渠道上钩子把 new-api 构造的请求原样发出，回复、流和计费仍由 new-api 自带的 Gemini 处理完成。
