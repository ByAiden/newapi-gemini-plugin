---
changelogVersion: 1
plugin: byaiden_gemini
version: 2.0.0
locale: "zh-CN"
---

# Changelog

## [2.0.0]

### Added

- 同一渠道支持 Gemini API 文本：Gemini 原生 `generateContent` 和 `streamGenerateContent`、OpenAI Chat Completions、OpenAI Responses 和 Claude Messages，均支持流式。Gemini 原生请求、Chat Completions 和 Responses 使用 new-api 自带的 Gemini 转换和计费；Claude Messages 由插件转换，按 Gemini 返回的用量计费。
- 向量：Gemini 原生 `embedContent` 和 `batchEmbedContents`，以及经 `batchEmbedContents` 实现的 OpenAI `POST /v1/embeddings`（文本）。
- `POST /v1/images/generations` 生成图像，使用 Gemini 图像模型（`gemini-nano-banana-2.1`、`gemini-3.1-flash-image`、`gemini-3.1-flash-lite-image`、`gemini-3-pro-image`、`gemini-2.5-flash-image`），按输入、输出和图像输出 token 计费。
- 获取模型列表：`GET /v1/models` 读取 Gemini API 模型列表的全部分页，保留渠道能服务的模型，并加上 Gemini Omni 和 Gemini Decision。
- 渠道设置：API 版本（`v1beta`、`v1`、`v1alpha`），以及同时以 `?key=` 发送密钥。
- 模型列表加入 Gemini 文本、向量和图像模型，README 提供可直接粘贴的价格表达式。

### Changed

- 插件改名为 Gemini（Gemini API）。Gemini Omni 和 Gemini Decision 与 1.2.0 相同，也可经由另一个 New API 网关使用。

### Migration

- 启用 2.0.0 后已有渠道照常工作。要在这些渠道售卖文本、向量和图像模型，添加模型（获取模型列表）并设置价格。在渠道表单中选择插件会替换该渠道的模型列表，把已有渠道改用本插件前请先复制「模型」字段。
