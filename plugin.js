export const meta = {
  "apiVersion": 1,
  "key": "byaiden_gemini",
  "name": "Gemini (Gemini API)",
  "icon": "Gemini.Color",
  "description": {
    "en": "Gemini API on one channel: text, embeddings, images, Omni video, Decision",
    "zh": "Gemini API 单渠道：文本、向量、图像、Omni 视频与 Decision"
  },
  "version": "2.0.0",
  "author": { "name": "ByAiden", "url": "https://github.com/ByAiden" },
  "website": "https://aistudio.google.com/docs/models",
  "baseUrl": "https://generativelanguage.googleapis.com",
  "models": [
    "gemini-4-carbon",
    "gemini-4-neon",
    "gemini-4-argon",
    "gemini-4-hydrogen",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-2.5-flash-lite",
    "gemini-embedding-2",
    "gemini-embedding-001",
    "gemini-nano-banana-2.1",
    "gemini-3.1-flash-image",
    "gemini-3.1-flash-lite-image",
    "gemini-3-pro-image",
    "gemini-2.5-flash-image",
    "gemini-omni-1.2-flash",
    "gemini-omni-1.1-flash",
    "gemini-decision-1"
  ],
  "fetchMode": "per_task",
  "upstreams": ["vendor", "new_api"],
  "usageSchema": {
    "input_tokens": {
      "type": "number",
      "unit": "token",
      "description": { "en": "Input token unit price", "zh": "输入 token 单价" }
    },
    "output_tokens": {
      "type": "number",
      "unit": "token",
      "description": { "en": "Text output token unit price", "zh": "文本输出 token 单价" }
    },
    "video_tokens": {
      "type": "number",
      "unit": "token",
      "description": { "en": "Video output token unit price", "zh": "视频输出 token 单价" }
    }
  },
  "usageExamples": [
    { "label": "3s 360p", "facts": { "input_tokens": 0, "output_tokens": 0, "video_tokens": 5793 } },
    { "label": "8s 720p", "facts": { "input_tokens": 0, "output_tokens": 0, "video_tokens": 46336 } },
    { "label": "8s 1080p", "facts": { "input_tokens": 0, "output_tokens": 0, "video_tokens": 69504 } },
    { "label": "10s 4k", "facts": { "input_tokens": 0, "output_tokens": 0, "video_tokens": 173760 } }
  ],
  "usageProfiles": [
    {
      "models": ["gemini-decision-1"],
      "schema": {
        "input_tokens": {
          "type": "number",
          "unit": "token",
          "description": { "en": "Input token unit price", "zh": "输入 token 单价" }
        }
      },
      "examples": [{ "label": "1K input tokens", "facts": { "input_tokens": 1000 } }]
    }
  ],
  "routes": [
    {
      "method": "POST",
      "path": "/v1beta/decisions",
      "type": "submit",
      "decode": "decisions",
      "render": "decided",
      "retainResult": false,
      "models": ["gemini-decision-1"]
    }
  ],
  "protocols": [
    {
      "name": "openai_responses",
      "models": ["gemini-omni-1.2-flash", "gemini-omni-1.1-flash"],
      "supports": ["stream", "sync", "background"]
    },
    {
      "name": "openai_video",
      "models": ["gemini-omni-1.2-flash", "gemini-omni-1.1-flash"]
    }
  ],
  "relay": [
    { "incoming_path": "/v1beta/models/{model}:generateContent", "upstream_path": "/v1beta/models/{model}:generateContent", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } },
    { "incoming_path": "/v1/models/{model}:generateContent", "upstream_path": "/v1beta/models/{model}:generateContent", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } },
    { "incoming_path": "/v1beta/models/{model}:embedContent", "upstream_path": "/v1beta/models/{model}:embedContent", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } },
    { "incoming_path": "/v1/models/{model}:embedContent", "upstream_path": "/v1beta/models/{model}:embedContent", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } },
    { "incoming_path": "/v1beta/models/{model}:batchEmbedContents", "upstream_path": "/v1beta/models/{model}:batchEmbedContents", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } },
    { "incoming_path": "/v1/models/{model}:batchEmbedContents", "upstream_path": "/v1beta/models/{model}:batchEmbedContents", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } },
    { "incoming_path": "/v1/chat/completions", "upstream_path": "/v1beta/models/{model}:generateContent", "converter": "openai_chat_completions_to_gemini_generate_content", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } },
    { "incoming_path": "/v1/responses", "upstream_path": "/v1beta/models/{model}:generateContent", "converter": "openai_responses_to_gemini_generate_content", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } },
    { "incoming_path": "/v1/messages", "upstream_path": "/v1beta/models/{model}:generateContent", "converter": "anthropic_messages_to_openai_chat_completions+plugin", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } },
    { "incoming_path": "/v1/embeddings", "upstream_path": "/v1beta/models/{model}:batchEmbedContents", "converter": "plugin", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } },
    { "incoming_path": "/v1/images/generations", "upstream_path": "/v1beta/models/{model}:generateContent", "converter": "plugin", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } },
    { "incoming_path": "/v1/models", "upstream_path": "/v1beta/models?pageSize=1000", "converter": "plugin", "auth": { "type": "header", "name": "x-goog-api-key", "value": "{api_key}" } }
  ],
  "channelConfig": {
    "type": "object",
    "properties": {
      "apiVersion": {
        "type": "string",
        "title": { "en": "API version", "zh": "API 版本" },
        "description": {
          "en": "Gemini API version in the upstream path of text, embedding and image requests",
          "zh": "文本、向量与图像请求上游路径中的 Gemini API 版本"
        },
        "enum": ["v1beta", "v1", "v1alpha"],
        "default": "v1beta"
      },
      "keyInQuery": {
        "type": "boolean",
        "title": { "en": "Also send the key as ?key=", "zh": "同时以 ?key= 发送密钥" },
        "description": {
          "en": "For relays that only read the key from the query string; the x-goog-api-key header is always sent",
          "zh": "用于只从查询参数读取密钥的中转；x-goog-api-key 请求头始终会发送"
        },
        "default": false
      }
    }
  },
  "keyHint": {
    "en": "Gemini API key, one per line",
    "zh": "Gemini API 密钥，每行一个"
  }
};

// Runtime copies of manifest values: the gateway reads the manifest without
// running the plugin, so the code never refers to it.
export const PLUGIN_KEY = "byaiden_gemini";
export const MODEL_IDS = [
  "gemini-4-carbon",
  "gemini-4-neon",
  "gemini-4-argon",
  "gemini-4-hydrogen",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
  "gemini-embedding-2",
  "gemini-embedding-001",
  "gemini-nano-banana-2.1",
  "gemini-3.1-flash-image",
  "gemini-3.1-flash-lite-image",
  "gemini-3-pro-image",
  "gemini-2.5-flash-image",
  "gemini-omni-1.2-flash",
  "gemini-omni-1.1-flash",
  "gemini-decision-1",
];
export const TASK_MODEL_IDS = ["gemini-omni-1.2-flash", "gemini-omni-1.1-flash", "gemini-decision-1"];

// Gemini Decisions API: https://aistudio.google.com/docs/decisions-api
// Limits follow its Limits section. The context window bounds shared input
// and all questions together. Text-only requests reserve their UTF-8 size (a
// token covers at least one byte) plus formatting headroom; requests with
// media reserve the whole window. Completion settles on the reported
// usage.total_input_tokens.
const DECISION_ACTION = "decide";
const DECISION_MODELS = ["gemini-decision-1"];
const DECISION_CONTEXT_TOKENS = 262144;
const DECISION_FIELDS = ["model", "input", "questions"];
const DECISION_QUESTION_FIELDS = ["type", "instructions", "criteria"];
const DECISION_BLOCK_TYPES = {
  text: ["type", "text"],
  image: ["type", "data", "uri", "mime_type", "resolution"],
  audio: ["type", "data", "uri", "mime_type"],
  video: ["type", "data", "uri", "mime_type", "resolution"],
  document: ["type", "data", "uri", "mime_type"],
};
const DECISION_RESOLUTIONS = { image: ["low", "medium", "high", "ultra_high"], video: ["low", "medium", "high"] };
const MAX_DECISION_QUESTIONS = 1000;
const MAX_DECISION_OPTIONS = 255;

function trimmed(value) {
  return String(value || "").trim();
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

// On a New API channel the same plugin answers on another gateway, which
// serves the Gemini API wire format under /<plugin key>, the form every gateway
// release serves, and takes its own token as a Bearer header.
function viaGateway(ctx) {
  return Boolean(ctx.upstream && ctx.upstream.kind === "new_api");
}

function apiRoot(ctx) {
  return ctx.baseUrl.replace(/\/+$/, "") + (viaGateway(ctx) ? "/" + PLUGIN_KEY : "");
}

function authHeaders(ctx) {
  return viaGateway(ctx) ? { Authorization: "Bearer " + ctx.apiKey } : { "x-goog-api-key": ctx.apiKey };
}

function onlyFields(value, allowed, where) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(where + "." + key + " is not supported");
  }
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

// One content block of input, or of instructions when textOnly is set.
function decisionBlock(block, where, textOnly) {
  if (!plainObject(block)) throw new Error(where + " must be a content block object");
  const fields = DECISION_BLOCK_TYPES[block.type];
  if (!fields || (textOnly && block.type !== "text"))
    throw new Error(where + ".type must be " + (textOnly ? "text" : "text, image, audio, video, or document"));
  onlyFields(block, fields, where);
  if (block.type === "text") {
    if (typeof block.text !== "string") throw new Error(where + ".text must be a string");
    return false;
  }
  const hasData = block.data !== undefined;
  const hasURI = block.uri !== undefined;
  if (hasData === hasURI) throw new Error(where + " needs exactly one of data or uri");
  if (hasData && !nonEmptyString(block.data)) throw new Error(where + ".data must be base64 text");
  if (hasURI) {
    const uri = String(block.uri);
    if (!/^https:\/\/[^\s/]+\//i.test(uri)) throw new Error(where + ".uri must be a public or signed HTTPS URL");
    // A Files API URI names a file in the gateway's own Google account.
    if (/^https:\/\/generativelanguage\.googleapis\.com\//i.test(uri)) throw new Error(where + ".uri cannot be a Files API URI; send the file as data or a public HTTPS URL");
  }
  if (!nonEmptyString(block.mime_type)) throw new Error(where + ".mime_type is required");
  if (block.resolution !== undefined && !DECISION_RESOLUTIONS[block.type].includes(block.resolution))
    throw new Error(where + ".resolution must be one of " + DECISION_RESOLUTIONS[block.type].join(", "));
  return true;
}

// Returns whether the content carries media.
function decisionContent(value, where, textOnly) {
  if (typeof value === "string") {
    if (!value) throw new Error(where + " cannot be empty");
    return false;
  }
  const blocks = Array.isArray(value) ? value : [value];
  if (blocks.length === 0) throw new Error(where + " cannot be empty");
  let media = false;
  blocks.forEach(function (block, index) {
    if (decisionBlock(block, Array.isArray(value) ? where + "[" + index + "]" : where, textOnly)) media = true;
  });
  return media;
}

function decisionCriteria(question, where) {
  const criteria = question.criteria;
  if (question.type === "noul") {
    if (criteria === undefined || criteria === null) return;
    if (!plainObject(criteria)) throw new Error(where + ".criteria must be an object");
    onlyFields(criteria, ["true_description", "false_description"], where + ".criteria");
    for (const key of Object.keys(criteria)) {
      if (typeof criteria[key] !== "string") throw new Error(where + ".criteria." + key + " must be a string");
    }
  } else if (question.type === "choice") {
    if (!plainObject(criteria)) throw new Error(where + ".criteria must map option keys to descriptions");
    const keys = Object.keys(criteria);
    if (keys.length < 2 || keys.length > MAX_DECISION_OPTIONS) throw new Error(where + ".criteria must hold 2 to 255 options");
    for (const key of keys) {
      if (!key || key.length > 128 || key !== key.trim()) throw new Error(where + " option keys must be 1 to 128 characters without leading or trailing spaces");
      if (typeof criteria[key] !== "string") throw new Error(where + " option descriptions must be strings");
    }
  } else {
    if (!Array.isArray(criteria) || criteria.length < 2 || criteria.length > MAX_DECISION_OPTIONS) throw new Error(where + ".criteria must list 2 to 255 levels");
    if (!criteria.every(nonEmptyString)) throw new Error(where + " levels must be non-empty strings");
  }
}

// Validates a Decisions request; returns whether its input carries media.
function validateDecisionRequest(body) {
  if (!plainObject(body)) throw new Error("request body must be an object");
  onlyFields(body, DECISION_FIELDS, "request");
  if (!trimmed(body.model)) throw new Error("model is required");
  if (body.input === undefined || body.input === null) throw new Error("input is required");
  const media = decisionContent(body.input, "input", false);
  const questions = plainObject(body.questions);
  const ids = questions ? Object.keys(questions) : [];
  if (ids.length < 1 || ids.length > MAX_DECISION_QUESTIONS) throw new Error("questions must hold 1 to 1000 questions");
  for (const id of ids) {
    const where = "questions." + id;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new Error("question keys must be 1 to 64 characters of A-Z, a-z, 0-9, _ or -");
    const question = plainObject(questions[id]);
    if (!question) throw new Error(where + " must be an object");
    onlyFields(question, DECISION_QUESTION_FIELDS, where);
    if (!["noul", "choice", "score"].includes(question.type)) throw new Error(where + ".type must be noul, choice, or score");
    if (question.instructions === undefined || question.instructions === null) throw new Error(where + ".instructions is required");
    decisionContent(question.instructions, where + ".instructions", true);
    decisionCriteria(question, where);
  }
  return media;
}

// The decoder names the action; the model or the reply backs it up.
function isDecision(ctx, data) {
  if (ctx.action === DECISION_ACTION) return true;
  if (DECISION_MODELS.includes(ctx.upstreamModel || ctx.model)) return true;
  return Boolean(plainObject(data) && plainObject(data.answers));
}

function utf8Length(text) {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

function decisionReservation(body) {
  if (validateDecisionRequest(body)) return DECISION_CONTEXT_TOKENS;
  const text = JSON.stringify({ input: body.input, questions: body.questions });
  const questions = Object.keys(body.questions).length;
  return Math.min(DECISION_CONTEXT_TOKENS, utf8Length(text) + 256 + 64 * questions);
}

function decisionRequest(ctx) {
  const body = ctx.requestBody || {};
  validateDecisionRequest(body);
  return {
    url: apiRoot(ctx) + "/v1beta/decisions",
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json", Accept: "application/json" }, authHeaders(ctx)),
    body: { model: ctx.upstreamModel || ctx.model, input: body.input, questions: body.questions },
    action: DECISION_ACTION,
  };
}

function decisionResult(ctx, resp) {
  const body = plainObject(resp.body);
  const answers = plainObject(body && body.answers);
  if (!answers) throw new Error("Gemini Decisions response is missing answers");
  const questions = (ctx.requestBody || {}).questions || {};
  for (const id of Object.keys(questions)) {
    const answer = Object.prototype.hasOwnProperty.call(answers, id) ? plainObject(answers[id]) : null;
    if (!answer || answer.type !== questions[id].type) throw new Error("Gemini Decisions response has no matching answer for question " + id);
  }
  if (!ctx.publicTaskId) throw new Error("missing gateway request ID");
  return { taskId: ctx.publicTaskId, taskData: body, immediate: { status: "SUCCESS", progress: "100%" } };
}

// Gemini Omni Flash video generation: https://aistudio.google.com/docs/omni
// Requests run as background interactions of the Interactions API and are
// polled; a finished interaction holds the video inline as base64. Video
// output is billed at these tokens per second of video
// (https://aistudio.google.com/docs/pricing#gemini-omni-1.2-flash).
const OMNI_VIDEO_TOKENS_PER_SECOND = { "360p": 1931, "720p": 5792, "1080p": 8688, "4k": 17376 };
const OMNI_RESOLUTIONS = Object.keys(OMNI_VIDEO_TOKENS_PER_SECOND);
const OMNI_IMAGE_TYPES = ["image/jpeg", "image/png"];
const MAX_OMNI_IMAGES = 6;
const DEFAULT_OMNI_SECONDS = 8;
const DEFAULT_API_ROOT = "https://generativelanguage.googleapis.com";

function omniModel(ctx) {
  return trimmed(ctx.upstreamModel || ctx.model).startsWith("gemini-omni-");
}

function interactionsURL(ctx, interactionId) {
  const base = trimmed(ctx.baseUrl).replace(/\/+$/, "") || DEFAULT_API_ROOT;
  const url = base + "/v1beta/interactions";
  return interactionId ? url + "/" + encodeURIComponent(interactionId) : url;
}

function omniHeaders(ctx) {
  return Object.assign({ "Content-Type": "application/json", Accept: "application/json" }, authHeaders(ctx));
}

function sizeParts(size) {
  const parts = String(size || "")
    .toLowerCase()
    .split("x");
  return parts.length === 2 ? [Number(parts[0]), Number(parts[1])] : null;
}

function sizeResolution(size) {
  const parts = sizeParts(size);
  if (!parts) return "720p";
  const max = Math.max(parts[0], parts[1]);
  return max >= 3840 ? "4k" : max >= 1920 ? "1080p" : "720p";
}

function aspect(size) {
  const parts = sizeParts(size);
  return !parts || parts[0] <= 0 || parts[1] <= 0 ? "16:9" : parts[1] > parts[0] ? "9:16" : "16:9";
}

function omniResolution(req) {
  const metadata = plainObject(req.metadata) || {};
  const given = req.resolution !== undefined && req.resolution !== "" ? req.resolution : metadata.resolution;
  const value = String(given !== undefined && given !== "" ? given : sizeResolution(req.size)).toLowerCase();
  if (!OMNI_RESOLUTIONS.includes(value)) throw new Error("resolution must be one of " + OMNI_RESOLUTIONS.join(", "));
  return value;
}

function omniImages(req) {
  return Array.isArray(req.images) ? req.images : [];
}

// Omni 1.2 generates 3 to 15 seconds; Omni 1.1 and first/last-frame
// interpolation (two images) stop at 10, which Google itself rejects.
function omniDuration(ctx, req) {
  const value = req.duration === undefined || req.duration === null || req.duration === "" ? DEFAULT_OMNI_SECONDS : Number(req.duration);
  const short = trimmed(ctx.upstreamModel || ctx.model) === "gemini-omni-1.1-flash" || omniImages(req).length === 2;
  const max = short ? 10 : 15;
  if (!Number.isInteger(value) || value < 3 || value > max) throw new Error("seconds must be a whole number from 3 to " + max);
  return value;
}

// An input image's media type and base64 bytes: an uploaded file placeholder,
// a data URL or bare base64.
function inputImage(ctx, image) {
  let mime = "";
  let data = image;
  if (plainObject(image) && image.__fileRef) {
    mime = String(image.mimeType || "").toLowerCase();
    if (!OMNI_IMAGE_TYPES.includes(mime)) {
      for (const file of ctx.files || []) {
        if (file.ref === image.__fileRef || file.field === "input_reference") {
          mime = String(file.mimeType || "").toLowerCase();
          break;
        }
      }
    }
  } else {
    const text = trimmed(image);
    const comma = text.indexOf(",");
    data = text;
    if (text.startsWith("data:") && comma > 0) {
      mime = text.slice(5, comma).split(";")[0].toLowerCase();
      data = text.slice(comma + 1);
    } else if (text.startsWith("iVBORw0KGgo")) mime = "image/png";
    else if (text.startsWith("/9j/")) mime = "image/jpeg";
  }
  if (!OMNI_IMAGE_TYPES.includes(mime)) throw new Error("input image must be image/jpeg or image/png");
  if (!data) throw new Error("input image is empty");
  return { mime: mime, data: data };
}

function validImageInput(value) {
  value = trimmed(value);
  if (!value) return false;
  if (value.startsWith("data:")) {
    const comma = value.indexOf(",");
    return comma >= 0 && Boolean(value.slice(comma + 1));
  }
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

// Images keep the client's order: one is the first frame, two are the first
// and last frame, more are subject references. The task hint limits the image
// count, so it is only sent for the text-only and single-image forms.
function omniSubmitRequest(ctx) {
  const req = ctx.requestBody || {};
  const images = omniImages(req);
  if (images.length > MAX_OMNI_IMAGES) throw new Error("Gemini Omni takes at most " + MAX_OMNI_IMAGES + " images");
  const input = images.map(function (image) {
    const frame = inputImage(ctx, image);
    return { type: "image", mime_type: frame.mime, data: frame.data };
  });
  if (trimmed(req.prompt)) input.push({ type: "text", text: req.prompt });
  if (!input.length) throw new Error("prompt is required");
  const task = images.length ? "image_to_video" : "text_to_video";
  const body = {
    model: ctx.upstreamModel || ctx.model,
    input: input,
    response_format: { type: "video", aspect_ratio: aspect(req.size), resolution: omniResolution(req), duration: omniDuration(ctx, req) + "s" },
    background: true,
    store: true,
  };
  if (images.length < 2) body.generation_config = { video_config: { task: task } };
  return { url: interactionsURL(ctx), method: "POST", headers: omniHeaders(ctx), body: body, action: task };
}

function omniUsage(ctx) {
  const req = ctx.requestBody || {};
  // Input and text output are only known on completion, which reports them.
  return { input_tokens: 0, output_tokens: 0, video_tokens: omniDuration(ctx, req) * OMNI_VIDEO_TOKENS_PER_SECOND[omniResolution(req)] };
}

function isInteraction(body) {
  return plainObject(body) !== null && (body.object === "interaction" || Array.isArray(body.steps));
}

// The video of a finished interaction: the model_output step holds it inline.
// The path addresses the bytes for a download that fetches the interaction
// again, because the stored interaction keeps only its media type.
function omniVideo(body) {
  const steps = Array.isArray(body.steps) ? body.steps : [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!plainObject(step) || step.type !== "model_output" || !Array.isArray(step.content)) continue;
    for (let j = 0; j < step.content.length; j++) {
      const part = step.content[j];
      if (!plainObject(part) || part.type !== "video") continue;
      return { path: ["steps", i, "content", j, "data"], mimeType: trimmed(part.mime_type) || "video/mp4" };
    }
  }
  return null;
}

function omniTaskResult(body) {
  body = plainObject(body) || {};
  if (plainObject(body.error) && body.error.message) return { status: "FAILURE", progress: "100%", reason: body.error.message };
  const status = trimmed(body.status).toLowerCase();
  if (status === "in_progress" || status === "queued") return { status: "IN_PROGRESS", progress: "50%" };
  if (["failed", "cancelled", "canceled", "expired", "incomplete"].includes(status)) {
    const error = plainObject((Array.isArray(body.errors) ? body.errors : [])[0]) || {};
    const reason = [trimmed(error.code), trimmed(error.message)].filter(Boolean).join(": ");
    return { status: "FAILURE", progress: "100%", reason: reason || status };
  }
  if (status !== "completed") return { status: "UNKNOWN", reason: "unrecognized interaction state" };
  if (!omniVideo(body)) return { status: "FAILURE", progress: "100%", reason: "interaction completed without a video" };
  return { status: "SUCCESS", progress: "100%" };
}

// Thinking counts as text output; video and audio count as video output.
// Facts Google does not report are left out so the reservation stands.
function omniSettlement(body) {
  const usage = plainObject(body && body.usage);
  if (!usage) return null;
  const facts = {};
  if (Number.isInteger(usage.total_input_tokens) && usage.total_input_tokens >= 0) facts.input_tokens = usage.total_input_tokens;
  let text = 0;
  let video = 0;
  let sawText = false;
  let sawVideo = false;
  if (Number.isInteger(usage.total_thought_tokens) && usage.total_thought_tokens >= 0) {
    text += usage.total_thought_tokens;
    sawText = true;
  }
  for (const item of Array.isArray(usage.output_tokens_by_modality) ? usage.output_tokens_by_modality : []) {
    const entry = plainObject(item) || {};
    const tokens = Number.isInteger(entry.tokens) && entry.tokens >= 0 ? entry.tokens : 0;
    const modality = trimmed(entry.modality).toLowerCase();
    if (modality === "video" || modality === "audio") {
      video += tokens;
      sawVideo = true;
    } else {
      text += tokens;
      sawText = true;
    }
  }
  if (sawText) facts.output_tokens = text;
  if (sawVideo) facts.video_tokens = video;
  return facts;
}

// ---- Gemini Omni through another New API gateway ----
// That gateway serves Gemini Omni on its OpenAI video endpoint, so the
// request goes there as an OpenAI video request carrying the checked fields.
// Its video object (with the gateway's own task id) is polled, the video is
// downloaded from its content address, and its usage field holds the facts
// that gateway settled on.

function gatewayVideoURL(ctx, taskId) {
  const url = trimmed(ctx.baseUrl).replace(/\/+$/, "") + "/v1/videos";
  return taskId ? url + "/" + encodeURIComponent(taskId) : url;
}

function gatewayHeaders(ctx) {
  return { "Content-Type": "application/json", Accept: "application/json", Authorization: "Bearer " + ctx.apiKey };
}

function isGatewayVideo(body) {
  return plainObject(body) !== null && body.object === "video";
}

function gatewaySubmitRequest(ctx) {
  const req = ctx.requestBody || {};
  const images = omniImages(req);
  if (images.length > MAX_OMNI_IMAGES) throw new Error("Gemini Omni takes at most " + MAX_OMNI_IMAGES + " images");
  // Uploaded files stay host placeholders, which the host fills with base64.
  const sent = images.map(function (image) {
    inputImage(ctx, image);
    return plainObject(image) && image.__fileRef ? image : trimmed(image);
  });
  if (!trimmed(req.prompt) && !sent.length) throw new Error("prompt is required");
  const body = { model: ctx.upstreamModel || ctx.model, seconds: omniDuration(ctx, req), resolution: omniResolution(req) };
  if (trimmed(req.prompt)) body.prompt = req.prompt;
  if (req.size !== undefined && req.size !== null && req.size !== "") body.size = req.size;
  if (sent.length) body.images = sent;
  return { url: gatewayVideoURL(ctx), method: "POST", headers: gatewayHeaders(ctx), body: body, action: sent.length ? "image_to_video" : "text_to_video" };
}

function gatewayTaskResult(body) {
  body = plainObject(body) || {};
  const status = trimmed(body.status).toLowerCase();
  const value = Number(body.progress);
  const progress = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) + "%" : undefined;
  if (status === "completed") return { status: "SUCCESS", progress: "100%" };
  if (status === "failed") {
    const error = plainObject(body.error) || {};
    return { status: "FAILURE", progress: "100%", reason: trimmed(error.message) || "task failed" };
  }
  if (status === "queued") return { status: "QUEUED", progress: progress || "0%" };
  if (status === "in_progress") return progress ? { status: "IN_PROGRESS", progress: progress } : { status: "IN_PROGRESS" };
  return { status: "UNKNOWN", reason: "unrecognized video status: " + (status || "none") };
}

// The facts the other gateway settled on; missing or malformed ones keep the
// reservation.
function gatewaySettlement(body) {
  const usage = plainObject(body && body.usage);
  if (!usage) return null;
  const facts = {};
  for (const key of ["input_tokens", "output_tokens", "video_tokens"]) {
    if (Number.isInteger(usage[key]) && usage[key] >= 0) facts[key] = usage[key];
  }
  return Object.keys(facts).length ? facts : null;
}

function responsesInput(req) {
  const texts = [],
    images = [];
  const input = req.input;
  if (typeof input === "string") texts.push(input);
  else if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === "string") {
        texts.push(item);
        continue;
      }
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const content = item.content === undefined ? [item] : Array.isArray(item.content) ? item.content : [item.content];
      for (const part of content) {
        if (typeof part === "string") {
          texts.push(part);
          continue;
        }
        if (!part || typeof part !== "object" || Array.isArray(part)) continue;
        if (["input_text", "text"].includes(part.type) && typeof part.text === "string") texts.push(part.text);
        if (["input_image", "image_url"].includes(part.type)) {
          let image = part.image_url;
          if (image && typeof image === "object") image = image.url;
          if (trimmed(image)) images.push(trimmed(image));
        }
      }
    }
  }
  return {
    prompt: texts
      .filter(function (text) {
        return trimmed(text);
      })
      .join("\n"),
    images: images,
  };
}

function responsesVideoText(ctx) {
  const artifact = ctx && ctx.artifacts && ctx.artifacts.video;
  const url = trimmed(artifact && artifact.url);
  if (!url) throw new Error("video artifact is unavailable");
  const escaped = url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return '<video controls src="' + escaped + '"></video>';
}

export const native = {
  decisions: function (ctx) {
    if (!ctx.body || ctx.body.kind !== "json") throw new Error("JSON body required");
    const body = ctx.body.value;
    validateDecisionRequest(body);
    return {
      kind: "submit",
      model: body.model,
      action: DECISION_ACTION,
      requestBody: { model: body.model, input: body.input, questions: body.questions },
    };
  },
  // The Decisions reply as Google sends it: answers and input token usage.
  decided: function (ctx, task) {
    return task.data;
  },
  error: function (ctx, error) {
    return { error: { code: error.httpStatus, message: error.message } };
  },
};

export function buildSubmitRequest(ctx) {
  if (isDecision(ctx)) return decisionRequest(ctx);
  if (!omniModel(ctx)) throw new Error("unsupported model; use gemini-omni-1.2-flash, gemini-omni-1.1-flash or gemini-decision-1");
  return viaGateway(ctx) ? gatewaySubmitRequest(ctx) : omniSubmitRequest(ctx);
}

export function parseSubmitResponse(ctx, resp) {
  if (isDecision(ctx)) return decisionResult(ctx, resp);
  const body = plainObject(resp.body) || {};
  const id = trimmed(body.id);
  if (!id) throw new Error(viaGateway(ctx) ? "the gateway response is missing the video id" : "Gemini Omni response is missing the interaction id");
  return { taskId: id, taskData: body };
}

export function extractUsage(ctx) {
  if (isDecision(ctx)) {
    const tokens = decisionReservation(ctx.requestBody || {});
    if (ctx.usagePurpose === "billing_ratios") return null;
    return { input_tokens: tokens };
  }
  return omniUsage(ctx);
}

export function extractUsageOnComplete(task, result, data) {
  if (isDecision(task, data)) {
    const tokens = plainObject(data) && plainObject(data.usage) ? data.usage.total_input_tokens : undefined;
    // Throwing keeps the reservation and makes the host log the bad usage;
    // a missing count is never billed as zero.
    if (!Number.isInteger(tokens) || tokens < 0 || tokens > DECISION_CONTEXT_TOKENS)
      throw new Error("Gemini Decisions input token usage is missing or outside the context window");
    return { input_tokens: tokens };
  }
  if (isGatewayVideo(data)) return gatewaySettlement(data);
  if (omniModel(task) || isInteraction(data)) return omniSettlement(data);
  return null;
}

export function buildQueryRequest(ctx) {
  if (viaGateway(ctx)) return { url: gatewayVideoURL(ctx, ctx.taskId), method: "GET", headers: { Accept: "application/json", Authorization: "Bearer " + ctx.apiKey } };
  return { url: interactionsURL(ctx, ctx.taskId), method: "GET", headers: Object.assign({ Accept: "application/json" }, authHeaders(ctx)) };
}

export function parseTaskResult(ctx, body) {
  if (viaGateway(ctx) || isGatewayVideo(body)) return gatewayTaskResult(body);
  return omniTaskResult(body);
}

export function listArtifacts(task) {
  if (task.status !== "SUCCESS") return [];
  if (isGatewayVideo(task.data)) return [{ key: "video", type: "video", mimeType: "video/mp4" }];
  if (!isInteraction(task.data)) return [];
  const video = omniVideo(task.data);
  return video ? [{ key: "video", type: "video", mimeType: video.mimeType }] : [];
}

export function buildContentRequest(ctx) {
  if (ctx.artifactKey !== "video") throw new Error("artifact_not_found");
  if (viaGateway(ctx)) {
    if (!trimmed(ctx.upstreamTaskId)) throw new Error("artifact_not_found");
    return {
      url: gatewayVideoURL(ctx, ctx.upstreamTaskId) + "/content",
      method: ctx.clientRequest && ctx.clientRequest.method === "HEAD" ? "HEAD" : "GET",
      headers: { Authorization: "Bearer " + ctx.apiKey },
    };
  }
  if (!isInteraction(ctx.data)) throw new Error("artifact_not_found");
  const video = omniVideo(ctx.data);
  if (!video) throw new Error("artifact_not_found");
  return {
    url: interactionsURL(ctx, ctx.upstreamTaskId),
    method: "GET",
    headers: Object.assign({ Accept: "application/json" }, authHeaders(ctx)),
    responseType: "json",
    contentPath: video.path,
    mimeType: video.mimeType,
  };
}

export const protocols = {
  openai_responses: {
    decodeRequest: function (ctx) {
      if (!ctx.body || ctx.body.kind !== "json") throw new Error("JSON body required");
      const req = ctx.body.value;
      if (!req || typeof req !== "object" || Array.isArray(req)) throw new Error("request body must be an object");
      const model = trimmed(req.model);
      if (!model) throw new Error("model is required");
      if (req.input !== undefined && typeof req.input !== "string" && !Array.isArray(req.input)) throw new Error("input must be a string or array");
      if (req.images !== undefined && !Array.isArray(req.images)) throw new Error("images must be an array");
      if (req.metadata !== undefined && (!req.metadata || typeof req.metadata !== "object" || Array.isArray(req.metadata)))
        throw new Error("metadata must be an object");
      const input = responsesInput(req);
      const prompt = input.prompt || trimmed(req.prompt);
      const images = [];
      for (const image of [req.image, req.input_reference].concat(req.images || [], input.images)) {
        if (trimmed(image) && !images.includes(trimmed(image))) images.push(trimmed(image));
      }
      if (!prompt && images.length === 0) throw new Error("input is required");
      if (images.length > MAX_OMNI_IMAGES) throw new Error("Gemini Omni takes at most " + MAX_OMNI_IMAGES + " images");
      if (!images.every(validImageInput)) throw new Error("input image must be a data URL or base64 value");
      const metadata = Object.assign({}, req.metadata || {});
      if (Object.prototype.hasOwnProperty.call(req, "resolution")) metadata.resolution = req.resolution;
      const requestBody = { model: model, prompt: prompt, metadata: metadata };
      if (images.length) requestBody.images = images;
      if (Object.prototype.hasOwnProperty.call(req, "seconds")) requestBody.duration = req.seconds;
      else if (Object.prototype.hasOwnProperty.call(req, "duration")) requestBody.duration = req.duration;
      if (Object.prototype.hasOwnProperty.call(req, "size")) requestBody.size = req.size;
      return { kind: "submit", model: model, action: images.length ? "image_to_video" : "text_to_video", requestBody: requestBody };
    },
    renderEvents: function (ctx, task, previousState) {
      const status = String(task.status || "UNKNOWN").toUpperCase();
      const value = Number(String(task.progress || "").replace("%", ""));
      const progress = Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
      const state = { status: status, progress: progress };
      if (status === "SUCCESS") {
        const events = previousState && previousState.status === status ? [] : [{ type: "output", data: responsesVideoText(ctx) }];
        return { events: events, state: state, done: true };
      }
      if (status === "FAILURE")
        return { events: [{ type: "error", code: "task_failed", message: task.fail_reason || "task failed" }], state: state, done: true };
      if (previousState && previousState.status === status && previousState.progress === progress) return { events: [], state: state, done: false };
      const event = { type: "progress", message: status.toLowerCase() };
      if (progress !== null) event.progress = progress;
      return { events: [event], state: state, done: false };
    },
    renderFinal: function (ctx, _task) {
      return {
        output: [
          {
            type: "message",
            status: "completed",
            role: "assistant",
            content: [{ type: "output_text", text: responsesVideoText(ctx), annotations: [], logprobs: [] }],
          },
        ],
        metadata: { vendor: "gemini" },
      };
    },
  },
};

const legacyRenderers = {
  openai_video: function (task) {
    const model = (task.properties || {}).origin_model_name || "gemini-omni-1.2-flash";
    const statuses = { NOT_START: "queued", SUBMITTED: "queued", QUEUED: "queued", IN_PROGRESS: "in_progress", SUCCESS: "completed", FAILURE: "failed" };
    const output = {
      id: task.task_id,
      object: "video",
      model: model,
      status: statuses[task.status] || "unknown",
      progress: Number(String(task.progress || "0").replace("%", "")),
      created_at: task.created_at,
    };
    if (Number(task.finish_time) > 0) output.completed_at = Number(task.finish_time);
    else if (Number(task.updated_at) > 0) output.completed_at = Number(task.updated_at);
    // The billed usage facts, which a gateway in front of this one settles on.
    const usage = task.status === "SUCCESS" && isInteraction(task.data) ? omniSettlement(task.data) : null;
    if (usage && Object.keys(usage).length) output.usage = usage;
    return output;
  },
};

protocols.openai_video = {
  decodeRequest: function (ctx) {
    if (!ctx.body || (ctx.body.kind !== "json" && ctx.body.kind !== "multipart")) throw new Error("JSON or multipart body required");
    let req;
    let hasInputReferenceFile = false;
    if (ctx.body.kind === "json") {
      if (!plainObject(ctx.body.value)) throw new Error("JSON object required");
      req = Object.assign({}, ctx.body.value);
      if (req.images !== undefined && !Array.isArray(req.images)) throw new Error("images must be an array");
      const images = [];
      for (const image of [req.image, req.input_reference].concat(req.images || [])) {
        if (trimmed(image) && !images.includes(trimmed(image))) images.push(trimmed(image));
      }
      if (!images.every(validImageInput)) throw new Error("input image must be a data URL or base64 value");
      delete req.image;
      delete req.input_reference;
      if (images.length) req.images = images;
      else delete req.images;
    } else {
      const first = function (name) {
        const values = (ctx.body.fields || {})[name] || [];
        if (values.length > 1) throw new Error(name + " must be provided once");
        return values[0];
      };
      req = {};
      const fields = ctx.body.fields || {};
      for (const name of Object.keys(fields)) {
        req[name] = first(name);
      }
      for (const file of ctx.body.files || []) {
        if (file.field !== "input_reference") throw new Error("unexpected file field: " + file.field);
        if (hasInputReferenceFile) throw new Error("input_reference must be provided once");
        if (!OMNI_IMAGE_TYPES.includes(String(file.mimeType || "").toLowerCase())) throw new Error("input_reference must be image/jpeg or image/png");
        hasInputReferenceFile = true;
      }
      if (req.metadata !== undefined) {
        let parsed;
        try {
          parsed = JSON.parse(req.metadata);
        } catch {
          throw new Error("metadata must be a JSON object string");
        }
        if (!plainObject(parsed)) throw new Error("metadata must be a JSON object string");
        req.metadata = parsed;
      }
      if (hasInputReferenceFile) req.images = [{ __fileRef: "request_file:input_reference", encoding: "base64", maxBytes: 20971520 }];
    }
    const seconds = req.seconds !== undefined ? req.seconds : req.duration;
    delete req.seconds;
    if (seconds !== undefined && seconds !== "") {
      const n = Number(seconds);
      if (!Number.isInteger(n) || n < 3 || n > 15) throw new Error("seconds must be a whole number from 3 to 15");
      req.duration = n;
    } else delete req.duration;
    const given = req.resolution !== undefined ? req.resolution : req.metadata && req.metadata.resolution;
    if (given !== undefined && given !== "" && !OMNI_RESOLUTIONS.includes(String(given).toLowerCase()))
      throw new Error("resolution must be one of " + OMNI_RESOLUTIONS.join(", "));
    if ((req.images || []).length > MAX_OMNI_IMAGES) throw new Error("Gemini Omni takes at most " + MAX_OMNI_IMAGES + " images");
    return {
      kind: "submit",
      model: ctx.model,
      action: req.images ? "image_to_video" : "text_to_video",
      requestBody: Object.assign({}, req, { model: ctx.model }),
    };
  },
  render: function (ctx, task) {
    return legacyRenderers.openai_video(task);
  },
};

// ---------------------------------------------------------------------------
// Gemini API text, embeddings and images (relay routes)
//
//   - Gemini native generateContent / streamGenerateContent, embedContent and
//     batchEmbedContents go to the Gemini API through new-api's own Gemini
//     handling: request conversion, replies, streams and billing are those of
//     the built-in Gemini channel. prepareRequest only picks the streaming
//     path (`:streamGenerateContent?alt=sse`) and the configured API version.
//   - OpenAI chat completions and OpenAI Responses use new-api's converters
//     to Gemini generateContent; replies and billing are new-api's as well.
//   - Claude Messages: new-api turns the request into OpenAI chat, this plugin
//     converts that to Gemini and the Gemini reply back to OpenAI chat with
//     the usage new-api derives from Gemini usage metadata, and new-api
//     answers the client in Claude format.
//   - OpenAI embeddings become batchEmbedContents; OpenAI image generation
//     becomes generateContent on a Gemini image model.
//   - The model list reads every page of the Gemini model list.

const DEFAULT_API_VERSION = "v1beta";
const API_VERSIONS = ["v1beta", "v1", "v1alpha"];
const MODEL_LIST_PAGE_SIZE = 1000;
// Model list entries the relay routes serve, by their generation methods.
const SERVED_METHODS = ["generateContent", "streamGenerateContent", "embedContent", "batchEmbedContents"];
// new-api's Gemini settings: safety off for every category, and a dummy
// thought signature on replayed function calls so Gemini 3 and later accept
// history that went through another protocol.
const SAFETY_CATEGORIES = [
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
];
const SAFETY_THRESHOLD = "OFF";
const THOUGHT_SIGNATURE_BYPASS = "context_engineering_is_the_way_to_go";
const MAX_STOP_SEQUENCES = 5;
const THINKING_BUDGETS = { minimal: 512, low: 1024, medium: 8192, high: 24576 };
// Gemini image models return one image per request; n images take n requests.
const MAX_IMAGES = 4;
const IMAGE_ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

// Conversion kinds, kept in the request state.
const KIND_CHAT = "chat"; // Claude client: OpenAI chat <-> Gemini
const KIND_EMBED = "embed"; // OpenAI embeddings <-> batchEmbedContents
const KIND_IMAGE = "image"; // OpenAI images <-> generateContent with image output
const KIND_MODELS = "models"; // model list pages

const GENERATE_PATH = /^\/(v1beta|v1|v1alpha)\/models\/([^/?]+):(generateContent|streamGenerateContent)(\?.*)?$/;
const MODEL_ACTION_PATH = /^\/(v1beta|v1|v1alpha)(\/models\/[^?]+)$/;

function requestError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function apiVersion(ctx) {
  const version = ctx && isObject(ctx.config) ? ctx.config.apiVersion : undefined;
  return API_VERSIONS.indexOf(version) >= 0 ? version : DEFAULT_API_VERSION;
}

function checkModel(model) {
  if (typeof model !== "string" || model === "" || /[\s/?#%]/.test(model)) {
    throw requestError("invalid model name: " + JSON.stringify(model));
  }
  return model;
}

function modelPath(ctx, model, action) {
  return "/" + apiVersion(ctx) + "/models/" + checkModel(model) + ":" + action;
}

function generatePath(ctx, model, stream) {
  return stream ? modelPath(ctx, model, "streamGenerateContent") + "?alt=sse" : modelPath(ctx, model, "generateContent");
}

// The upstream path of a request on a host-converted route: the streaming
// action for a native streamGenerateContent client, and the configured API
// version. Nothing else of the request changes.
export function prepareRequest(ctx, request) {
  const upstream = String((request && request.upstreamPath) || "");
  const version = apiVersion(ctx);
  const client = String((request && request.path) || (ctx && ctx.path) || "").split("?")[0];
  const generate = GENERATE_PATH.exec(upstream);
  if (generate && /^\/(v1beta|v1)\/models\/[^/]+:streamGenerateContent$/.test(client)) {
    return { path: "/" + version + "/models/" + generate[2] + ":streamGenerateContent?alt=sse" };
  }
  const match = MODEL_ACTION_PATH.exec(upstream);
  if (match && match[1] !== version) return { path: "/" + version + match[2] };
  return null;
}

// Optional ?key= for relays that read the key from the query string.
export function signRequest(ctx) {
  if (isObject(ctx.config) && ctx.config.keyInQuery === true && ctx.apiKey) {
    return { query: { key: String(ctx.apiKey) } };
  }
  return {};
}

// ---------------------------------------------------------------------------
// Request conversion (plugin-converted routes)

export function convertRequest(ctx, request) {
  const path = String(ctx.path || "");
  const model = request.model;
  const stream = request.stream === true;
  switch (path) {
    case "/v1/messages":
      // new-api already turned the Claude request into an OpenAI chat request.
      return {
        body: chatToGemini(request.body, model),
        path: generatePath(ctx, model, stream),
        stream: stream,
        state: { kind: KIND_CHAT, model: model, stream: stream },
      };
    case "/v1/embeddings":
      return {
        body: embeddingsToGemini(request.body, model),
        path: modelPath(ctx, model, "batchEmbedContents"),
        stream: false,
        state: { kind: KIND_EMBED, model: model },
      };
    case "/v1/images/generations": {
      const image = imageRequest(request.body, model);
      return {
        body: image.body,
        path: modelPath(ctx, model, "generateContent"),
        stream: false,
        state: { kind: KIND_IMAGE, model: model, path: modelPath(ctx, model, "generateContent"), body: image.body, n: image.n, images: [], usage: {} },
      };
    }
    default:
      throw requestError("unsupported path for this channel: " + path);
  }
}

// ---------------------------------------------------------------------------
// Response conversion

export function convertResponse(ctx, response) {
  const state = isObject(ctx.state) ? ctx.state : null;
  const status = Number(response.status) || 0;
  const success = status >= 200 && status < 300;
  if (String(ctx.path || "") === "/v1/models" || (state && state.kind === KIND_MODELS)) {
    return convertModelList(response, state);
  }
  // Errors keep new-api's usual error path with the upstream status and body.
  if (!success || typeof response.body !== "string") {
    return response.bodyBase64 !== undefined
      ? { bodyBase64: response.bodyBase64, contentType: headerValue(response.headers, "content-type") || "application/octet-stream" }
      : { body: String(response.body === undefined ? "" : response.body), contentType: headerValue(response.headers, "content-type") || "application/json" };
  }
  const parsed = parseJSON(response.body);
  if (!isObject(parsed)) return { error: { status: 502, message: "upstream returned a body that is not a JSON object" } };
  switch (state && state.kind) {
    case KIND_CHAT:
      return geminiToChatReply(parsed, state.model);
    case KIND_EMBED:
      return geminiToEmbeddings(parsed, state.model);
    case KIND_IMAGE:
      return geminiToImages(parsed, state);
    default:
      return { body: response.body, contentType: "application/json" };
  }
}

export function convertStreamEvent(ctx, input) {
  const state = isObject(ctx.state) ? ctx.state : {};
  if (state.kind === KIND_CHAT) return chatStreamEvent(state, input);
  if (input.done) return {};
  if (input.dataBase64 !== undefined) return { chunks: [{ bodyBase64: input.dataBase64 }] };
  const event = { data: String(input.data === undefined ? "" : input.data) };
  if (input.event) event.event = input.event;
  return { events: [event] };
}

function headerValue(headers, name) {
  if (!isObject(headers)) return "";
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return String(headers[key]);
  }
  return "";
}

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Model list: Gemini /models pages -> OpenAI model list of the models this
// plugin serves (text, embeddings, images through the relay routes, plus its
// Omni and Decision task models).

export function servedModel(item) {
  if (!isObject(item) || typeof item.name !== "string") return "";
  const name = item.name.replace(/^models\//, "");
  if (!name) return "";
  if (TASK_MODEL_IDS.indexOf(name) >= 0) return name;
  const methods = item.supportedGenerationMethods;
  // A list without methods (a relay that only names models) is kept whole.
  if (!Array.isArray(methods)) return name;
  return methods.some(function (method) { return SERVED_METHODS.indexOf(method) >= 0; }) ? name : "";
}

function convertModelList(response, state) {
  const status = Number(response.status) || 0;
  if (status < 200 || status >= 300) {
    return { error: { status: status || 502, message: "model list request failed with status " + status } };
  }
  const parsed = parseJSON(response.body);
  if (!isObject(parsed)) return { error: { status: 502, message: "model list reply is not a JSON object" } };
  const ids = isObject(state) && Array.isArray(state.ids) ? state.ids.slice() : [];
  for (const item of Array.isArray(parsed.models) ? parsed.models : []) {
    const name = servedModel(item);
    if (name && ids.indexOf(name) < 0) ids.push(name);
  }
  if (typeof parsed.nextPageToken === "string" && parsed.nextPageToken !== "") {
    return {
      next: { method: "GET", path: "/v1beta/models?pageSize=" + MODEL_LIST_PAGE_SIZE + "&pageToken=" + encodeURIComponent(parsed.nextPageToken) },
      state: { kind: KIND_MODELS, ids: ids },
    };
  }
  for (const id of TASK_MODEL_IDS) {
    if (ids.indexOf(id) < 0) ids.push(id);
  }
  return {
    body: { object: "list", data: ids.map(function (id) { return { id: id, object: "model", owned_by: "google" }; }) },
    contentType: "application/json",
  };
}

// ---------------------------------------------------------------------------
// Usage: Gemini usageMetadata -> OpenAI usage, the numbers new-api derives
// from it on the built-in Gemini channel.

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function hasUsageTokens(metadata) {
  if (!isObject(metadata)) return false;
  return num(metadata.promptTokenCount) > 0 || num(metadata.candidatesTokenCount) > 0 ||
    num(metadata.thoughtsTokenCount) > 0 || num(metadata.totalTokenCount) > 0 ||
    num(metadata.toolUsePromptTokenCount) > 0 || num(metadata.cachedContentTokenCount) > 0;
}

// Later non-zero members win, as new-api merges stream usage.
export function mergeUsageMetadata(base, next) {
  const merged = Object.assign({}, isObject(base) ? base : {});
  if (!isObject(next)) return merged;
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (Array.isArray(value) ? value.length > 0 : (typeof value === "number" ? value !== 0 : value !== null && value !== undefined)) {
      merged[key] = value;
    }
  }
  return merged;
}

function addModality(details, list) {
  if (!Array.isArray(list)) return;
  for (const item of list) {
    if (!isObject(item)) continue;
    const modality = String(item.modality || "").toUpperCase();
    const count = num(item.tokenCount);
    if (modality === "TEXT") details.text_tokens += count;
    else if (modality === "AUDIO") details.audio_tokens += count;
    else if (modality === "IMAGE") details.image_tokens += count;
  }
}

export function usageFromMetadata(metadata) {
  const m = isObject(metadata) ? metadata : {};
  const prompt = num(m.promptTokenCount) + num(m.toolUsePromptTokenCount);
  let completion = num(m.candidatesTokenCount) + num(m.thoughtsTokenCount);
  const total = num(m.totalTokenCount);
  if (total > 0 && completion <= 0) completion = Math.max(total - prompt, 0);
  const promptDetails = { cached_tokens: num(m.cachedContentTokenCount), text_tokens: 0, audio_tokens: 0, image_tokens: 0 };
  addModality(promptDetails, m.promptTokensDetails);
  addModality(promptDetails, m.toolUsePromptTokensDetails);
  if (prompt > 0 && promptDetails.text_tokens === 0 && promptDetails.audio_tokens === 0) {
    promptDetails.text_tokens = prompt;
  }
  const completionDetails = { text_tokens: 0, audio_tokens: 0, image_tokens: 0, reasoning_tokens: num(m.thoughtsTokenCount) };
  addModality(completionDetails, m.candidatesTokensDetails);
  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: total > 0 ? total : prompt + completion,
    prompt_tokens_details: promptDetails,
    completion_tokens_details: completionDetails,
  };
}

// Google Search grounding, counted like new-api's Gemini handler: unique
// non-empty web and image search queries, plus one grounded prompt.
function collectQueries(reply, seen) {
  const queries = Array.isArray(seen) ? seen.slice() : [];
  const candidates = Array.isArray(reply.candidates) ? reply.candidates : [];
  for (const candidate of candidates) {
    const grounding = isObject(candidate) && isObject(candidate.groundingMetadata) ? candidate.groundingMetadata : null;
    if (!grounding) continue;
    const all = [].concat(Array.isArray(grounding.webSearchQueries) ? grounding.webSearchQueries : [],
      Array.isArray(grounding.imageSearchQueries) ? grounding.imageSearchQueries : []);
    for (const query of all) {
      const text = String(query === null || query === undefined ? "" : query).trim();
      if (text && queries.indexOf(text) < 0) queries.push(text);
    }
  }
  return queries;
}

function groundingTools(queries) {
  if (!Array.isArray(queries) || queries.length === 0) return undefined;
  return { google_search: queries.length, google_search_grounded_prompt: 1 };
}

// ---------------------------------------------------------------------------
// OpenAI chat -> Gemini (Claude clients; new-api turned Claude into chat)

function stringContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return content === null || content === undefined ? "" : String(content);
  return content.map(function (part) {
    return isObject(part) && (part.type === "text" || part.type === "input_text") ? String(part.text || "") : "";
  }).join("");
}

function parseDataURL(url) {
  const match = /^data:([^;,]*)(;[^,]*)?,([\s\S]*)$/.exec(url);
  if (!match) return null;
  const params = String(match[2] || "");
  if (params.indexOf(";base64") < 0) return null;
  return { mimeType: match[1] || "application/octet-stream", data: match[3] };
}

const EXTENSION_MIME = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
  heic: "image/heic", heif: "image/heif", pdf: "application/pdf", mp3: "audio/mp3", wav: "audio/wav",
  mp4: "video/mp4", mov: "video/mov", webm: "video/webm",
};

function guessMime(url, fallback) {
  const clean = String(url).split(/[?#]/)[0];
  const ext = clean.slice(clean.lastIndexOf(".") + 1).toLowerCase();
  return EXTENSION_MIME[ext] || fallback;
}

function mediaPart(url, fallbackMime) {
  const text = String(url || "");
  const data = parseDataURL(text);
  if (data) return { inlineData: { mimeType: data.mimeType, data: data.data } };
  if (/^https?:\/\//i.test(text) || /^gs:\/\//i.test(text)) {
    return { fileData: { mimeType: guessMime(text, fallbackMime), fileUri: text } };
  }
  throw requestError("unsupported media reference: only data URLs and http(s) URLs are accepted");
}

function contentParts(content) {
  if (typeof content === "string") return content === "" ? [] : [{ text: content }];
  if (!Array.isArray(content)) return [];
  const parts = [];
  for (const part of content) {
    if (!isObject(part)) continue;
    switch (part.type) {
      case "text":
        if (part.text) parts.push({ text: String(part.text) });
        break;
      case "image_url": {
        const url = isObject(part.image_url) ? part.image_url.url : part.image_url;
        parts.push(mediaPart(url, "image/jpeg"));
        break;
      }
      case "input_audio": {
        const audio = isObject(part.input_audio) ? part.input_audio : {};
        if (audio.data) parts.push({ inlineData: { mimeType: "audio/" + String(audio.format || "wav"), data: String(audio.data) } });
        break;
      }
      case "file": {
        const file = isObject(part.file) ? part.file : {};
        if (file.file_data) parts.push(mediaPart(file.file_data, "application/pdf"));
        else if (file.file_id) throw requestError("file_id references are not supported on this channel");
        break;
      }
      default:
        break;
    }
  }
  return parts;
}

const SCHEMA_KEYS = ["type", "format", "description", "nullable", "enum", "properties", "required", "items",
  "minItems", "maxItems", "minimum", "maximum", "minLength", "maxLength", "pattern", "anyOf",
  "propertyOrdering", "title", "minProperties", "maxProperties"];

// Keeps the OpenAPI subset Gemini function declarations accept.
export function cleanSchema(schema) {
  if (Array.isArray(schema)) return schema.map(cleanSchema);
  if (!isObject(schema)) return schema;
  const out = {};
  for (const key of Object.keys(schema)) {
    if (SCHEMA_KEYS.indexOf(key) < 0) continue;
    const value = schema[key];
    if (key === "properties" && isObject(value)) {
      const props = {};
      for (const name of Object.keys(value)) props[name] = cleanSchema(value[name]);
      out.properties = props;
    } else if (key === "items" || key === "anyOf") {
      out[key] = cleanSchema(value);
    } else if (key === "type" && Array.isArray(value)) {
      const types = value.filter(function (t) { return t !== "null"; });
      if (types.length < value.length) out.nullable = true;
      if (types.length > 0) out.type = types[0];
    } else {
      out[key] = value;
    }
  }
  if (Array.isArray(out.enum)) out.enum = out.enum.filter(function (v) { return v !== null; }).map(String);
  return out;
}

function toolConfig(choice) {
  if (choice === undefined || choice === null) return undefined;
  if (typeof choice === "string") {
    const mode = { auto: "AUTO", none: "NONE", required: "ANY" }[choice];
    return mode ? { functionCallingConfig: { mode: mode } } : undefined;
  }
  if (isObject(choice) && isObject(choice.function) && choice.function.name) {
    return { functionCallingConfig: { mode: "ANY", allowedFunctionNames: [String(choice.function.name)] } };
  }
  return undefined;
}

function isGemini3OrLater(model) {
  const match = /^gemini-(\d+)/.exec(String(model));
  return match ? Number(match[1]) >= 3 : false;
}

function thinkingConfig(body, model) {
  let effort = typeof body.reasoning_effort === "string" ? body.reasoning_effort : "";
  let budget;
  let include = true;
  const reasoning = isObject(body.reasoning) ? body.reasoning : null;
  if (reasoning) {
    if (typeof reasoning.effort === "string") effort = reasoning.effort;
    if (Number.isInteger(reasoning.max_tokens)) budget = reasoning.max_tokens;
    if (reasoning.exclude === true) include = false;
    if (reasoning.enabled === false) effort = "none";
  }
  if (!effort && budget === undefined) return undefined;
  if (effort === "none") {
    return isGemini3OrLater(model) ? { thinkingLevel: "low" } : { thinkingBudget: /-pro/.test(model) ? 128 : 0 };
  }
  if (isGemini3OrLater(model)) {
    const level = effort || (budget !== undefined && budget <= THINKING_BUDGETS.low ? "low" : "high");
    return { thinkingLevel: level === "medium" || level === "minimal" || level === "low" ? level : "high", includeThoughts: include };
  }
  return { thinkingBudget: budget !== undefined ? budget : (THINKING_BUDGETS[effort] || THINKING_BUDGETS.medium), includeThoughts: include };
}

function isImageModel(model) {
  return /-image(-|$)/.test(String(model)) || /nano-banana/.test(String(model));
}

export function chatToGemini(body, model) {
  if (!isObject(body)) throw requestError("request body must be a JSON object");
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const contents = [];
  const system = [];
  const callNames = {};

  for (const message of messages) {
    if (!isObject(message)) continue;
    const role = String(message.role || "user");
    if (role === "system" || role === "developer") {
      const text = stringContent(message.content);
      if (text) system.push(text);
      continue;
    }
    if (role === "tool" || role === "function") {
      if (contents.length === 0 || contents[contents.length - 1].role === "model") {
        contents.push({ role: "user", parts: [] });
      }
      const name = message.name ? String(message.name) : (callNames[message.tool_call_id] || "");
      const text = stringContent(message.content);
      let response = parseJSON(text);
      if (Array.isArray(response)) response = { result: response };
      else if (!isObject(response)) response = { content: text };
      const functionResponse = { name: name, response: response };
      if (message.tool_call_id) functionResponse.id = String(message.tool_call_id);
      contents[contents.length - 1].parts.push({ functionResponse: functionResponse });
      continue;
    }
    const isModel = role === "assistant" || role === "model";
    const parts = [];
    let signed = false;
    if (Array.isArray(message.tool_calls)) {
      for (const call of message.tool_calls) {
        if (!isObject(call) || !isObject(call.function)) continue;
        let args = {};
        const raw = call.function.arguments;
        if (typeof raw === "string" && raw !== "") {
          args = parseJSON(raw);
          if (!isObject(args)) throw requestError("invalid arguments for function " + call.function.name);
        } else if (isObject(raw)) {
          args = raw;
        }
        const functionCall = { name: String(call.function.name || ""), args: args };
        if (call.id) functionCall.id = String(call.id);
        const part = { functionCall: functionCall };
        if (isModel && !signed) {
          part.thoughtSignature = THOUGHT_SIGNATURE_BYPASS;
          signed = true;
        }
        parts.push(part);
        if (call.id) callNames[call.id] = functionCall.name;
      }
    }
    for (const part of contentParts(message.content)) parts.push(part);
    if (isModel && !signed) {
      for (const part of parts) {
        if (typeof part.text === "string" && part.text !== "") {
          part.thoughtSignature = THOUGHT_SIGNATURE_BYPASS;
          break;
        }
      }
    }
    if (parts.length > 0) contents.push({ role: isModel ? "model" : "user", parts: parts });
  }

  const request = { contents: contents };
  if (system.length > 0) request.systemInstruction = { parts: [{ text: system.join("\n") }] };

  const generationConfig = {};
  if (typeof body.temperature === "number") generationConfig.temperature = body.temperature;
  if (typeof body.top_p === "number") generationConfig.topP = body.top_p;
  if (Number.isInteger(body.max_completion_tokens)) generationConfig.maxOutputTokens = body.max_completion_tokens;
  else if (Number.isInteger(body.max_tokens)) generationConfig.maxOutputTokens = body.max_tokens;
  if (Number.isInteger(body.seed)) generationConfig.seed = body.seed;
  const stop = typeof body.stop === "string" ? [body.stop] : (Array.isArray(body.stop) ? body.stop.filter(function (s) { return typeof s === "string" && s !== ""; }) : []);
  if (stop.length > 0) generationConfig.stopSequences = stop.slice(0, MAX_STOP_SEQUENCES);
  const format = isObject(body.response_format) ? body.response_format : null;
  if (format && (format.type === "json_object" || format.type === "json_schema")) {
    generationConfig.responseMimeType = "application/json";
    if (format.type === "json_schema" && isObject(format.json_schema) && isObject(format.json_schema.schema)) {
      generationConfig.responseSchema = cleanSchema(format.json_schema.schema);
    }
  }
  if (isImageModel(model)) generationConfig.responseModalities = ["TEXT", "IMAGE"];
  const thinking = thinkingConfig(body, model);
  if (thinking) generationConfig.thinkingConfig = thinking;
  if (Object.keys(generationConfig).length > 0) request.generationConfig = generationConfig;

  request.safetySettings = SAFETY_CATEGORIES.map(function (category) {
    return { category: category, threshold: SAFETY_THRESHOLD };
  });

  if (Array.isArray(body.tools) && body.tools.length > 0) {
    const declarations = [];
    for (const tool of body.tools) {
      if (!isObject(tool) || !isObject(tool.function)) continue;
      const declaration = { name: String(tool.function.name || "") };
      if (tool.function.description) declaration.description = String(tool.function.description);
      if (isObject(tool.function.parameters)) declaration.parameters = cleanSchema(tool.function.parameters);
      declarations.push(declaration);
    }
    if (declarations.length > 0) request.tools = [{ functionDeclarations: declarations }];
    const config = toolConfig(body.tool_choice);
    if (config) request.toolConfig = config;
  }
  return request;
}

// ---------------------------------------------------------------------------
// Gemini -> OpenAI chat (Claude clients). The chat reply names the model the
// Gemini reply reports (modelVersion), else the upstream model of the request.

const FINISH_REASONS = { STOP: "stop", MAX_TOKENS: "length", CONTINUATION: "length" };

function finishReason(reason) {
  if (!reason || reason === "FINISH_REASON_UNSPECIFIED") return null;
  return FINISH_REASONS[reason] || "content_filter";
}

function replyModel(reply, fallback) {
  return isObject(reply) && typeof reply.modelVersion === "string" && reply.modelVersion !== "" ? reply.modelVersion : fallback;
}

function toolCall(part, index) {
  const call = part.functionCall;
  const result = {
    id: call.id ? String(call.id) : "call_" + randomId(),
    type: "function",
    function: { name: String(call.name || ""), arguments: JSON.stringify(isObject(call.args) ? call.args : {}) },
  };
  if (index !== undefined) result.index = index;
  return result;
}

// Host utilities when present (new-api provides utils.unixNow / utils.uuid),
// else the JavaScript clock and Math.random.
function hostUtils() {
  return typeof utils !== "undefined" && utils ? utils : null;
}

function nowSeconds() {
  const host = hostUtils();
  return host && typeof host.unixNow === "function" ? Math.floor(Number(host.unixNow())) : Math.floor(Date.now() / 1000);
}

function randomId() {
  const host = hostUtils();
  if (host && typeof host.uuid === "function") return String(host.uuid()).replace(/-/g, "");
  let id = "";
  for (let i = 0; i < 24; i++) id += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)];
  return id;
}

// Text, reasoning, tool calls and media of one candidate, as new-api's
// Gemini-to-OpenAI conversion renders them.
function candidateOutput(candidate, firstToolIndex) {
  const texts = [];
  const thoughts = [];
  const calls = [];
  const parts = isObject(candidate.content) && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
  for (const part of parts) {
    if (!isObject(part)) continue;
    if (isObject(part.inlineData)) {
      const mime = String(part.inlineData.mimeType || "");
      const label = mime.indexOf("image") === 0 ? "![image]" : "[media]";
      texts.push(label + "(data:" + mime + ";base64," + String(part.inlineData.data || "") + ")");
    } else if (isObject(part.functionCall)) {
      calls.push(toolCall(part, firstToolIndex === undefined ? undefined : firstToolIndex + calls.length));
    } else if (part.thought === true) {
      thoughts.push(String(part.text || ""));
    } else if (isObject(part.executableCode)) {
      texts.push("```" + String(part.executableCode.language || "") + "\n" + String(part.executableCode.code || "") + "\n```");
    } else if (isObject(part.codeExecutionResult)) {
      texts.push("```output\n" + String(part.codeExecutionResult.output || "") + "\n```");
    } else if (typeof part.text === "string" && part.text !== "\n") {
      texts.push(part.text);
    }
  }
  return { text: texts.join("\n"), reasoning: thoughts.join(""), calls: calls };
}

function blockedError(reply) {
  const feedback = isObject(reply.promptFeedback) ? reply.promptFeedback : null;
  if (feedback && feedback.blockReason) {
    return { error: { status: 400, message: "request blocked by Gemini API: " + feedback.blockReason, code: "prompt_blocked" } };
  }
  return { error: { status: 500, message: "empty response from Gemini API", code: "empty_response" } };
}

function upstreamError(reply) {
  return { error: { status: num(reply.error.code) >= 400 ? num(reply.error.code) : 502, message: String(reply.error.message || "upstream error") } };
}

export function geminiToChatReply(reply, model) {
  if (isObject(reply.error)) return upstreamError(reply);
  const candidates = Array.isArray(reply.candidates) ? reply.candidates : [];
  if (candidates.length === 0) return blockedError(reply);
  const choices = candidates.map(function (candidate, position) {
    const output = candidateOutput(candidate, undefined);
    const message = { role: "assistant", content: output.text };
    if (output.reasoning) message.reasoning_content = output.reasoning;
    let reason = finishReason(candidate.finishReason) || "stop";
    if (output.calls.length > 0) {
      message.tool_calls = output.calls;
      reason = "tool_calls";
    }
    return { index: Number.isInteger(candidate.index) ? candidate.index : position, message: message, finish_reason: reason };
  });
  const result = {
    body: {
      id: reply.responseId ? "chatcmpl-" + reply.responseId : "chatcmpl-" + randomId(),
      object: "chat.completion",
      created: nowSeconds(),
      model: replyModel(reply, model),
      choices: choices,
    },
    contentType: "application/json",
  };
  if (hasUsageTokens(reply.usageMetadata)) result.body.usage = usageFromMetadata(reply.usageMetadata);
  const tools = groundingTools(collectQueries(reply, []));
  if (tools) result.tools = tools;
  return result;
}

function chatChunk(state, choices, usage) {
  const chunk = {
    id: state.id,
    object: "chat.completion.chunk",
    created: state.created,
    model: state.model,
    choices: choices,
  };
  if (usage) chunk.usage = usage;
  return { data: JSON.stringify(chunk) };
}

// Gemini SSE events -> OpenAI chat chunks. State: id, created, model, sent
// role, next tool index per candidate, tool call seen, merged usage, queries.
function chatStreamEvent(state, input) {
  const next = Object.assign({}, state);
  if (!next.id) {
    next.id = "chatcmpl-" + randomId();
    next.created = nowSeconds();
    next.toolIndex = {};
    next.queries = [];
  }
  if (input.done) {
    const events = [];
    if (hasUsageTokens(next.usage)) events.push(chatChunk(next, [], usageFromMetadata(next.usage)));
    events.push({ data: "[DONE]" });
    const result = { events: events, state: next };
    const tools = groundingTools(next.queries);
    if (tools) result.tools = tools;
    return result;
  }
  const reply = parseJSON(String(input.data === undefined ? "" : input.data));
  if (!isObject(reply)) return { state: next };
  if (isObject(reply.error)) return upstreamError(reply);
  next.model = replyModel(reply, next.model);
  if (isObject(reply.usageMetadata)) next.usage = mergeUsageMetadata(next.usage, reply.usageMetadata);
  next.queries = collectQueries(reply, next.queries);
  const candidates = Array.isArray(reply.candidates) ? reply.candidates : [];
  if (candidates.length === 0 && !next.sent && isObject(reply.promptFeedback) && reply.promptFeedback.blockReason) {
    return blockedError(reply);
  }
  const choices = [];
  next.toolIndex = Object.assign({}, next.toolIndex);
  for (let position = 0; position < candidates.length; position++) {
    const candidate = candidates[position];
    if (!isObject(candidate)) continue;
    const index = Number.isInteger(candidate.index) ? candidate.index : position;
    const first = next.toolIndex[index] || 0;
    const output = candidateOutput(candidate, first);
    const delta = {};
    if (!next.sent) delta.role = "assistant";
    if (output.reasoning) delta.reasoning_content = output.reasoning;
    if (output.text) delta.content = output.text;
    if (output.calls.length > 0) {
      delta.tool_calls = output.calls;
      next.toolIndex[index] = first + output.calls.length;
      next.sawTool = true;
    }
    let reason = finishReason(candidate.finishReason);
    if (reason && next.sawTool) reason = "tool_calls";
    if (Object.keys(delta).length === 0 && !reason) continue;
    choices.push({ index: index, delta: delta, finish_reason: reason });
    next.sent = true;
  }
  if (choices.length === 0) return { state: next };
  return { events: [chatChunk(next, choices)], state: next };
}

// ---------------------------------------------------------------------------
// OpenAI embeddings <-> Gemini batchEmbedContents

export function embeddingsToGemini(body, model) {
  if (!isObject(body)) throw requestError("request body must be a JSON object");
  const input = body.input;
  let inputs;
  if (typeof input === "string") inputs = [input];
  else if (Array.isArray(input)) {
    if (input.some(function (item) { return typeof item !== "string"; })) {
      throw requestError("OpenAI embeddings on Gemini accept only text input; use the Gemini embedContent endpoint for images, audio, video or PDF");
    }
    inputs = input;
  } else {
    throw requestError("input is required");
  }
  if (inputs.length === 0) throw requestError("input is empty");
  const dimensions = Number.isInteger(body.dimensions) && body.dimensions > 0 ? body.dimensions : 0;
  return {
    requests: inputs.map(function (text) {
      const request = { model: "models/" + checkModel(model), content: { parts: [{ text: text }] } };
      if (dimensions) request.outputDimensionality = dimensions;
      return request;
    }),
  };
}

function geminiToEmbeddings(reply, model) {
  if (!Array.isArray(reply.embeddings)) {
    return { error: { status: 502, message: "embedding reply has no embeddings" } };
  }
  const body = {
    object: "list",
    data: reply.embeddings.map(function (item, index) {
      return { object: "embedding", embedding: isObject(item) && Array.isArray(item.values) ? item.values : [], index: index };
    }),
    model: model,
  };
  // Without upstream usage new-api estimates the prompt, as on the built-in
  // channel.
  if (hasUsageTokens(reply.usageMetadata)) body.usage = usageFromMetadata(reply.usageMetadata);
  return { body: body, contentType: "application/json" };
}

// ---------------------------------------------------------------------------
// OpenAI image generation <-> generateContent on a Gemini image model

const SIZE_ASPECT = {
  "256x256": "1:1", "512x512": "1:1", "1024x1024": "1:1", "2048x2048": "1:1", "4096x4096": "1:1",
  "1536x1024": "3:2", "1024x1536": "2:3", "1024x1792": "9:16", "1792x1024": "16:9",
};

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

// Aspect ratio and output size of an OpenAI `size`: "WxH" or a ratio such as
// "16:9". 1K needs no imageSize, which every Gemini image model accepts.
export function imageShape(size, quality) {
  const text = typeof size === "string" ? size.trim().toLowerCase() : "";
  let aspectRatio = "1:1";
  let longSide = 0;
  if (text === "" || text === "auto") {
    // defaults
  } else if (text.indexOf(":") > 0) {
    aspectRatio = text;
  } else if (SIZE_ASPECT[text]) {
    aspectRatio = SIZE_ASPECT[text];
    longSide = Math.max.apply(null, text.split("x").map(Number));
  } else {
    const match = /^(\d+)x(\d+)$/.exec(text);
    if (!match || Number(match[1]) <= 0 || Number(match[2]) <= 0) throw requestError("size must be WIDTHxHEIGHT or an aspect ratio such as 16:9");
    const w = Number(match[1]);
    const h = Number(match[2]);
    const d = gcd(w, h);
    aspectRatio = w / d + ":" + h / d;
    longSide = Math.max(w, h);
  }
  if (IMAGE_ASPECT_RATIOS.indexOf(aspectRatio) < 0) {
    throw requestError("aspect ratio " + aspectRatio + " is not supported; use one of " + IMAGE_ASPECT_RATIOS.join(", "));
  }
  let imageSize = longSide > 2048 ? "4K" : longSide > 1024 ? "2K" : "";
  const q = typeof quality === "string" ? quality.trim().toLowerCase() : "";
  if (!imageSize && (q === "hd" || q === "high" || q === "2k")) imageSize = "2K";
  if (q === "4k") imageSize = "4K";
  return { aspectRatio: aspectRatio, imageSize: imageSize };
}

function imageRequest(body, model) {
  if (!isObject(body)) throw requestError("request body must be a JSON object");
  if (!isImageModel(checkModel(model))) {
    throw requestError("image generation needs a Gemini image model, such as gemini-3.1-flash-image");
  }
  if (typeof body.prompt !== "string" || body.prompt.trim() === "") throw requestError("prompt is required");
  const n = body.n === undefined || body.n === null ? 1 : body.n;
  if (!Number.isInteger(n) || n < 1 || n > MAX_IMAGES) throw requestError("n must be a whole number from 1 to " + MAX_IMAGES);
  const shape = imageShape(body.size, body.quality);
  const imageConfig = { aspectRatio: shape.aspectRatio };
  if (shape.imageSize) imageConfig.imageSize = shape.imageSize;
  return {
    n: n,
    body: {
      contents: [{ role: "user", parts: [{ text: body.prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: imageConfig },
      safetySettings: SAFETY_CATEGORIES.map(function (category) {
        return { category: category, threshold: SAFETY_THRESHOLD };
      }),
    },
  };
}

function addCounts(total, usage) {
  const out = Object.assign({}, total);
  out.input_tokens = (out.input_tokens || 0) + usage.prompt_tokens;
  out.output_tokens = (out.output_tokens || 0) + usage.completion_tokens;
  out.input_text = (out.input_text || 0) + usage.prompt_tokens_details.text_tokens;
  out.input_image = (out.input_image || 0) + usage.prompt_tokens_details.image_tokens;
  out.output_text = (out.output_text || 0) + usage.completion_tokens_details.text_tokens;
  out.output_image = (out.output_image || 0) + usage.completion_tokens_details.image_tokens;
  out.reasoning = (out.reasoning || 0) + usage.completion_tokens_details.reasoning_tokens;
  return out;
}

// One image per reply; with n > 1 the same request is sent again, and the
// final reply holds every image and the usage of every request.
function geminiToImages(reply, state) {
  if (isObject(reply.error)) return upstreamError(reply);
  const candidates = Array.isArray(reply.candidates) ? reply.candidates : [];
  const images = Array.isArray(state.images) ? state.images.slice() : [];
  let found = 0;
  let reason = "";
  for (const candidate of candidates) {
    if (!isObject(candidate)) continue;
    if (candidate.finishReason) reason = String(candidate.finishReason);
    const parts = isObject(candidate.content) && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (isObject(part) && part.thought !== true && isObject(part.inlineData) && String(part.inlineData.mimeType || "").indexOf("image/") === 0 && part.inlineData.data) {
        images.push(String(part.inlineData.data));
        found++;
      }
    }
  }
  if (found === 0) {
    const feedback = isObject(reply.promptFeedback) && reply.promptFeedback.blockReason ? reply.promptFeedback.blockReason : "";
    return { error: { status: 400, message: "Gemini API returned no image" + (feedback || reason ? " (" + (feedback || reason) + ")" : ""), code: "no_image" } };
  }
  const counts = hasUsageTokens(reply.usageMetadata) ? addCounts(state.usage, usageFromMetadata(reply.usageMetadata)) : Object.assign({}, state.usage);
  const wanted = Number.isInteger(state.n) ? state.n : 1;
  if (images.length < wanted) {
    return {
      next: { method: "POST", path: state.path, body: state.body },
      state: Object.assign({}, state, { images: images, usage: counts }),
    };
  }
  const input = counts.input_tokens || 0;
  const output = counts.output_tokens || 0;
  const body = {
    created: nowSeconds(),
    data: images.map(function (data) { return { b64_json: data }; }),
  };
  if (input > 0 || output > 0) {
    body.usage = {
      input_tokens: input,
      output_tokens: output,
      total_tokens: input + output,
      input_tokens_details: { text_tokens: counts.input_text || 0, image_tokens: counts.input_image || 0 },
      output_tokens_details: { text_tokens: counts.output_text || 0, image_tokens: counts.output_image || 0, reasoning_tokens: counts.reasoning || 0 },
    };
  }
  return { body: body, contentType: "application/json" };
}
