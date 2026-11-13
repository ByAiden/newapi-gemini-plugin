---
changelogVersion: 1
plugin: gemini
version: 1.0.0
locale: "en"
translations:
  zh-CN: CHANGELOG.zh-CN.md
---

# Changelog

## [1.0.0]

### Added

- Gemini Omni Flash video generation (`gemini-omni-1.2-flash`, `gemini-omni-1.1-flash`) on `POST /v1/videos` and `POST /v1/responses` with a Google AI Studio key: text to video and image to video with up to 6 images, 3 to 15 seconds at `360p`, `720p`, `1080p` or `4k`, run as a background interaction of the Gemini Interactions API and downloaded from `GET /v1/videos/{task_id}/content`.
- Token billing for Gemini Omni with the price fields "Input token unit price", "Text output token unit price" and "Video output token unit price", reserved from the requested duration and resolution and settled on the usage Google reports.
- Gemini Decision 1 (`gemini-decision-1`) on the Gemini API's own path `POST /v1beta/decisions`: yes/no (`noul`), choice and score questions over text, image, audio, video and PDF input, answered in the same call with Google's reply as it is.
- Input token billing for Gemini Decision, reserved from the request size (or the 262,144-token context window when the input carries media) and settled on the `usage.total_input_tokens` Google reports.
