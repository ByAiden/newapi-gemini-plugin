// Upstream type "openai" (OpenAI-compatible relay serving Gemini models): node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";

const UNIX_NOW = 1794000000;
globalThis.utils = { unixNow: () => UNIX_NOW, uuid: () => "00000000-0000-4000-8000-000000000000" };

const plugin = await import("../plugin.js");
const { meta, upstreamType, checkKey, prepareRequest, signRequest, convertRequest, convertResponse, convertStreamEvent, buildSubmitRequest, relayUsageMetadata, jsonSchemaOf } = plugin;

const RELAY = "https://relay.example.com";
const RELAY_CONFIG = { upstreamType: "openai", apiVersion: "v1beta", keyInQuery: false };
const ctx = (path, extra) => Object.assign({ baseUrl: RELAY, path: path, config: RELAY_CONFIG }, extra || {});
const ok = (body) => ({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
// The relay names its own model; it is passed on as it is.
const RELAY_MODEL = "gemini-3.8-flash-relay-build";

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const run = (path, body, stream, model) => convertRequest(ctx(path), deepFreeze({ body: body, model: model || "gemini-3.8-flash", stream: stream }));

test("channel setting: upstreamType gemini (default) or openai, shaped like byaiden_xai's", () => {
  const field = meta.channelConfig.properties.upstreamType;
  assert.deepEqual(Object.keys(meta.channelConfig.properties), ["upstreamType", "apiVersion", "keyInQuery"]);
  assert.equal(field.type, "string");
  assert.deepEqual(field.enum, ["gemini", "openai"]);
  assert.equal(field.default, "gemini");
  assert.equal(field.enumTitles.length, 2);
  assert.deepEqual(field.title, { en: "Upstream type", zh: "上游类型" });
  for (const name of ["apiVersion", "keyInQuery"]) assert.deepEqual(meta.channelConfig.properties[name].visibleWhen, { upstreamType: "gemini" });
  assert.equal(upstreamType({}), "gemini");
  assert.equal(upstreamType({ config: {} }), "gemini");
  assert.equal(upstreamType({ config: { upstreamType: "bogus" } }), "gemini");
  assert.equal(upstreamType({ config: { upstreamType: "openai" } }), "openai");
});

test("checkKey: a relay channel needs the relay's Base URL; Gemini API channels are not checked", () => {
  for (const baseUrl of ["", "https://generativelanguage.googleapis.com", "https://aiplatform.googleapis.com/"]) {
    const result = checkKey({ baseUrl: baseUrl, config: { upstreamType: "openai" } }, "sk-relay");
    assert.match(result.error.en, /relay's address/);
    assert.match(result.error.zh, /中转地址/);
  }
  assert.equal(checkKey({ baseUrl: RELAY, config: { upstreamType: "openai" } }, "sk-relay"), undefined);
  assert.ok(checkKey({ baseUrl: RELAY, config: { upstreamType: "openai" } }, "  ").error);
  for (const baseUrl of ["", "https://generativelanguage.googleapis.com", RELAY]) {
    assert.equal(checkKey({ baseUrl: baseUrl, config: {} }, "AIza-anything"), undefined);
  }
});

test("request hooks: Bearer key to the relay, no Gemini path rewriting, no ?key=", () => {
  const signed = signRequest({ baseUrl: RELAY, credential: null, apiKey: "sk-relay", config: Object.assign({}, RELAY_CONFIG, { keyInQuery: true }) },
    { method: "POST", url: RELAY + "/v1/chat/completions", headers: {}, bodySha256: "" });
  assert.deepEqual(signed, { headers: { Authorization: "Bearer sk-relay" } });
  const prep = { path: "/v1beta/models/gemini-3.8-flash:streamGenerateContent", upstreamPath: "/v1/chat/completions", model: "gemini-3.8-flash", stream: true, body: {}, headers: {} };
  assert.equal(prepareRequest(ctx(prep.path, { config: Object.assign({}, RELAY_CONFIG, { apiVersion: "v1" }) }), prep), null);
});

const GEMINI_REQUEST = {
  systemInstruction: { parts: [{ text: "Be brief." }, { text: "Answer in English." }] },
  contents: [
    { role: "user", parts: [{ text: "What is in the picture?" }, { inlineData: { mimeType: "image/jpg", data: "AAAA" } }] },
    { role: "model", parts: [{ text: "thinking...", thought: true }, { functionCall: { name: "lookup", args: { q: "cat" } }, thoughtSignature: "sig" }] },
    { role: "user", parts: [{ functionResponse: { name: "lookup", response: { result: "a cat" } } }] },
    { role: "user", parts: [{ text: "Thanks" }, { fileData: { mimeType: "image/png", fileUri: "https://cdn.example.com/a.png" } }, { inline_data: { mime_type: "audio/wav", data: "UklG" } }] },
  ],
  generationConfig: {
    temperature: 0.4, topP: 0.9, topK: 40, maxOutputTokens: 256, stopSequences: ["END"], seed: 7, presencePenalty: 0.1, frequencyPenalty: 0.2,
    responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { answer: { type: "STRING", nullable: true } }, required: ["answer"] },
    thinkingConfig: { thinkingBudget: 1024, includeThoughts: true },
  },
  tools: [{ functionDeclarations: [{ name: "lookup", description: "Look up", parameters: { type: "OBJECT", properties: { q: { type: "STRING" } } } }] }],
  toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["lookup"] } },
  safetySettings: [{ category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" }],
};

const OPENAI_REQUEST = {
  model: "gemini-3.8-flash",
  messages: [
    { role: "system", content: "Be brief.\nAnswer in English." },
    { role: "user", content: [{ type: "text", text: "What is in the picture?" }, { type: "image_url", image_url: { url: "data:image/jpeg;base64,AAAA" } }] },
    { role: "assistant", content: null, tool_calls: [{ id: "call_1", type: "function", function: { name: "lookup", arguments: "{\"q\":\"cat\"}" } }] },
    { role: "tool", tool_call_id: "call_1", content: "{\"result\":\"a cat\"}" },
    { role: "user", content: [{ type: "text", text: "Thanks" }, { type: "image_url", image_url: { url: "https://cdn.example.com/a.png" } }, { type: "input_audio", input_audio: { data: "UklG", format: "wav" } }] },
  ],
  temperature: 0.4, top_p: 0.9, max_tokens: 256, presence_penalty: 0.1, frequency_penalty: 0.2, seed: 7, stop: ["END"],
  response_format: { type: "json_schema", json_schema: { name: "response", schema: { type: "object", properties: { answer: { type: ["string", "null"] } }, required: ["answer"] } } },
  reasoning_effort: "low",
  tools: [{ type: "function", function: { name: "lookup", description: "Look up", parameters: { type: "object", properties: { q: { type: "string" } } } } }],
  tool_choice: { type: "function", function: { name: "lookup" } },
};

test("Gemini native generateContent becomes OpenAI chat on the relay's /v1/chat/completions", () => {
  const out = run("/v1beta/models/gemini-3.8-flash:generateContent", GEMINI_REQUEST, false);
  assert.deepEqual(out, { body: OPENAI_REQUEST, path: "/v1/chat/completions", stream: false, state: { kind: "relay_generate", model: "gemini-3.8-flash", stream: false } });
  assert.equal(out.nativeResponse, undefined, "the reply is converted back to Gemini");
});

test("streamGenerateContent, and chat / Responses clients (Gemini request built by new-api), stream with usage", () => {
  const body = { contents: [{ role: "user", parts: [{ text: "hi" }] }] };
  for (const path of ["/v1beta/models/gemini-3.8-flash:streamGenerateContent", "/v1/models/gemini-3.8-flash:streamGenerateContent", "/v1/chat/completions", "/v1/responses"]) {
    const out = run(path, body, true);
    assert.deepEqual(out.body, { model: "gemini-3.8-flash", messages: [{ role: "user", content: "hi" }], stream: true, stream_options: { include_usage: true } }, path);
    assert.equal(out.path, "/v1/chat/completions");
    assert.equal(out.stream, true);
    assert.equal(out.state.kind, "relay_generate");
  }
  // A mapped model goes on as the upstream model; no name is changed.
  assert.equal(run("/v1/chat/completions", body, false, "gemini-4-carbon-preview-x").body.model, "gemini-4-carbon-preview-x");
});

test("thinking, tool choice and JSON settings map to their OpenAI counterparts", () => {
  const ask = (generationConfig, toolConfig) => run("/v1/chat/completions", { contents: [{ role: "user", parts: [{ text: "x" }] }], generationConfig, toolConfig }, false).body;
  assert.equal(ask({ thinkingConfig: { thinkingLevel: "HIGH" } }).reasoning_effort, "high");
  assert.equal(ask({ thinkingConfig: { thinkingBudget: 0 } }).reasoning_effort, "none");
  assert.equal(ask({ thinkingConfig: { thinkingBudget: -1 } }).reasoning_effort, undefined);
  assert.equal(ask({ thinkingConfig: { thinkingBudget: 512 } }).reasoning_effort, "minimal");
  assert.equal(ask({ thinkingConfig: { thinkingBudget: 8000 } }).reasoning_effort, "medium");
  assert.equal(ask({ thinkingConfig: { thinkingBudget: 30000 } }).reasoning_effort, "high");
  assert.deepEqual(ask({ responseMimeType: "application/json" }).response_format, { type: "json_object" });
  assert.deepEqual(ask({ responseJsonSchema: { type: "object" } }).response_format, { type: "json_schema", json_schema: { name: "response", schema: { type: "object" } } });
  assert.equal(ask({ candidateCount: 2 }).n, 2);
  assert.equal(ask({ candidateCount: 1 }).n, undefined);
  assert.equal(ask({}, { functionCallingConfig: { mode: "NONE" } }).tool_choice, "none");
  assert.equal(ask({}, { functionCallingConfig: { mode: "ANY" } }).tool_choice, "required");
  assert.equal(ask({}, { functionCallingConfig: { mode: "AUTO" } }).tool_choice, undefined);
  assert.deepEqual(jsonSchemaOf({ type: "ARRAY", items: { type: "INTEGER" }, propertyOrdering: ["a"] }), { type: "array", items: { type: "integer" } });
});

test("requests a relay cannot serve faithfully are refused with a clear message", () => {
  const text = [{ role: "user", parts: [{ text: "x" }] }];
  const cases = [
    [{ contents: text, tools: [{ googleSearch: {} }] }, /googleSearch is not supported .* OpenAI-compatible relay/],
    [{ contents: text, tools: [{ codeExecution: {} }] }, /codeExecution/],
    [{ contents: text, generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }, /image or audio output/],
    [{ contents: text, generationConfig: { speechConfig: {} } }, /speechConfig/],
    [{ contents: text, generationConfig: { responseLogprobs: true } }, /responseLogprobs/],
    [{ contents: text, generationConfig: { stopSequences: ["a", "b", "c", "d", "e"] } }, /stopSequences/],
    [{ contents: text, generationConfig: { responseMimeType: "text/x.enum" } }, /responseMimeType/],
    [{ contents: text, cachedContent: "cachedContents/abc" }, /cachedContent/],
    [{ contents: [{ role: "user", parts: [{ fileData: { fileUri: "https://generativelanguage.googleapis.com/v1beta/files/abc", mimeType: "video/mp4" } }] }] }, /file reference/],
    [{ contents: [{ role: "user", parts: [{ inlineData: { mimeType: "video/mp4", data: "AAAA" } }] }] }, /video\/mp4/],
    [{ contents: [{ role: "model", parts: [{ inlineData: { mimeType: "image/png", data: "AAAA" } }] }] }, /media in a model turn/],
    [{ contents: [{ role: "user", parts: [{ executableCode: { code: "1" } }] }] }, /code execution/],
    [{ contents: [] }, /contents is required/],
    ["text", /JSON object/],
  ];
  for (const [body, pattern] of cases) {
    assert.throws(() => run("/v1beta/models/gemini-3.8-flash:generateContent", body, false), pattern, JSON.stringify(body));
  }
});

const OPENAI_USAGE = { prompt_tokens: 1200, completion_tokens: 500, total_tokens: 1700, prompt_tokens_details: { cached_tokens: 400, audio_tokens: 100 }, completion_tokens_details: { reasoning_tokens: 200 } };
const GEMINI_USAGE = {
  promptTokenCount: 1200, candidatesTokenCount: 300, totalTokenCount: 1700, thoughtsTokenCount: 200, cachedContentTokenCount: 400,
  promptTokensDetails: [{ modality: "TEXT", tokenCount: 1100 }, { modality: "AUDIO", tokenCount: 100 }],
};

test("usage: OpenAI usage becomes the Gemini usage metadata new-api bills (thinking, cache, audio)", () => {
  assert.deepEqual(relayUsageMetadata(OPENAI_USAGE), GEMINI_USAGE);
  // A relay that reports reasoning on top of completion_tokens.
  assert.deepEqual(relayUsageMetadata({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 18, completion_tokens_details: { reasoning_tokens: 3 } }),
    { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 18, thoughtsTokenCount: 3 });
  assert.deepEqual(relayUsageMetadata({ prompt_tokens: 10, completion_tokens: 1100, completion_tokens_details: { image_tokens: 1000 } }),
    { promptTokenCount: 10, candidatesTokenCount: 1100, totalTokenCount: 1110, candidatesTokensDetails: [{ modality: "TEXT", tokenCount: 100 }, { modality: "IMAGE", tokenCount: 1000 }] });
  assert.equal(relayUsageMetadata({}), null);
  assert.equal(relayUsageMetadata(null), null);
});

const STATE = { kind: "relay_generate", model: "gemini-3.8-flash", stream: false };

test("reply: OpenAI chat completion becomes a Gemini reply with the relay's model name", () => {
  const reply = {
    id: "chatcmpl-1", object: "chat.completion", model: RELAY_MODEL, usage: OPENAI_USAGE,
    choices: [
      { index: 0, message: { role: "assistant", content: "A cat.", reasoning_content: "Looking." }, finish_reason: "stop" },
      { index: 1, message: { role: "assistant", content: null, tool_calls: [{ id: "call_9", type: "function", function: { name: "lookup", arguments: "{\"q\":\"x\"}" } }, { id: "call_10", type: "function", function: { name: "bad", arguments: "not json" } }] }, finish_reason: "tool_calls" },
      { index: 2, message: { role: "assistant", content: "cut" }, finish_reason: "length" },
      { index: 3, message: { role: "assistant", content: "" }, finish_reason: "content_filter" },
    ],
  };
  const out = convertResponse(ctx("/v1beta/models/gemini-3.8-flash:generateContent", { state: STATE }), deepFreeze(ok(reply)));
  assert.deepEqual(out, {
    body: {
      candidates: [
        { content: { role: "model", parts: [{ text: "Looking.", thought: true }, { text: "A cat." }] }, finishReason: "STOP", index: 0 },
        { content: { role: "model", parts: [{ functionCall: { name: "lookup", args: { q: "x" }, id: "call_9" } }, { functionCall: { name: "bad", args: { arguments: "not json" }, id: "call_10" } }] }, finishReason: "STOP", index: 1 },
        { content: { role: "model", parts: [{ text: "cut" }] }, finishReason: "MAX_TOKENS", index: 2 },
        { content: { role: "model", parts: [] }, finishReason: "SAFETY", index: 3 },
      ],
      usageMetadata: GEMINI_USAGE,
      modelVersion: RELAY_MODEL,
      responseId: "chatcmpl-1",
    },
    contentType: "application/json",
  });
  // Without a model in the reply the request's upstream model is reported.
  const bare = convertResponse(ctx("/v1/chat/completions", { state: STATE }), ok({ choices: [{ message: { content: "x" }, finish_reason: "stop" }] }));
  assert.equal(bare.body.modelVersion, "gemini-3.8-flash");
  assert.equal(bare.body.usageMetadata, undefined);
});

test("reply errors: relay errors keep their status; empty or 200-with-error replies are not billed", () => {
  const failed = { status: 429, headers: { "content-type": "application/json" }, body: "{\"error\":{\"message\":\"slow down\",\"type\":\"rate_limit\"}}" };
  assert.deepEqual(convertResponse(ctx("/v1/chat/completions", { state: STATE }), failed), { body: failed.body, contentType: "application/json" });
  assert.deepEqual(convertResponse(ctx("/v1/chat/completions", { state: STATE }), ok({ error: { message: "quota", code: 403, type: "x" } })), { error: { status: 403, message: "quota", type: "x" } });
  assert.equal(convertResponse(ctx("/v1/chat/completions", { state: STATE }), ok({ choices: [] })).error.status, 502);
  assert.equal(convertResponse(ctx("/v1/chat/completions", { state: STATE }), { status: 200, headers: {}, body: "nope" }).error.status, 502);
});

function stream(events) {
  let state = { kind: "relay_generate", model: "gemini-3.8-flash", stream: true };
  const out = [];
  for (const input of events) {
    const result = convertStreamEvent(ctx("/v1beta/models/gemini-3.8-flash:streamGenerateContent", { state: state }), deepFreeze(input));
    if (result.error) return { error: result.error, out };
    if (result.state) state = result.state;
    for (const event of result.events || []) out.push(JSON.parse(event.data));
  }
  return { out, state };
}
const chunk = (choices, extra) => ({ data: JSON.stringify(Object.assign({ id: "c1", object: "chat.completion.chunk", model: RELAY_MODEL, choices: choices }, extra || {})) });

test("stream: OpenAI chunks become Gemini events; tool calls are assembled; usage closes the stream", () => {
  const { out } = stream([
    chunk([{ index: 0, delta: { role: "assistant", reasoning_content: "Hm." } }]),
    chunk([{ index: 0, delta: { content: "Hel" } }]),
    chunk([{ index: 0, delta: { content: "lo" } }]),
    chunk([{ index: 0, delta: { tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "lookup", arguments: "{\"q\":" } }] } }]),
    chunk([{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: "\"cat\"}" } }] } }]),
    chunk([{ index: 0, delta: {}, finish_reason: "tool_calls" }]),
    chunk([], { usage: OPENAI_USAGE }),
    { data: "[DONE]" },
    { done: true },
  ]);
  const base = { modelVersion: RELAY_MODEL, responseId: "c1" };
  assert.deepEqual(out, [
    Object.assign({ candidates: [{ content: { role: "model", parts: [{ text: "Hm.", thought: true }] }, index: 0 }] }, base),
    Object.assign({ candidates: [{ content: { role: "model", parts: [{ text: "Hel" }] }, index: 0 }] }, base),
    Object.assign({ candidates: [{ content: { role: "model", parts: [{ text: "lo" }] }, index: 0 }] }, base),
    Object.assign({ candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "lookup", args: { q: "cat" }, id: "call_1" } }] }, finishReason: "STOP", index: 0 }], usageMetadata: GEMINI_USAGE }, base),
  ]);
});

test("stream: finish and usage in one chunk; a relay without usage closes at [DONE]", () => {
  const one = stream([chunk([{ index: 0, delta: { content: "Hi" }, finish_reason: "length" }], { usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 } }), { data: "[DONE]" }, { done: true }]).out;
  assert.equal(one.length, 2);
  assert.deepEqual(one[1].candidates, [{ content: { role: "model", parts: [] }, finishReason: "MAX_TOKENS", index: 0 }]);
  assert.deepEqual(one[1].usageMetadata, { promptTokenCount: 3, candidatesTokenCount: 1, totalTokenCount: 4 });
  const noUsage = stream([chunk([{ index: 0, delta: { content: "Hi" } }]), chunk([{ index: 0, delta: {}, finish_reason: "stop" }]), { data: "[DONE]" }, { done: true }]).out;
  assert.equal(noUsage.length, 2);
  assert.equal(noUsage[1].candidates[0].finishReason, "STOP");
  assert.equal(noUsage[1].usageMetadata, undefined);
  const cut = stream([chunk([{ index: 0, delta: { content: "Hi" } }]), { done: true }]).out;
  assert.equal(cut.length, 1, "a stream cut short sends no finish");
  const failed = stream([chunk([{ index: 0, delta: { content: "Hi" } }]), { data: "{\"error\":{\"message\":\"boom\",\"code\":500}}" }]);
  assert.deepEqual(failed.error, { status: 500, message: "boom" });
});

test("Claude Messages, OpenAI embeddings and images go to the relay's OpenAI paths unchanged", () => {
  const chat = { model: "alias", messages: [{ role: "user", content: "hi" }], stream: true };
  assert.deepEqual(run("/v1/messages", chat, true), {
    body: { model: "gemini-3.8-flash", messages: chat.messages, stream: true, stream_options: { include_usage: true } },
    path: "/v1/chat/completions", stream: true, nativeResponse: true, state: { kind: "relay_pass" },
  });
  assert.deepEqual(run("/v1/messages", { model: "x", messages: [] }, false).body, { model: "gemini-3.8-flash", messages: [] });
  assert.deepEqual(run("/v1/embeddings", { model: "x", input: ["a", "b"], dimensions: 8 }, false, "gemini-embedding-2"), {
    body: { model: "gemini-embedding-2", input: ["a", "b"], dimensions: 8 }, path: "/v1/embeddings", stream: false, nativeResponse: true, state: { kind: "relay_pass" },
  });
  assert.deepEqual(run("/v1/images/generations", { model: "x", prompt: "cube", n: 2, size: "1024x1024", response_format: "url" }, false, "gemini-3.1-flash-image"), {
    body: { model: "gemini-3.1-flash-image", prompt: "cube", n: 2, size: "1024x1024", response_format: "url" }, path: "/v1/images/generations", stream: false, nativeResponse: true, state: { kind: "relay_pass" },
  });
  assert.throws(() => run("/v1/audio/speech", {}, false), /unsupported path/);
});

test("Gemini embedContent / batchEmbedContents become OpenAI embeddings and back", () => {
  const single = run("/v1beta/models/gemini-embedding-2:embedContent", { content: { parts: [{ text: "a" }, { text: "b" }] }, taskType: "RETRIEVAL_QUERY", outputDimensionality: 8 }, false, "gemini-embedding-2");
  assert.deepEqual(single, { body: { model: "gemini-embedding-2", input: "a\nb", encoding_format: "float", dimensions: 8 }, path: "/v1/embeddings", stream: false, state: { kind: "relay_embed", batch: false } });
  const batch = run("/v1/models/gemini-embedding-2:batchEmbedContents", { requests: [{ model: "models/gemini-embedding-2", content: { parts: [{ text: "a" }] } }, { content: { parts: [{ text: "b" }] } }] }, false, "gemini-embedding-2");
  assert.deepEqual(batch.body, { model: "gemini-embedding-2", input: ["a", "b"], encoding_format: "float" });
  assert.throws(() => run("/v1beta/models/gemini-embedding-2:embedContent", { content: { parts: [{ inlineData: { mimeType: "image/png", data: "AA" } }] } }, false), /other than text/);
  assert.throws(() => run("/v1beta/models/gemini-embedding-2:batchEmbedContents", { requests: [{ content: { parts: [{ text: "a" }] }, outputDimensionality: 8 }, { content: { parts: [{ text: "b" }] } }] }, false), /outputDimensionality/);
  const reply = ok({ object: "list", model: "relay-embed", data: [{ index: 1, embedding: [0.3] }, { index: 0, embedding: [0.1, 0.2] }], usage: { prompt_tokens: 6, total_tokens: 6 } });
  assert.deepEqual(convertResponse(ctx("/v1/models/gemini-embedding-2:batchEmbedContents", { state: batch.state }), reply), {
    body: { embeddings: [{ values: [0.1, 0.2] }, { values: [0.3] }], usageMetadata: { promptTokenCount: 6 } }, contentType: "application/json",
  });
  assert.deepEqual(convertResponse(ctx("/v1beta/models/gemini-embedding-2:embedContent", { state: single.state }), reply).body.embedding, { values: [0.1, 0.2] });
  assert.equal(convertResponse(ctx("/v1beta/models/gemini-embedding-2:embedContent", { state: single.state }), ok({ data: [{ embedding: "base64" }] })).error.status, 502);
});

test("fetch models: the relay's /v1/models, ids kept as they are, no task models added", () => {
  const first = convertResponse(ctx("/v1/models", { state: null }), { status: 404, headers: {}, body: "not found" });
  assert.deepEqual(first, { next: { method: "GET", path: "/v1/models" }, state: { kind: "relay_models" } });
  const list = ok({ object: "list", data: [{ id: "gemini-3.8-flash", object: "model", owned_by: "relay" }, { id: "Gemini-Custom:latest" }, { id: "gemini-3.8-flash" }, { id: "" }] });
  assert.deepEqual(convertResponse(ctx("/v1/models", { state: first.state }), list), {
    body: { object: "list", data: [{ id: "gemini-3.8-flash", object: "model", owned_by: "openai-compatible" }, { id: "Gemini-Custom:latest", object: "model", owned_by: "openai-compatible" }] },
    contentType: "application/json",
  });
  assert.equal(convertResponse(ctx("/v1/models", { state: first.state }), { status: 401, headers: {}, body: "{}" }).error.status, 401);
  assert.equal(convertResponse(ctx("/v1/models", { state: first.state }), ok({ models: [] })).error.status, 502);
});

test("Gemini Omni and Gemini Decision are refused on a relay channel before anything is sent", () => {
  for (const model of ["gemini-omni-1.2-flash", "gemini-decision-1"]) {
    assert.throws(() => buildSubmitRequest(deepFreeze({ model: model, upstreamModel: model, baseUrl: RELAY, apiKey: "sk", config: { upstreamType: "openai" }, upstream: { kind: "vendor" }, requestBody: {}, action: "" })),
      /need the Gemini API; this channel's upstream type is an OpenAI-compatible relay/);
  }
});
