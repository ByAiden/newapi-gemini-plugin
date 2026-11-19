---
locale: zh-CN
---

# Gemini（Gemini API）

[English](README.md) | **简体中文**

用一个 new-api 渠道和 Google AI Studio 密钥接入 Gemini API：Gemini 文本模型（Gemini 原生、OpenAI Chat Completions、OpenAI Responses、Claude Messages 接口，均支持流式）、向量、Gemini 图像模型生图、Gemini Omni Flash 视频和 Gemini Decision 1。渠道的模型列表可从 Gemini API 获取。

需要 new-api v1.0.0-rc.50 或更高版本（已在 v1.0.0-rc.51 和 new-api-horizon 0.7.0-rc.12 上测试）。

## 渠道设置

1. 安装插件，新建类型为「任务插件」的渠道并绑定 `byaiden_gemini`。
2. Base URL：留空即 `https://generativelanguage.googleapis.com`，也可以填兼容 Gemini API 的中转地址。
3. 密钥：Google AI Studio 的 Gemini API 密钥，多个密钥每行一个。Gemini Omni 和部分文本模型需要付费层级的项目。
4. 模型：点「获取模型列表」会列出该密钥能经本渠道使用的全部模型（文本、向量、图像模型，以及 Gemini Omni 和 Gemini Decision），保留要售卖的即可。模型只有出现在已启用渠道的模型列表里，才会显示在定价页面。
5. 可选渠道设置：API 版本（默认 `v1beta`，与内置 Gemini 渠道一致；作用于文本、向量和图像请求），以及「同时以 ?key= 发送密钥」，用于只从查询参数读取密钥的中转。

在渠道表单里选择本插件时，渠道的模型列表会被替换成插件的列表。把已有渠道改用本插件时，先复制它的「模型」字段，选好插件后再粘贴回去；模型重定向、分组和优先级会保留。

从 1.x 升级：已绑定 `byaiden_gemini` 的渠道在启用 2.0.0 后照常工作。给这些渠道加上文本、向量和图像模型（获取模型列表）即可在同一渠道售卖。

## 模型与接口

| 接口 | 功能 | 模型 |
| --- | --- | --- |
| `POST /v1beta/models/{model}:generateContent`、`:streamGenerateContent`（`/v1/models/` 下同样可用） | Gemini API 文本、多模态输入、工具、思考和图像输出 | Gemini 文本和图像模型 |
| `POST /v1beta/models/{model}:embedContent`、`:batchEmbedContents`（`/v1/models/` 下同样可用） | Gemini 向量，`gemini-embedding-2` 还支持图片、音频、视频和 PDF 输入 | Gemini 向量模型 |
| `POST /v1/chat/completions` | OpenAI Chat Completions，含流式 | Gemini 文本模型 |
| `POST /v1/responses` | OpenAI Responses 文本，含流式 | Gemini 文本模型 |
| `POST /v1/messages` | Claude Messages，含流式、工具和图片 | Gemini 文本模型 |
| `POST /v1/embeddings` | OpenAI 向量（文本输入） | `gemini-embedding-2`、`gemini-embedding-001` |
| `POST /v1/images/generations` | 生成图像，以 `b64_json` 返回 | `gemini-nano-banana-2.1`、`gemini-3.1-flash-image`、`gemini-3.1-flash-lite-image`、`gemini-3-pro-image`、`gemini-2.5-flash-image` |
| `GET /v1/models` | 渠道模型列表（获取模型列表） | |
| `POST /v1/videos` | Gemini Omni 视频，输入提示词和最多 6 张图片。图片可在 multipart 请求中以 `input_reference` 文件上传，或在 JSON 的 `input_reference`、`images` 中传入。 | `gemini-omni-1.2-flash`、`gemini-omni-1.1-flash` |
| `POST /v1/responses` | 通过 Responses API 生成 Gemini Omni 视频，支持流式、阻塞和后台调用 | `gemini-omni-1.2-flash`、`gemini-omni-1.1-flash` |
| `POST /v1beta/decisions` | Gemini Decision：对文本、图片、音频、视频或 PDF 输入回答是非（`noul`）、选择和打分问题，使用 Gemini API 自己的请求体，同一次调用返回 | `gemini-decision-1` |

插件列出的文本模型：`gemini-4-carbon`、`gemini-4-neon`、`gemini-4-argon`、`gemini-4-hydrogen`、`gemini-3.8-flash`、`gemini-3.6-flash`、`gemini-3.5-flash-lite`、`gemini-3.1-flash-lite`、`gemini-3.1-pro-preview`、`gemini-3-flash-preview` 和 `gemini-2.5-flash-lite`。文本和向量接口会把任意模型名转给 Gemini API，密钥能用的其他模型（获取模型列表可见）无需更新插件即可使用。

文本：Gemini 原生请求、OpenAI Chat Completions 和 OpenAI Responses 走 new-api 自带的 Gemini 转换，请求、回复、流式和计费与 new-api 内置 Gemini 渠道相同。Claude Messages 请求由插件转换（系统提示词、图片、工具、通过 `thinking` / reasoning effort 的思考），按 Gemini 返回的用量计费。

图像：`size` 决定宽高比（`1024x1024`、`1536x1024`、`1792x1024`、`1024x1792` 等，或 `16:9` 这样的比例）；长边超过 1024 时请求 2K 输出，超过 2048 时请求 4K，`quality: "hd"` 也请求 2K。`n` 为 1 到 4：每张图是一次 Gemini 请求，回复包含全部图片和合计用量。不提供 Imagen：Google 已于 2026 年 8 月 17 日关停 Gemini API 上的全部 Imagen 模型。

Gemini Omni：客户端轮询 `GET /v1/videos/{task_id}`，从 `GET /v1/videos/{task_id}/content` 下载文件。Responses 完成结果里是网关的视频链接；后台 response 用 `GET /v1/responses/{response_id}` 读取。视频请求接受 `prompt`、`seconds`、`resolution`（`360p`、`720p`、`1080p` 或 `4k`）和 `size`。`size` 高大于宽时生成 9:16 视频，其他为 16:9；未给 `resolution` 时由 `size` 推断，否则为 `720p`。一张图片作首帧，两张作首尾帧，三到六张作主体参考。

Gemini Decision：`POST /v1beta/decisions` 也可在 `/byaiden_gemini` 下访问，只接受 `Authorization: Bearer` 形式的网关令牌，不接受 `x-goog-api-key` 请求头和 `?key=` 参数。Gemini 原生文本和向量接口则与 new-api 的 Gemini 接口一样，以 `x-goog-api-key` 或 `?key=` 传网关令牌。

## 计费

文本、向量和图像由 new-api 按普通请求计费，依据 Gemini 返回的 token 用量（含流式）：像其他渠道一样定价，使用模型倍率和补全倍率，或使用基于 `p`（输入 token）、`c`（输出 token，含思考）、`cr`（缓存输入 token）、`ai`（音频输入 token）和 `img_o`（图像输出 token）的表达式。下表是 Google 标准付费层级截至 2026 年 11 月 19 日的美元列表价（每百万 token），按需乘以利润率。部分价格 Google 会在固定日期调整，已在表中注明；设置前请查看 [Gemini API 价格](https://ai.google.dev/gemini-api/docs/pricing)。

| 模型 | 表达式 |
| --- | --- |
| `gemini-4-carbon`、`gemini-4-argon` | `tier("base", p * 4 + c * 20 + cr * 0.2)`（2026 年 11 月 30 日前：`tier("base", p * 2 + c * 10 + cr * 0.1)`） |
| `gemini-4-neon` | `tier("base", p * 3 + c * 15 + cr * 0.15)` |
| `gemini-4-hydrogen` | `tier("base", p * 1.5 + c * 7.5 + cr * 0.075)` |
| `gemini-3.8-flash`、`gemini-3.6-flash` | `tier("base", p * 0.75 + c * 3.75 + cr * 0.075)`（2027 年 1 月 1 日起：`tier("base", p * 1.5 + c * 7.5 + cr * 0.15)`） |
| `gemini-3.5-flash-lite` | `tier("base", p * 0.3 + c * 2.5 + cr * 0.03)` |
| `gemini-3.1-flash-lite` | `tier("base", p * 0.25 + ai * 0.5 + c * 1.5 + cr * 0.025)` |
| `gemini-3.1-pro-preview` | `len <= 200000 ? tier("standard", p * 2 + c * 12 + cr * 0.2) : tier("long_context", p * 4 + c * 18 + cr * 0.4)` |
| `gemini-3-flash-preview` | `tier("base", p * 0.5 + ai * 1 + c * 3 + cr * 0.05)` |
| `gemini-2.5-flash-lite` | `tier("base", p * 0.1 + ai * 0.3 + c * 0.4 + cr * 0.01)` |
| `gemini-embedding-2` | `tier("base", p * 0.2)`（文本输入价） |
| `gemini-embedding-001` | `tier("base", p * 0.15)` |
| `gemini-nano-banana-2.1` | `tier("base", p * 1.5 + c * 7.5 + img_o * 30)` |
| `gemini-3.1-flash-image` | `tier("base", p * 0.5 + c * 3 + img_o * 60)` |
| `gemini-3.1-flash-lite-image` | `tier("base", p * 0.25 + c * 1.5 + img_o * 30)` |
| `gemini-3-pro-image` | `tier("base", p * 2 + c * 12 + img_o * 120)` |
| `gemini-2.5-flash-image` | `tier("base", p * 0.3 + c * 2.5 + img_o * 30)` |

一张图的费用是其图像输出 token（Gemini 3 图像模型的 1K 图约 1,120 token），加上模型报告的思考 token。Google 搜索接地由 Google 按搜索次数另行计费。

Gemini Omni 按任务计费，有三个价格字段：「输入 token 单价」「文本输出 token 单价」（含思考）和「视频输出 token 单价」（含音频的视频）。请求到达时，网关按请求的时长和分辨率预扣视频 token：360p 每秒 1,931，720p 5,792，1080p 8,688，4k 17,376。视频完成后按 Google 返回的用量结算三项。按 Google 对 `gemini-omni-1.2-flash` 的列表价：

```
tier("base", u("input_tokens") * 1.5 / 1000000 + u("output_tokens") * 9 / 1000000 + u("video_tokens") * 12 / 1000000)
```

2026 年 12 月 3 日之前，Google 对 `gemini-omni-1.1-flash` 的视频输出按每百万 token 17.50 美元计费；之后该模型转到 1.2，按 1.2 的价格计费。

Gemini Decision 只有一个价格字段「输入 token 单价」，Google 不收输出 token 费用。纯文本输入时网关预扣请求的 UTF-8 字节数加格式余量，输入含媒体时预扣 262,144 token，最后按 Google 返回的 `usage.total_input_tokens` 结算。按 Google 列表价：`tier("base", u("input_tokens") * 0.1 / 1000000)`。

Gemini Omni 和 Gemini Decision 即使在自用模式下也需要设置任务价格。被拒绝的请求和失败的生成不计费。

## 示例

```bash
curl https://your-gateway.example.com/v1/chat/completions \
  -H "Authorization: Bearer $NEWAPI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini-3.1-flash-lite", "messages": [{"role": "user", "content": "写一首关于大海的俳句"}], "stream": true}'
```

Gemini 原生：

```bash
curl "https://your-gateway.example.com/v1beta/models/gemini-3.8-flash:generateContent" \
  -H "x-goog-api-key: $NEWAPI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contents": [{"role": "user", "parts": [{"text": "用一句话解释潮汐"}]}]}'
```

生成图像：

```bash
curl https://your-gateway.example.com/v1/images/generations \
  -H "Authorization: Bearer $NEWAPI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini-3.1-flash-lite-image", "prompt": "白色桌面上的一个红色小方块", "size": "1792x1024"}'
```

Gemini Omni 视频，然后查询状态并下载：

```bash
curl https://your-gateway.example.com/v1/videos \
  -H "Authorization: Bearer $NEWAPI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini-omni-1.2-flash", "prompt": "日落时海浪涌上黑沙滩", "seconds": 8, "resolution": "720p"}'

curl https://your-gateway.example.com/v1/videos/{task_id} \
  -H "Authorization: Bearer $NEWAPI_TOKEN"

curl -o video.mp4 https://your-gateway.example.com/v1/videos/{task_id}/content \
  -H "Authorization: Bearer $NEWAPI_TOKEN"
```

Gemini Decision：

```bash
curl https://your-gateway.example.com/v1beta/decisions \
  -H "Authorization: Bearer $NEWAPI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini-decision-1", "input": "我买的蓝色马克杯到货时裂了。", "questions": {"is_damaged": {"type": "noul", "instructions": "商品到货时是否损坏？"}}}'
```

```json
{"answers": {"is_damaged": {"type": "noul", "noul": 0.99, "confidence": 0.99}}, "usage": {"total_input_tokens": 100, "input_tokens_by_modality": [{"modality": "text", "tokens": 100}], "total_output_tokens": 0, "total_tokens": 100}}
```

## 经由另一个 New API 网关

另一个网关可以通过你的网关售卖这些模型。两个网关都安装本插件：

- 调用 Google 的网关按上文设置渠道。
- 另一个网关新建 **New API** 渠道（类型 60），Base URL 填第一个网关的地址，密钥填第一个网关的令牌，在「上游任务插件」中选择 `byaiden_gemini` 并添加模型。

文本请求作为普通请求经 New API 渠道转发，在每个网关按上文分别定价。Gemini Omni 发往第一个网关的 `POST /v1/videos`（令牌作 Bearer 密钥），在那里的 `GET /v1/videos/{id}` 查询，从 `GET /v1/videos/{id}/content` 下载；客户端可在外层网关使用 `/v1/videos` 或 `/v1/responses`。Gemini Decision 发往第一个网关的 `/byaiden_gemini/v1beta/decisions`。两个网关对 Gemini Omni 和 Gemini Decision 的预扣与结算方式相同：第一个网关完成的视频对象带有计费用的 `usage`（`input_tokens`、`output_tokens`、`video_tokens`），Decision 回复带有 `usage.total_input_tokens`，因此上面的表达式在两个网关按相同用量计费。

## 限制

- OpenAI 向量只接受文本；图片、音频、视频或 PDF 请通过 Gemini `embedContent` 接口发给 `gemini-embedding-2`。
- 生成图像总是返回 base64 图片（`b64_json`），与 `response_format` 无关；不提供图像编辑（`/v1/images/edits`）。如需编辑图片，在 `generateContent` 上把图片和提示词一起发给 Gemini 图像模型。
- Claude Messages 和 OpenAI chat 请求不能用 `file_id` 引用文件；媒体请以 data URL 或公开 HTTPS URL 发送。
- 不提供语音合成（Gemini TTS 模型）和 Live API。
- Gemini Omni 1.2 可生成 3 到 15 秒；Gemini Omni 1.1 和首尾帧视频最长 10 秒，默认 8 秒。输入图片为 JPEG 或 PNG，可用 data URL 或 base64；上传文件最大 20 MiB。不提供 Interactions API 的编辑、延长和多轮对话，Gemini Omni 也不接受视频或音频输入。
- Gemini Omni 视频由 Google 内联返回；15 秒 4k 视频较大，长时高分辨率视频下载失败时请调大网关的 `MAX_FILE_DOWNLOAD_MB`。付费层级下 Google 默认保留已完成视频 55 天。
- Gemini Decision 接受 1 到 1,000 个问题、2 到 255 个选项或打分等级，输入与问题合计 262,144 token。只接受 `model`、`input` 和 `questions`。媒体以 base64 `data` 或公开/签名 HTTPS `uri` 内联发送；Files API URI 会被拒绝，因为它指向网关自己 Google 账号里的文件。Decision 回复不保存，之后无法再次查询。
