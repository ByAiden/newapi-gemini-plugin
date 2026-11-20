---
locale: en
translations:
  zh-CN: README.zh-CN.md
---

# Gemini (Gemini API)

**English** | [简体中文](README.zh-CN.md)

One new-api channel for the Gemini API with a Google AI Studio key: Gemini text models on the Gemini, OpenAI Chat Completions, OpenAI Responses and Claude Messages endpoints (streaming included), embeddings, image generation with the Gemini image models, Gemini Omni Flash video and Gemini Decision 1. The channel's model list is fetched from the Gemini API. The upstream can also be an OpenAI-compatible relay that serves Gemini models.

Requires new-api v1.0.0-rc.50 or later (tested on v1.0.0-rc.51 and new-api-horizon 0.7.0-rc.12).

## Channel setup

1. Install the plugin, then add a channel of type Task Plugin and bind it to `byaiden_gemini`.
2. Base URL: leave empty for `https://generativelanguage.googleapis.com`, or enter a relay that speaks the Gemini API. For a relay that speaks OpenAI's API, see [OpenAI-compatible relay upstream](#openai-compatible-relay-upstream).
3. Key: a Gemini API key from Google AI Studio, one per line for several keys. Gemini Omni and some text models need a project on the paid tier.
4. Models: Fetch models lists every model the key can use through this channel (text, embedding and image models, plus Gemini Omni and Gemini Decision); keep the ones you sell. A model appears on the pricing pages only after an enabled channel lists it.
5. Optional channel settings: Upstream type (Gemini API by default, or OpenAI-compatible relay, see below), API version (`v1beta` by default, as on the built-in Gemini channel; applies to text, embedding and image requests) and "Also send the key as ?key=" for relays that read the key only from the query string.

Picking this plugin in the channel form replaces the channel's model list with the plugin's list. When you move an existing channel to this plugin, copy its Models field first and paste it back after selecting the plugin; model mapping, groups and priority are kept.

Upgrading from 1.x: channels already bound to `byaiden_gemini` keep working after you activate 2.0.0. Add the text, embedding and image models to them (Fetch models) to sell those through the same channel.

## Models and endpoints

| Endpoint | What it does | Models |
| --- | --- | --- |
| `POST /v1beta/models/{model}:generateContent`, `:streamGenerateContent` (also under `/v1/models/`) | Gemini API text, multimodal input, tools, thinking and image output | Gemini text and image models |
| `POST /v1beta/models/{model}:embedContent`, `:batchEmbedContents` (also under `/v1/models/`) | Gemini embeddings, including image, audio, video and PDF input on `gemini-embedding-2` | Gemini embedding models |
| `POST /v1/chat/completions` | OpenAI Chat Completions, streaming included | Gemini text models |
| `POST /v1/responses` | OpenAI Responses for text, streaming included | Gemini text models |
| `POST /v1/messages` | Claude Messages, streaming, tools and images included | Gemini text models |
| `POST /v1/embeddings` | OpenAI embeddings (text input) | `gemini-embedding-2`, `gemini-embedding-001` |
| `POST /v1/images/generations` | Image generation, returned as `b64_json` | `gemini-nano-banana-2.1`, `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`, `gemini-3-pro-image`, `gemini-2.5-flash-image` |
| `GET /v1/models` | The channel's model list (Fetch models) | |
| `POST /v1/videos` | Gemini Omni video from a prompt and up to 6 images. Upload an image as the `input_reference` file in a multipart request, or send it in `input_reference` or `images` in JSON. | `gemini-omni-1.2-flash`, `gemini-omni-1.1-flash` |
| `POST /v1/responses` | Gemini Omni video through the Responses API, as a stream, a blocking call or a background call | `gemini-omni-1.2-flash`, `gemini-omni-1.1-flash` |
| `POST /v1beta/decisions` | Gemini Decision: yes/no (`noul`), choice and score questions about text, image, audio, video or PDF input, with the Gemini API's own request body, answered in the same call | `gemini-decision-1` |

Listed text models: `gemini-4-carbon`, `gemini-4-neon`, `gemini-4-argon`, `gemini-4-hydrogen`, `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview`, `gemini-3-flash-preview` and `gemini-2.5-flash-lite`. The text and embedding endpoints pass any model name to the Gemini API, so other models your key can use (found with Fetch models) work without a plugin update.

Text: Gemini native requests, OpenAI Chat Completions and OpenAI Responses go through new-api's own Gemini conversion, so requests, replies, streams and billing are those of new-api's built-in Gemini channel. Claude Messages requests are converted by the plugin (system prompt, images, tools, thinking via `thinking` / reasoning effort) and billed on the usage Gemini reports.

Images: `size` sets the aspect ratio (`1024x1024`, `1536x1024`, `1792x1024`, `1024x1792` and others, or a ratio such as `16:9`); a long side above 1024 asks for 2K output, above 2048 for 4K, and `quality: "hd"` asks for 2K. `n` is 1 to 4: each image is one Gemini request, and the reply holds all images and their combined usage. Imagen is not offered: Google shut down every Imagen model on the Gemini API on August 17, 2026.

Gemini Omni: clients poll `GET /v1/videos/{task_id}` and download the file from `GET /v1/videos/{task_id}/content`. A finished Responses result contains a gateway link to the video; background responses are read with `GET /v1/responses/{response_id}`. Video requests take `prompt`, `seconds`, `resolution` (`360p`, `720p`, `1080p` or `4k`) and `size`. A `size` taller than it is wide gives a 9:16 video, other sizes 16:9; without `resolution` it is derived from `size`, otherwise `720p`. One image is the first frame, two are the first and last frame, three to six are subject references.

Gemini Decision: `POST /v1beta/decisions` is also served under `/byaiden_gemini`. It takes the gateway token as `Authorization: Bearer` only; the `x-goog-api-key` header and `?key=` parameter are not accepted there. The Gemini native text and embedding endpoints take the gateway token as `x-goog-api-key` or `?key=`, as new-api's Gemini endpoints always do.

## Billing

Text, embeddings and images are billed by new-api as ordinary requests from the token usage Gemini reports, streams included: price them like any channel, with model and completion ratios or with expressions on `p` (input tokens), `c` (output tokens, thinking included), `cr` (cached input tokens), `ai` (audio input tokens) and `img_o` (image output tokens). The expressions below are Google's Standard paid-tier list prices in USD per million tokens as of November 19, 2026; multiply them by your margin. Google changes some of these prices on fixed dates, noted in the table; check [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) when you set them.

| Models | Expression |
| --- | --- |
| `gemini-4-carbon`, `gemini-4-argon` | `tier("base", p * 4 + c * 20 + cr * 0.2)` (until November 30, 2026: `tier("base", p * 2 + c * 10 + cr * 0.1)`) |
| `gemini-4-neon` | `tier("base", p * 3 + c * 15 + cr * 0.15)` |
| `gemini-4-hydrogen` | `tier("base", p * 1.5 + c * 7.5 + cr * 0.075)` |
| `gemini-3.8-flash`, `gemini-3.6-flash` | `tier("base", p * 0.75 + c * 3.75 + cr * 0.075)` (from January 1, 2027: `tier("base", p * 1.5 + c * 7.5 + cr * 0.15)`) |
| `gemini-3.5-flash-lite` | `tier("base", p * 0.3 + c * 2.5 + cr * 0.03)` |
| `gemini-3.1-flash-lite` | `tier("base", p * 0.25 + ai * 0.5 + c * 1.5 + cr * 0.025)` |
| `gemini-3.1-pro-preview` | `len <= 200000 ? tier("standard", p * 2 + c * 12 + cr * 0.2) : tier("long_context", p * 4 + c * 18 + cr * 0.4)` |
| `gemini-3-flash-preview` | `tier("base", p * 0.5 + ai * 1 + c * 3 + cr * 0.05)` |
| `gemini-2.5-flash-lite` | `tier("base", p * 0.1 + ai * 0.3 + c * 0.4 + cr * 0.01)` |
| `gemini-embedding-2` | `tier("base", p * 0.2)` (text input price) |
| `gemini-embedding-001` | `tier("base", p * 0.15)` |
| `gemini-nano-banana-2.1` | `tier("base", p * 1.5 + c * 7.5 + img_o * 30)` |
| `gemini-3.1-flash-image` | `tier("base", p * 0.5 + c * 3 + img_o * 60)` |
| `gemini-3.1-flash-lite-image` | `tier("base", p * 0.25 + c * 1.5 + img_o * 30)` |
| `gemini-3-pro-image` | `tier("base", p * 2 + c * 12 + img_o * 120)` |
| `gemini-2.5-flash-image` | `tier("base", p * 0.3 + c * 2.5 + img_o * 30)` |

An image costs its output image tokens (a 1K image is about 1,120 tokens on the Gemini 3 image models) plus any thinking tokens the model reports. Grounding with Google Search is billed by Google per search query on top of tokens.

Gemini Omni is billed as a task with three price fields: "Input token unit price", "Text output token unit price" (thinking included) and "Video output token unit price" (video with audio). When the request arrives the gateway reserves the video tokens for the requested duration and resolution: 1,931 per second at 360p, 5,792 at 720p, 8,688 at 1080p and 17,376 at 4k. When the video is done it settles all three on the usage Google reports. At Google's list prices for `gemini-omni-1.2-flash`:

```
tier("base", u("input_tokens") * 1.5 / 1000000 + u("output_tokens") * 9 / 1000000 + u("video_tokens") * 12 / 1000000)
```

Until December 3, 2026 Google bills `gemini-omni-1.1-flash` video output at USD 17.50 per million tokens; after that it routes the model to 1.2 at 1.2 rates.

Gemini Decision has one price field, "Input token unit price"; Google bills no output tokens. The gateway reserves the request's UTF-8 size plus formatting headroom for text-only input, or 262,144 tokens when the input carries media, and settles on the `usage.total_input_tokens` Google reports. At Google's list price: `tier("base", u("input_tokens") * 0.1 / 1000000)`.

Gemini Omni and Gemini Decision need a task price even in self-use mode. Rejected requests and failed generations are not billed.

## Example

```bash
curl https://your-gateway.example.com/v1/chat/completions \
  -H "Authorization: Bearer $NEWAPI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini-3.1-flash-lite", "messages": [{"role": "user", "content": "Write a haiku about the sea"}], "stream": true}'
```

Gemini native:

```bash
curl "https://your-gateway.example.com/v1beta/models/gemini-3.8-flash:generateContent" \
  -H "x-goog-api-key: $NEWAPI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contents": [{"role": "user", "parts": [{"text": "Explain tides in one sentence"}]}]}'
```

An image:

```bash
curl https://your-gateway.example.com/v1/images/generations \
  -H "Authorization: Bearer $NEWAPI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini-3.1-flash-lite-image", "prompt": "A small red cube on a white table", "size": "1792x1024"}'
```

A Gemini Omni video, then its status and file:

```bash
curl https://your-gateway.example.com/v1/videos \
  -H "Authorization: Bearer $NEWAPI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini-omni-1.2-flash", "prompt": "Waves rolling onto a black sand beach at sunset", "seconds": 8, "resolution": "720p"}'

curl https://your-gateway.example.com/v1/videos/{task_id} \
  -H "Authorization: Bearer $NEWAPI_TOKEN"

curl -o video.mp4 https://your-gateway.example.com/v1/videos/{task_id}/content \
  -H "Authorization: Bearer $NEWAPI_TOKEN"
```

Gemini Decision:

```bash
curl https://your-gateway.example.com/v1beta/decisions \
  -H "Authorization: Bearer $NEWAPI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini-decision-1", "input": "The blue mug I ordered arrived cracked.", "questions": {"is_damaged": {"type": "noul", "instructions": "Did the item arrive damaged?"}}}'
```

```json
{"answers": {"is_damaged": {"type": "noul", "noul": 0.99, "confidence": 0.99}}, "usage": {"total_input_tokens": 100, "input_tokens_by_modality": [{"modality": "text", "tokens": 100}], "total_output_tokens": 0, "total_tokens": 100}}
```

## Through another New API gateway

A second gateway can sell these models through yours. Install this plugin on both gateways:

- On the gateway that calls Google, set up the channel above.
- On the other gateway, create a **New API** channel (type 60). Its base URL is the first gateway's address and its key is a token from the first gateway. Pick `byaiden_gemini` under Upstream task plugins and add the models.

Text requests pass through the New API channel as ordinary requests; price them on each gateway as above. Gemini Omni goes to the first gateway's `POST /v1/videos` with the token as a Bearer key, is polled at `GET /v1/videos/{id}` there and downloads from `GET /v1/videos/{id}/content`; the client can use `/v1/videos` or `/v1/responses` on the outer gateway. Gemini Decision goes to the first gateway's `/byaiden_gemini/v1beta/decisions`. Both gateways reserve and settle Gemini Omni and Gemini Decision the same way: a finished video object on the first gateway carries the billed `usage` (`input_tokens`, `output_tokens`, `video_tokens`), and a decision reply carries `usage.total_input_tokens`, so the expressions above charge the same usage on both.

## OpenAI-compatible relay upstream

Set the channel setting **Upstream type** to **OpenAI-compatible relay** when the upstream is a relay that serves Gemini models over OpenAI's API. The Base URL is the relay's root (for example `https://relay.example.com`, without `/v1`) and the key is the relay's key, sent as `Authorization: Bearer`. The default, **Gemini API**, works as described above; the API version and `?key=` settings apply to it only. Saving a relay channel with an empty Base URL or a Google address fails with a message.

| Client endpoint | Sent to the relay as |
| --- | --- |
| Gemini `generateContent`, `streamGenerateContent` | OpenAI `POST /v1/chat/completions`, streamed when the client streams; the reply and the stream come back in Gemini format |
| OpenAI Chat Completions, OpenAI Responses | new-api turns the request into a Gemini request as on the Gemini API, the plugin sends it as OpenAI `POST /v1/chat/completions`, and the client gets its own format back |
| Claude Messages | OpenAI `POST /v1/chat/completions` (new-api's own Claude conversion) |
| Gemini `embedContent`, `batchEmbedContents` | OpenAI `POST /v1/embeddings` (text input) |
| OpenAI embeddings, image generation | `POST /v1/embeddings` and `POST /v1/images/generations` as they are |
| Fetch models | `GET /v1/models`, with the ids the relay lists |

The model name goes to the relay as the channel's upstream model, and the model the relay reports is passed on as it is.

Billing on a relay channel uses the relay's OpenAI `usage`: `prompt_tokens` as input (`cached_tokens` as cached input, `audio_tokens` as audio input) and `completion_tokens` as output, reasoning tokens included. Streams ask the relay for usage with `stream_options.include_usage`; a relay that sends none is estimated by new-api. The expression variables above apply; price the models at what the relay charges you.

Not available on a relay channel, refused before anything is sent (nothing is billed): Gemini Omni and Gemini Decision (leave these models off the channel; `/v1/videos` and `/v1beta/decisions` say why, Omni on `/v1/responses` answers `Invalid task protocol request`), and, with a message naming the field, the Google Search, code execution and URL context tools, image or audio output through `generateContent` (use `/v1/images/generations` for images), cached content, Files API references, `responseLogprobs`, more than 4 stop sequences, and media other than PNG, JPEG, WebP and GIF images, WAV and MP3 audio and PDF. `topK`, `safetySettings`, `taskType` and `title` are not sent. A thinking budget is sent as the nearest `reasoning_effort` (`0` is `none`, up to 512 `minimal`, up to 1,024 `low`, up to 8,192 `medium`, above that `high`), and earlier thinking in the conversation is not sent back.

## Limits

- OpenAI embeddings take text only; send images, audio, video or PDF to `gemini-embedding-2` through the Gemini `embedContent` endpoint.
- Image generation returns base64 images (`b64_json`) whatever `response_format` asks for; image edits (`/v1/images/edits`) are not offered. To edit an image, send it with the prompt to a Gemini image model on `generateContent`.
- Claude Messages and OpenAI chat requests cannot reference files by `file_id`; send media as data URLs or public HTTPS URLs.
- Speech generation (Gemini TTS models) and the Live API are not offered.
- Gemini Omni 1.2 generates 3 to 15 seconds; Gemini Omni 1.1 and first-and-last-frame videos stop at 10 seconds. The default is 8 seconds. Input images are JPEG or PNG, as a data URL or base64; an uploaded file is at most 20 MiB. Editing, extending and multi-turn conversations of the Interactions API are not offered, nor video or audio input for Gemini Omni.
- Gemini Omni videos are delivered inline by Google; a 15-second 4k video is large, so raise `MAX_FILE_DOWNLOAD_MB` on the gateway if downloads of long high-resolution videos fail. Google keeps finished videos for 55 days on the paid tier by default.
- Gemini Decision takes 1 to 1,000 questions, 2 to 255 choice options or score levels, and 262,144 tokens of input and questions together. Only `model`, `input` and `questions` are accepted. Media goes inline as base64 `data` or as a public or signed HTTPS `uri`; Files API URIs are rejected because they name files in the gateway's Google account. Decision replies are not stored and cannot be queried again.
