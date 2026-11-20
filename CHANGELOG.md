---
changelogVersion: 1
plugin: byaiden_gemini
version: 2.1.0
locale: "en"
translations:
  zh-CN: CHANGELOG.zh-CN.md
---

# Changelog

## [2.1.0]

### Added

- Channel setting Upstream type: Gemini API (the default, unchanged) or OpenAI-compatible relay. On a relay channel the Base URL is the relay's root and its key is sent as `Authorization: Bearer`; Gemini native `generateContent` and `streamGenerateContent`, OpenAI Chat Completions, OpenAI Responses and Claude Messages go to the relay's `/v1/chat/completions`, with Gemini replies and streams converted back and billed on the relay's usage; Gemini `embedContent` and `batchEmbedContents` and OpenAI embeddings go to `/v1/embeddings`, image generation to `/v1/images/generations`, and Fetch models reads the relay's `/v1/models`.
- On a relay channel, Gemini Omni, Gemini Decision and Gemini features the relay protocol cannot carry (Google Search and code execution tools, image or audio output through `generateContent`, cached content, Files API references) are refused with a message and not billed.

### Changed

- The Gemini native, embedding, Chat Completions and Responses routes now pass through the plugin's request hook, which on Gemini API channels sends new-api's request on unchanged; replies, streams and billing are still new-api's own Gemini handling.
