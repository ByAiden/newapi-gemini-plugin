---
changelogVersion: 1
plugin: byaiden_gemini
version: 2.0.0
locale: "en"
translations:
  zh-CN: CHANGELOG.zh-CN.md
---

# Changelog

## [2.0.0]

### Added

- Gemini API text on the same channel: Gemini native `generateContent` and `streamGenerateContent`, OpenAI Chat Completions, OpenAI Responses and Claude Messages, streaming included. Gemini native requests, Chat Completions and Responses use new-api's own Gemini conversion and billing; Claude Messages are converted by the plugin and billed on the usage Gemini reports.
- Embeddings: Gemini native `embedContent` and `batchEmbedContents`, and OpenAI `POST /v1/embeddings` (text) through `batchEmbedContents`.
- Image generation on `POST /v1/images/generations` with the Gemini image models (`gemini-nano-banana-2.1`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`, `gemini-3-pro-image`, `gemini-2.5-flash-image`), billed on input, output and image output tokens.
- Fetch models: `GET /v1/models` reads every page of the Gemini API model list and keeps the models the channel serves, plus Gemini Omni and Gemini Decision.
- Channel settings: API version (`v1beta`, `v1`, `v1alpha`) and sending the key as `?key=` as well.
- Gemini text, embedding and image models in the model list, with ready-to-paste price expressions in the README.

### Changed

- The plugin is now named Gemini (Gemini API). Gemini Omni and Gemini Decision work as in 1.2.0, through another New API gateway too.

### Migration

- Existing channels keep working after you activate 2.0.0. To sell text, embedding and image models on them, add the models (Fetch models) and set their prices. Picking the plugin in a channel form replaces that channel's model list, so copy the Models field first when you move an existing channel to this plugin.
