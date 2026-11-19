// Relay part (meta.relay routes and provider hooks): node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const UNIX_NOW = 1794000000;
globalThis.utils = { unixNow: () => UNIX_NOW, uuid: () => "00000000-0000-4000-8000-000000000000" };

const plugin = await import("../plugin.js");
const { meta, prepareRequest, signRequest, convertRequest, convertResponse, convertStreamEvent, servedModel, imageShape } = plugin;

const BASE = "https://generativelanguage.googleapis.com";
const ctx = (path, extra) => Object.assign({ baseUrl: BASE, path: path, config: {} }, extra || {});
const ok = (body) => ({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const USAGE = {
  promptTokenCount: 1200, candidatesTokenCount: 300, thoughtsTokenCount: 200, cachedContentTokenCount: 400, totalTokenCount: 1700,
  promptTokensDetails: [{ modality: "TEXT", tokenCount: 1000 }, { modality: "IMAGE", tokenCount: 200 }],
  candidatesTokensDetails: [{ modality: "TEXT", tokenCount: 300 }],
};
const UPSTREAM_VERSION = "gemini-3.8-flash-preview-11-2026";
const REPLY = {
  candidates: [{ content: { role: "model", parts: [{ text: "plan", thought: true }, { text: "Hello" }] }, finishReason: "STOP", index: 0 }],
  usageMetadata: USAGE, modelVersion: UPSTREAM_VERSION, responseId: "r1",
};

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

test("relay routes: Gemini native and OpenAI text routes use new-api's own conversion", () => {
  const byPath = Object.fromEntries(meta.relay.map((r) => [r.incoming_path, r]));
  assert.equal(meta.relay.length, 12);
  for (const route of meta.relay) {
    assert.deepEqual(route.auth, { type: "header", name: "x-goog-api-key", value: "{api_key}" });
    assert.equal(route.models, undefined, "relay routes pass any model name");
  }
  for (const path of ["/v1beta/models/{model}:generateContent", "/v1/models/{model}:generateContent",
    "/v1beta/models/{model}:embedContent", "/v1/models/{model}:embedContent",
    "/v1beta/models/{model}:batchEmbedContents", "/v1/models/{model}:batchEmbedContents"]) {
    assert.equal(byPath[path].converter, undefined, path + " is a native route");
  }
  assert.equal(byPath["/v1/chat/completions"].converter, "openai_chat_completions_to_gemini_generate_content");
  assert.equal(byPath["/v1/responses"].converter, "openai_responses_to_gemini_generate_content");
  assert.equal(byPath["/v1/messages"].converter, "anthropic_messages_to_openai_chat_completions+plugin");
  assert.equal(byPath["/v1/embeddings"].converter, "plugin");
  assert.equal(byPath["/v1/images/generations"].converter, "plugin");
  assert.equal(byPath["/v1/models"].converter, "plugin");
  assert.equal(byPath["/v1/models"].upstream_path, "/v1beta/models?pageSize=1000");
});

test("every listed model is a Gemini API model id, task models included", () => {
  assert.equal(meta.models.length, 21);
  assert.equal(new Set(meta.models).size, meta.models.length);
  for (const id of meta.models) assert.match(id, /^gemini-[a-z0-9.-]+$/);
  for (const retired of ["imagen-4.0-generate-001", "gemini-2.0-flash", "gemini-3-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"]) {
    assert.ok(!meta.models.includes(retired), retired);
  }
});

test("prepareRequest: native streaming picks streamGenerateContent with SSE, nothing else changes", () => {
  const req = { path: "/v1beta/models/my-alias:streamGenerateContent", upstreamPath: "/v1beta/models/gemini-3.8-flash:generateContent", model: "gemini-3.8-flash", stream: true, body: {}, headers: {} };
  assert.deepEqual(prepareRequest(ctx(req.path), deepFreeze(req)), { path: "/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse" });
  const v1 = { path: "/v1/models/gemini-3.8-flash:streamGenerateContent", upstreamPath: "/v1beta/models/gemini-3.8-flash:generateContent", model: "gemini-3.8-flash", stream: true, body: {}, headers: {} };
  assert.deepEqual(prepareRequest(ctx(v1.path, { config: { apiVersion: "v1" } }), v1), { path: "/v1/models/gemini-3.8-flash:streamGenerateContent?alt=sse" });
  const plain = { path: "/v1beta/models/gemini-3.8-flash:generateContent", upstreamPath: "/v1beta/models/gemini-3.8-flash:generateContent", model: "gemini-3.8-flash", stream: false, body: {}, headers: {} };
  assert.equal(prepareRequest(ctx(plain.path), plain), null);
});

test("prepareRequest: the API version applies to host-converted routes", () => {
  const chat = { path: "/v1/chat/completions", upstreamPath: "/v1beta/models/gemini-3.8-flash:generateContent", model: "gemini-3.8-flash", stream: true, body: {}, headers: {} };
  assert.equal(prepareRequest(ctx(chat.path), chat), null);
  assert.deepEqual(prepareRequest(ctx(chat.path, { config: { apiVersion: "v1alpha" } }), chat), { path: "/v1alpha/models/gemini-3.8-flash:generateContent" });
  const embed = { path: "/v1beta/models/gemini-embedding-2:embedContent", upstreamPath: "/v1beta/models/gemini-embedding-2:embedContent", model: "gemini-embedding-2", stream: false, body: {}, headers: {} };
  assert.deepEqual(prepareRequest(ctx(embed.path, { config: { apiVersion: "v1" } }), embed), { path: "/v1/models/gemini-embedding-2:embedContent" });
  assert.equal(prepareRequest(ctx(embed.path, { config: { apiVersion: "bogus" } }), embed), null);
});

test("signRequest adds ?key= only when configured", () => {
  const request = { method: "POST", url: BASE + "/v1beta/models/x:generateContent", headers: {}, bodySha256: "" };
  assert.deepEqual(signRequest({ baseUrl: BASE, credential: null, apiKey: "K", config: { keyInQuery: true } }, request), { query: { key: "K" } });
  assert.deepEqual(signRequest({ baseUrl: BASE, credential: null, apiKey: "K", config: {} }, request), {});
});

test("native and host-converted paths never reach the convert hooks", () => {
  for (const path of ["/v1beta/models/gemini-3.8-flash:generateContent", "/v1/chat/completions", "/v1/responses", "/v1/audio/speech"]) {
    assert.throws(() => convertRequest(ctx(path), { body: {}, model: "gemini-3.8-flash", stream: false }), /unsupported path/);
  }
});

test("Claude path: OpenAI chat becomes a Gemini request on the streaming path when asked", () => {
  const body = deepFreeze({
    model: "gemini-3.8-flash",
    messages: [{ role: "system", content: "be brief" }, { role: "user", content: "hi" }, { role: "assistant", content: "ok" }, { role: "user", content: [{ type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } }] }],
    max_tokens: 64, reasoning_effort: "low",
    tools: [{ type: "function", function: { name: "f", parameters: { type: "object", additionalProperties: false, properties: { a: { type: ["string", "null"] } } } } }],
    tool_choice: { type: "function", function: { name: "f" } },
  });
  const out = convertRequest(ctx("/v1/messages"), deepFreeze({ body: body, model: "gemini-3.8-flash", stream: true }));
  assert.equal(out.path, "/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse");
  assert.equal(out.stream, true);
  assert.deepEqual(out.state, { kind: "chat", model: "gemini-3.8-flash", stream: true });
  assert.deepEqual(out.body.systemInstruction, { parts: [{ text: "be brief" }] });
  assert.deepEqual(out.body.contents.map((c) => c.role), ["user", "model", "user"]);
  assert.equal(out.body.contents[1].parts[0].thoughtSignature, "context_engineering_is_the_way_to_go");
  assert.deepEqual(out.body.contents[2].parts[0], { inlineData: { mimeType: "image/png", data: "AAAA" } });
  assert.deepEqual(out.body.generationConfig, { maxOutputTokens: 64, thinkingConfig: { thinkingLevel: "low", includeThoughts: true } });
  assert.deepEqual(out.body.tools[0].functionDeclarations[0].parameters, { type: "object", properties: { a: { nullable: true, type: "string" } } });
  assert.equal(out.body.toolConfig.functionCallingConfig.mode, "ANY");
  assert.deepEqual(Object.values(out.body.toolConfig.functionCallingConfig)[1], ["f"]);
  assert.equal(out.body.safetySettings.length, 4);
  const v1 = convertRequest(ctx("/v1/messages", { config: { apiVersion: "v1" } }), { body: body, model: "gemini-3.8-flash", stream: false });
  assert.equal(v1.path, "/v1/models/gemini-3.8-flash:generateContent");
  assert.throws(() => convertRequest(ctx("/v1/messages"), { body: body, model: "../x", stream: false }), /invalid model name/);
});

test("Claude path reply names the model Gemini reports and keeps Gemini usage", () => {
  const out = convertResponse(ctx("/v1/messages", { state: deepFreeze({ kind: "chat", model: "gemini-3.8-flash", stream: false }) }), deepFreeze(ok(REPLY)));
  assert.equal(out.body.model, UPSTREAM_VERSION);
  assert.equal(out.body.choices[0].message.content, "Hello");
  assert.equal(out.body.choices[0].message.reasoning_content, "plan");
  assert.deepEqual(out.body.usage, {
    prompt_tokens: 1200, completion_tokens: 500, total_tokens: 1700,
    prompt_tokens_details: { cached_tokens: 400, text_tokens: 1000, audio_tokens: 0, image_tokens: 200 },
    completion_tokens_details: { text_tokens: 300, audio_tokens: 0, image_tokens: 0, reasoning_tokens: 200 },
  });
  const noVersion = Object.assign({}, REPLY);
  delete noVersion.modelVersion;
  assert.equal(convertResponse(ctx("/v1/messages", { state: { kind: "chat", model: "gemini-3.8-flash" } }), ok(noVersion)).body.model, "gemini-3.8-flash");
});

test("Claude path stream: chunks carry the model Gemini reports, usage comes last", () => {
  const state = { kind: "chat", model: "gemini-3.8-flash", stream: true };
  const c = ctx("/v1/messages", { state: state });
  const first = convertStreamEvent(c, deepFreeze({ data: JSON.stringify({ candidates: [{ content: { parts: [{ text: "Hel" }] }, index: 0 }], usageMetadata: { promptTokenCount: 10, totalTokenCount: 10 }, modelVersion: UPSTREAM_VERSION }) }));
  const chunk = JSON.parse(first.events[0].data);
  assert.equal(chunk.model, UPSTREAM_VERSION);
  assert.deepEqual(chunk.choices[0].delta, { role: "assistant", content: "Hel" });
  const second = convertStreamEvent(ctx("/v1/messages", { state: first.state }), { data: JSON.stringify(Object.assign({}, REPLY, { candidates: [{ content: { parts: [{ text: "lo" }] }, finishReason: "STOP", index: 0 }] })) });
  assert.equal(JSON.parse(second.events[0].data).choices[0].finish_reason, "stop");
  const done = convertStreamEvent(ctx("/v1/messages", { state: second.state }), { done: true });
  const usage = JSON.parse(done.events[0].data);
  assert.equal(usage.model, UPSTREAM_VERSION);
  assert.equal(usage.usage.prompt_tokens, 1200);
  assert.equal(usage.usage.completion_tokens, 500);
  assert.equal(done.events[1].data, "[DONE]");
  const error = convertStreamEvent(c, { data: JSON.stringify({ error: { code: 429, message: "quota" } }) });
  assert.deepEqual(error, { error: { status: 429, message: "quota" } });
});

test("upstream errors keep new-api's error path", () => {
  const reply = { status: 429, headers: { "Content-Type": "application/json" }, body: "{\"error\":{\"code\":429,\"message\":\"quota\"}}" };
  for (const kind of ["chat", "embed", "image"]) {
    assert.deepEqual(convertResponse(ctx("/v1/messages", { state: { kind: kind } }), reply), { body: reply.body, contentType: "application/json" });
  }
  assert.deepEqual(convertResponse(ctx("/v1/messages", { state: { kind: "chat", model: "m" } }), ok({ promptFeedback: { blockReason: "SAFETY" } })).error.status, 400);
});

test("OpenAI embeddings become batchEmbedContents and keep upstream usage", () => {
  const out = convertRequest(ctx("/v1/embeddings"), deepFreeze({ body: { model: "gemini-embedding-2", input: ["a", "b"], dimensions: 768 }, model: "gemini-embedding-2", stream: false }));
  assert.equal(out.path, "/v1beta/models/gemini-embedding-2:batchEmbedContents");
  assert.deepEqual(out.body.requests[1], { model: "models/gemini-embedding-2", content: { parts: [{ text: "b" }] }, outputDimensionality: 768 });
  assert.throws(() => convertRequest(ctx("/v1/embeddings"), { body: { input: [[1, 2]] }, model: "gemini-embedding-2" }), /only text input/);
  assert.throws(() => convertRequest(ctx("/v1/embeddings"), { body: { input: [] }, model: "gemini-embedding-2" }), /input is empty/);
  const reply = convertResponse(ctx("/v1/embeddings", { state: { kind: "embed", model: "gemini-embedding-2" } }), ok({ embeddings: [{ values: [0.1] }, { values: [0.2] }], usageMetadata: { promptTokenCount: 4, totalTokenCount: 4 } }));
  assert.deepEqual(reply.body.data[1], { object: "embedding", embedding: [0.2], index: 1 });
  assert.equal(reply.body.model, "gemini-embedding-2");
  assert.equal(reply.body.usage.prompt_tokens, 4);
  assert.equal(convertResponse(ctx("/v1/embeddings", { state: { kind: "embed", model: "m" } }), ok({ embeddings: [{ values: [1] }] })).body.usage, undefined);
});

test("image sizes map to Gemini aspect ratios and output sizes", () => {
  assert.deepEqual(imageShape(undefined), { aspectRatio: "1:1", imageSize: "" });
  assert.deepEqual(imageShape("1792x1024"), { aspectRatio: "16:9", imageSize: "2K" });
  assert.deepEqual(imageShape("1024x1536"), { aspectRatio: "2:3", imageSize: "2K" });
  assert.deepEqual(imageShape("1024x1024", "hd"), { aspectRatio: "1:1", imageSize: "2K" });
  assert.deepEqual(imageShape("4096x4096"), { aspectRatio: "1:1", imageSize: "4K" });
  assert.deepEqual(imageShape("21:9"), { aspectRatio: "21:9", imageSize: "" });
  assert.deepEqual(imageShape("1280x1024"), { aspectRatio: "5:4", imageSize: "2K" });
  assert.throws(() => imageShape("1000x333"), /not supported/);
  assert.throws(() => imageShape("big"), /WIDTHxHEIGHT/);
});

test("image generation: generateContent with image output, n images through n requests", () => {
  const body = deepFreeze({ model: "gemini-3.1-flash-lite-image", prompt: "a red cube", n: 2, size: "1792x1024", response_format: "b64_json" });
  const out = convertRequest(ctx("/v1/images/generations"), deepFreeze({ body: body, model: "gemini-3.1-flash-lite-image", stream: false }));
  assert.equal(out.path, "/v1beta/models/gemini-3.1-flash-lite-image:generateContent");
  assert.deepEqual(out.body.generationConfig, { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9", imageSize: "2K" } });
  assert.deepEqual(out.body.contents, [{ role: "user", parts: [{ text: "a red cube" }] }]);
  const image = (data) => ok({
    candidates: [{ content: { parts: [{ text: "draft", thought: true }, { inlineData: { mimeType: "image/png", data: data } }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 1680, totalTokenCount: 1688, promptTokensDetails: [{ modality: "TEXT", tokenCount: 8 }], candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1680 }] },
    modelVersion: "gemini-3.1-flash-lite-image",
  });
  const first = convertResponse(ctx("/v1/images/generations", { state: deepFreeze(out.state) }), image("AAA"));
  assert.deepEqual(first.next, { method: "POST", path: out.state.path, body: out.body });
  assert.deepEqual(first.state.images, ["AAA"]);
  const last = convertResponse(ctx("/v1/images/generations", { state: deepFreeze(first.state) }), image("BBB"));
  assert.deepEqual(last.body, {
    created: UNIX_NOW,
    data: [{ b64_json: "AAA" }, { b64_json: "BBB" }],
    usage: {
      input_tokens: 16, output_tokens: 3360, total_tokens: 3376,
      input_tokens_details: { text_tokens: 16, image_tokens: 0 },
      output_tokens_details: { text_tokens: 0, image_tokens: 3360, reasoning_tokens: 0 },
    },
  });
});

test("image generation refuses text models, bad n and empty replies", () => {
  assert.throws(() => convertRequest(ctx("/v1/images/generations"), { body: { prompt: "x" }, model: "gemini-3.8-flash" }), /Gemini image model/);
  assert.throws(() => convertRequest(ctx("/v1/images/generations"), { body: { prompt: "x", n: 5 }, model: "gemini-3-pro-image" }), /1 to 4/);
  assert.throws(() => convertRequest(ctx("/v1/images/generations"), { body: { prompt: [] }, model: "gemini-3-pro-image" }), /prompt is required/);
  const state = convertRequest(ctx("/v1/images/generations"), { body: { prompt: "x" }, model: "gemini-nano-banana-2.1" }).state;
  const empty = convertResponse(ctx("/v1/images/generations", { state: state }), ok({ candidates: [{ content: { parts: [{ text: "no" }] }, finishReason: "IMAGE_SAFETY" }] }));
  assert.deepEqual(empty, { error: { status: 400, message: "Gemini API returned no image (IMAGE_SAFETY)", code: "no_image" } });
});

test("model list: every page, only models the routes serve, plus the task models", () => {
  assert.equal(servedModel({ name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] }), "gemini-3.8-flash");
  assert.equal(servedModel({ name: "models/gemini-embedding-2", supportedGenerationMethods: ["embedContent"] }), "gemini-embedding-2");
  assert.equal(servedModel({ name: "models/gemini-3.8-live", supportedGenerationMethods: ["bidiGenerateContent"] }), "");
  assert.equal(servedModel({ name: "models/aqa", supportedGenerationMethods: ["generateAnswer"] }), "");
  assert.equal(servedModel({ name: "models/gemini-decision-1", supportedGenerationMethods: ["createDecision"] }), "gemini-decision-1");
  assert.equal(servedModel({ name: "models/relay-model" }), "relay-model");
  const page1 = convertResponse(ctx("/v1/models", { state: null }), ok({ models: [{ name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] }, { name: "models/gemini-3.8-live", supportedGenerationMethods: ["bidiGenerateContent"] }], nextPageToken: "p 2" }));
  assert.deepEqual(page1, { next: { method: "GET", path: "/v1beta/models?pageSize=1000&pageToken=p%202" }, state: { kind: "models", ids: ["gemini-3.8-flash"] } });
  const page2 = convertResponse(ctx("/v1/models", { state: page1.state }), ok({ models: [{ name: "models/gemini-omni-1.2-flash", supportedGenerationMethods: ["generateContent"] }] }));
  assert.deepEqual(page2.body.data.map((m) => m.id), ["gemini-3.8-flash", "gemini-omni-1.2-flash", "gemini-omni-1.1-flash", "gemini-decision-1"]);
  assert.equal(convertResponse(ctx("/v1/models", { state: null }), { status: 401, headers: {}, body: "{}" }).error.status, 401);
});

test("the relay hooks do not change their arguments", () => {
  const args = deepFreeze({ body: { model: "m", messages: [{ role: "user", content: "hi" }] }, model: "gemini-3.8-flash", stream: false });
  convertRequest(deepFreeze(ctx("/v1/messages")), args);
  convertResponse(deepFreeze(ctx("/v1/messages", { state: { kind: "chat", model: "m" } })), deepFreeze(ok(REPLY)));
  convertStreamEvent(deepFreeze(ctx("/v1/messages", { state: { kind: "chat", model: "m" } })), deepFreeze({ data: JSON.stringify(REPLY) }));
});

test("public files keep to what the plugin does", () => {
  for (const file of ["../plugin.js", "../README.md", "../README.zh-CN.md", "../CHANGELOG.md", "../CHANGELOG.zh-CN.md"]) {
    const text = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(text, /rewrit|响应模型|gemini[_-]channel|Gemini 渠道插件/i, file);
    assert.doesNotMatch(text, /Gemini Channel/, file);
  }
});
