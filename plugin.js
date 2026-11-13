export const meta = {
  apiVersion: 1,
  key: "gemini",
  name: "Gemini Omni & Gemini Decision (Gemini API)",
  icon: "Gemini.Color",
  description: {
    en: "Gemini Omni Flash video generation (text-to-video and image-to-video) and Gemini Decision 1 decisions on the Gemini API",
    zh: "Gemini Omni Flash 视频生成（文生视频、图生视频）与 Gemini Decision 1 结构化判断，Gemini API 版本",
  },
  version: "1.0.0",
  author: { name: "ByAiden", url: "https://github.com/ByAiden" },
  website: "https://aistudio.google.com/docs/omni",
  baseUrl: "https://generativelanguage.googleapis.com",
  models: ["gemini-omni-1.2-flash", "gemini-omni-1.1-flash", "gemini-decision-1"],
  fetchMode: "per_task",
  upstreams: ["vendor", "new_api"],
  // Gemini Omni bills tokens: input, text output (including thinking) and
  // video output (with audio). Video tokens are reserved from the requested
  // duration and resolution; completion settles all three on reported usage.
  usageSchema: {
    input_tokens: {
      type: "number",
      unit: "token",
      description: { en: "Input token unit price", zh: "输入 token 单价" },
    },
    output_tokens: {
      type: "number",
      unit: "token",
      description: { en: "Text output token unit price", zh: "文本输出 token 单价" },
    },
    video_tokens: {
      type: "number",
      unit: "token",
      description: { en: "Video output token unit price", zh: "视频输出 token 单价" },
    },
  },
  usageExamples: [
    { label: "3s 360p", facts: { input_tokens: 0, output_tokens: 0, video_tokens: 5793 } },
    { label: "8s 720p", facts: { input_tokens: 0, output_tokens: 0, video_tokens: 46336 } },
    { label: "8s 1080p", facts: { input_tokens: 0, output_tokens: 0, video_tokens: 69504 } },
    { label: "10s 4k", facts: { input_tokens: 0, output_tokens: 0, video_tokens: 173760 } },
  ],
  // Gemini Decision bills input tokens only; output is always zero tokens.
  usageProfiles: [
    {
      models: ["gemini-decision-1"],
      schema: {
        input_tokens: {
          type: "number",
          unit: "token",
          description: { en: "Input token unit price", zh: "输入 token 单价" },
        },
      },
      examples: [{ label: "1K input tokens", facts: { input_tokens: 1000 } }],
    },
  ],
  // The Gemini API's own Decisions path; the gateway also serves it under
  // /gemini. It answers in the same call, so nothing is kept to query.
  routes: [
    {
      method: "POST",
      path: "/v1beta/decisions",
      type: "submit",
      decode: "decisions",
      render: "decided",
      retainResult: false,
      models: ["gemini-decision-1"],
    },
  ],
  // The OpenAI-style video protocols serve Gemini Omni only.
  protocols: [
    {
      name: "openai_responses",
      models: ["gemini-omni-1.2-flash", "gemini-omni-1.1-flash"],
      supports: ["stream", "sync", "background"],
    },
    {
      name: "openai_video",
      models: ["gemini-omni-1.2-flash", "gemini-omni-1.1-flash"],
    },
  ],
};

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
  return ctx.baseUrl.replace(/\/+$/, "") + (viaGateway(ctx) ? "/" + meta.key : "");
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
  // The upstream gateway has no Interactions route for this plugin.
  if (viaGateway(ctx)) throw new Error("Gemini Omni is not available through a New API gateway");
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
  return omniSubmitRequest(ctx);
}

export function parseSubmitResponse(ctx, resp) {
  if (isDecision(ctx)) return decisionResult(ctx, resp);
  const body = plainObject(resp.body) || {};
  const id = trimmed(body.id);
  if (!id) throw new Error("Gemini Omni response is missing the interaction id");
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
  if (omniModel(task) || isInteraction(data)) return omniSettlement(data);
  return null;
}

export function buildQueryRequest(ctx) {
  return { url: interactionsURL(ctx, ctx.taskId), method: "GET", headers: Object.assign({ Accept: "application/json" }, authHeaders(ctx)) };
}

export function parseTaskResult(ctx, body) {
  return omniTaskResult(body);
}

export function listArtifacts(task) {
  if (task.status !== "SUCCESS" || !isInteraction(task.data)) return [];
  const video = omniVideo(task.data);
  return video ? [{ key: "video", type: "video", mimeType: video.mimeType }] : [];
}

export function buildContentRequest(ctx) {
  if (ctx.artifactKey !== "video" || !isInteraction(ctx.data)) throw new Error("artifact_not_found");
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
