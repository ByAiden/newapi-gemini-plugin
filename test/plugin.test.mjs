// Runs the hooks the way new-api calls them: node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

globalThis.utils = {
  base64URL: (s) => Buffer.from(String(s)).toString("base64url"),
  base64URLDecode: (s) => Buffer.from(String(s), "base64url").toString(),
};

const plugin = await import("../plugin.js");
const { meta, native, protocols, buildSubmitRequest, parseSubmitResponse, extractUsage, extractUsageOnComplete, buildQueryRequest, parseTaskResult, listArtifacts, buildContentRequest } = plugin;

const OMNI = ["gemini-omni-1.2-flash", "gemini-omni-1.1-flash"];
const BASE = "https://generativelanguage.googleapis.com";

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const QUICKSTART = {
  model: "gemini-decision-1",
  input: "The blue mug I ordered on Monday arrived cracked on Wednesday.",
  questions: {
    is_damaged: { type: "noul", instructions: "Did the item arrive damaged?" },
    queue: {
      type: "choice",
      instructions: "Which support queue should handle this message?",
      criteria: { billing: "Payment, invoice, or refund questions.", replacements: "Damaged, missing, or wrong items.", general: "Product questions." },
    },
    severity: { type: "score", instructions: [{ type: "text", text: "How severe is it?" }], criteria: ["Cosmetic", "Workaround", "Blocked"] },
  },
};

const REPLY = {
  answers: {
    is_damaged: { type: "noul", noul: 0.99, confidence: 0.99 },
    queue: { type: "choice", choice: "replacements", probabilities: { billing: 0.01, general: 0.01, replacements: 0.98 }, confidence: 0.98 },
    severity: { type: "score", score: 1.1, legend: { 0: "Cosmetic", 1: "Workaround", 2: "Blocked" }, probabilities: { 0: 0.05, 1: 0.8, 2: 0.15 }, confidence: 0.8 },
  },
  usage: { total_input_tokens: 324, input_tokens_by_modality: [{ modality: "text", tokens: 324 }], total_output_tokens: 0, total_tokens: 324 },
};

function decode(body) {
  return native.decisions({ body: { kind: "json", value: body }, params: {} });
}

function driverCtx(intent, extra) {
  return Object.assign(
    {
      requestBody: intent.requestBody,
      requestHeaders: { "Content-Type": "application/json", Accept: "" },
      action: intent.action,
      model: intent.model,
      upstreamModel: intent.model,
      baseUrl: BASE,
      apiKey: "AIza-test",
      upstream: { kind: "vendor" },
      files: [],
      publicTaskId: "task_abc",
    },
    extra || {},
  );
}

test("meta is a plain JSON literal with the community key", () => {
  const source = readFileSync(new URL("../plugin.js", import.meta.url), "utf8");
  const block = source.match(/export const meta = (\{[\s\S]*?\n\});/);
  assert.ok(block);
  const json = block[1].replace(/^\s*\/\/[^\n]*\n/gm, "").replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":').replace(/,(\s*[}\]])/g, "$1");
  assert.deepEqual(JSON.parse(json), meta);
  assert.equal(meta.key, "byaiden_gemini");
  assert.ok(meta.key.length <= 30);
  assert.equal(meta.channelTypes, undefined);
  assert.equal(meta.baseUrl, BASE);
  assert.equal(meta.author.url, "https://github.com/" + meta.author.name);
  assert.equal(meta.version, "1.1.1");
  assert.deepEqual(meta.models, OMNI.concat(["gemini-decision-1"]));
});

test("video protocols serve Omni, the decisions route serves Gemini Decision", () => {
  for (const protocol of meta.protocols) assert.deepEqual(protocol.models, OMNI);
  assert.deepEqual(meta.routes, [
    { method: "POST", path: "/v1beta/decisions", type: "submit", decode: "decisions", render: "decided", retainResult: false, models: ["gemini-decision-1"] },
  ]);
  assert.deepEqual(meta.usageProfiles[0].models, ["gemini-decision-1"]);
  assert.deepEqual(Object.keys(meta.usageProfiles[0].schema), ["input_tokens"]);
  assert.deepEqual(Object.keys(meta.usageSchema), ["input_tokens", "output_tokens", "video_tokens"]);
});

test("Omni usage examples equal the reservation for their duration and resolution", () => {
  const specs = { "3s 360p": [3, "360p"], "8s 720p": [8, "720p"], "8s 1080p": [8, "1080p"], "10s 4k": [10, "4k"] };
  for (const example of meta.usageExamples) {
    const [seconds, resolution] = specs[example.label];
    const intent = protocols.openai_video.decodeRequest({ model: "gemini-omni-1.2-flash", body: { kind: "json", value: { prompt: "x", seconds, resolution } } });
    assert.deepEqual(extractUsage(driverCtx(intent)), example.facts, example.label);
  }
});

test("a decision request runs decode, submit, usage and render like the gateway", () => {
  const intent = decode(deepFreeze(structuredClone(QUICKSTART)));
  assert.equal(intent.kind, "submit");
  assert.equal(intent.action, "decide");
  assert.equal(intent.model, "gemini-decision-1");
  const ctx = deepFreeze(driverCtx(intent));

  const usage = extractUsage(ctx);
  const bytes = Buffer.byteLength(JSON.stringify({ input: QUICKSTART.input, questions: QUICKSTART.questions }));
  assert.deepEqual(usage, { input_tokens: bytes + 256 + 64 * 3 });
  assert.equal(extractUsage(Object.assign({}, ctx, { usagePurpose: "billing_ratios" })), null);

  const request = buildSubmitRequest(ctx);
  assert.equal(request.url, BASE + "/v1beta/decisions");
  assert.equal(request.method, "POST");
  assert.equal(request.headers["x-goog-api-key"], "AIza-test");
  assert.equal(request.headers.Authorization, undefined);
  assert.deepEqual(request.body, { model: "gemini-decision-1", input: QUICKSTART.input, questions: QUICKSTART.questions });

  const parsed = parseSubmitResponse(ctx, deepFreeze({ statusCode: 200, headers: {}, body: structuredClone(REPLY) }));
  assert.equal(parsed.taskId, "task_abc");
  assert.deepEqual(parsed.immediate, { status: "SUCCESS", progress: "100%" });

  const task = { taskId: "task_abc", publicTaskId: "task_abc", action: "decide", model: "gemini-decision-1", upstreamModel: "gemini-decision-1" };
  assert.deepEqual(extractUsageOnComplete(task, parsed.immediate, parsed.taskData), { input_tokens: 324 });
  assert.deepEqual(native.decided({}, { task_id: "task_abc", data: parsed.taskData }), REPLY);
  assert.deepEqual(listArtifacts({ taskId: "task_abc", status: "SUCCESS", action: "decide", data: parsed.taskData }), []);
});

test("a mapped alias sends the upstream model name", () => {
  const intent = decode(Object.assign({}, QUICKSTART, { model: "decision" }));
  const request = buildSubmitRequest(driverCtx(intent, { model: "decision", upstreamModel: "gemini-decision-1" }));
  assert.equal(request.body.model, "gemini-decision-1");
});

test("through another New API gateway the request goes under the plugin key with a Bearer token", () => {
  const intent = decode(QUICKSTART);
  const request = buildSubmitRequest(driverCtx(intent, { baseUrl: "https://up.example", apiKey: "sk-up", upstream: { kind: "new_api" } }));
  assert.equal(request.url, "https://up.example/" + meta.key + "/v1beta/decisions");
  assert.equal(request.headers.Authorization, "Bearer sk-up");
  assert.equal(request.headers["x-goog-api-key"], undefined);
});

test("media input reserves the whole context window", () => {
  const body = Object.assign({}, QUICKSTART, {
    input: [
      { type: "image", uri: "https://storage.googleapis.com/generativeai-downloads/images/spill.jpg", mime_type: "image/jpeg", resolution: "low" },
      { type: "text", text: "Breakroom check." },
    ],
  });
  assert.deepEqual(extractUsage(driverCtx(decode(body))), { input_tokens: 262144 });
});

test("long text input is capped at the context window", () => {
  const body = Object.assign({}, QUICKSTART, { input: "x".repeat(300000) });
  assert.deepEqual(extractUsage(driverCtx(decode(body))), { input_tokens: 262144 });
});

test("invalid decision requests are rejected before billing", () => {
  const bad = [
    [{ ...QUICKSTART, temperature: 0 }, /request.temperature is not supported/],
    [{ ...QUICKSTART, input: "" }, /input cannot be empty/],
    [{ ...QUICKSTART, input: [] }, /input cannot be empty/],
    [{ ...QUICKSTART, questions: {} }, /1 to 1000 questions/],
    [{ ...QUICKSTART, questions: { "bad key": { type: "noul", instructions: "x" } } }, /question keys/],
    [{ ...QUICKSTART, questions: { q: { type: "box", instructions: "x" } } }, /noul, choice, or score/],
    [{ ...QUICKSTART, questions: { q: { type: "noul" } } }, /instructions is required/],
    [{ ...QUICKSTART, questions: { q: { type: "noul", instructions: { type: "image", uri: "https://a.example/x.png", mime_type: "image/png" } } } }, /must be text/],
    [{ ...QUICKSTART, questions: { q: { type: "choice", instructions: "x", criteria: { only: "" } } } }, /2 to 255 options/],
    [{ ...QUICKSTART, questions: { q: { type: "choice", instructions: "x", criteria: { " a": "", b: "" } } } }, /option keys/],
    [{ ...QUICKSTART, questions: { q: { type: "score", instructions: "x", criteria: ["a", ""] } } }, /non-empty strings/],
    [{ ...QUICKSTART, questions: { q: { type: "noul", instructions: "x", criteria: { yes: "a" } } } }, /criteria.yes is not supported/],
    [{ ...QUICKSTART, input: { type: "image", mime_type: "image/png" } }, /exactly one of data or uri/],
    [{ ...QUICKSTART, input: { type: "image", uri: "gs://bucket/x.png", mime_type: "image/png" } }, /HTTPS URL/],
    [{ ...QUICKSTART, input: { type: "document", uri: "https://generativelanguage.googleapis.com/v1beta/files/abc", mime_type: "application/pdf" } }, /Files API/],
    [{ ...QUICKSTART, input: { type: "audio", data: "AAAA" } }, /mime_type is required/],
    [{ ...QUICKSTART, input: { type: "video", data: "AAAA", mime_type: "video/mp4", resolution: "ultra_high" } }, /resolution must be one of low, medium, high/],
    [{ ...QUICKSTART, input: { type: "function_call", name: "x" } }, /type must be text, image/],
  ];
  for (const [body, message] of bad) assert.throws(() => decode(body), message, JSON.stringify(body).slice(0, 120));
  assert.throws(() => native.decisions({ body: { kind: "multipart", fields: {}, files: [] } }), /JSON body required/);
});

test("a reply missing an answer or usage fails instead of billing zero", () => {
  const ctx = driverCtx(decode(QUICKSTART));
  const partial = structuredClone(REPLY);
  delete partial.answers.queue;
  assert.throws(() => parseSubmitResponse(ctx, { statusCode: 200, body: partial }), /question queue/);
  const wrongType = structuredClone(REPLY);
  wrongType.answers.queue.type = "noul";
  assert.throws(() => parseSubmitResponse(ctx, { statusCode: 200, body: wrongType }), /question queue/);
  const task = { action: "decide", model: "gemini-decision-1", upstreamModel: "gemini-decision-1" };
  assert.throws(() => extractUsageOnComplete(task, {}, { answers: REPLY.answers }), /usage/);
  assert.throws(() => extractUsageOnComplete(task, {}, { answers: REPLY.answers, usage: { total_input_tokens: 262145 } }), /usage/);
  assert.deepEqual(extractUsageOnComplete(task, {}, { answers: REPLY.answers, usage: { total_input_tokens: 0 } }), { input_tokens: 0 });
});

function videoIntent(value, model) {
  return protocols.openai_video.decodeRequest({ model: model || "gemini-omni-1.2-flash", body: { kind: "json", value: value } });
}

// The finished interaction shape Google returned for a 3 s 360p video.
const DONE = {
  id: "v1_abc",
  object: "interaction",
  status: "completed",
  model: "gemini-omni-1.2-flash",
  usage: {
    total_tokens: 6342,
    total_input_tokens: 14,
    input_tokens_by_modality: [{ modality: "text", tokens: 14 }],
    total_output_tokens: 5793,
    output_tokens_by_modality: [{ modality: "video", tokens: 5793 }],
    total_thought_tokens: 535,
  },
  steps: [
    { type: "user_input", content: [{ type: "text", text: "A red paper boat" }] },
    { type: "thought", signature: "sig" },
    { type: "model_output", content: [{ type: "video", mime_type: "video/mp4", data: "AAAAIGZ0eXA=" }] },
  ],
};

test("a text-to-video request runs submit, poll, settlement and download like the gateway", () => {
  const intent = videoIntent({ prompt: "A red paper boat", seconds: 3, resolution: "360p", size: "720x1280" });
  assert.equal(intent.action, "text_to_video");
  const ctx = deepFreeze(driverCtx(intent));
  assert.deepEqual(extractUsage(ctx), { input_tokens: 0, output_tokens: 0, video_tokens: 5793 });

  const request = buildSubmitRequest(ctx);
  assert.equal(request.url, BASE + "/v1beta/interactions");
  assert.equal(request.method, "POST");
  assert.equal(request.headers["x-goog-api-key"], "AIza-test");
  assert.deepEqual(request.body, {
    model: "gemini-omni-1.2-flash",
    input: [{ type: "text", text: "A red paper boat" }],
    response_format: { type: "video", aspect_ratio: "9:16", resolution: "360p", duration: "3s" },
    background: true,
    store: true,
    generation_config: { video_config: { task: "text_to_video" } },
  });

  const created = { id: "v1_abc", status: "in_progress", object: "interaction", model: "gemini-omni-1.2-flash" };
  const parsed = parseSubmitResponse(ctx, deepFreeze({ statusCode: 200, body: created }));
  assert.equal(parsed.taskId, "v1_abc");
  assert.equal(parsed.immediate, undefined);

  const query = { taskId: "v1_abc", action: "text_to_video", model: "gemini-omni-1.2-flash", upstreamModel: "gemini-omni-1.2-flash", baseUrl: BASE, apiKey: "AIza-test", upstream: { kind: "vendor" } };
  assert.deepEqual(buildQueryRequest(query), { url: BASE + "/v1beta/interactions/v1_abc", method: "GET", headers: { Accept: "application/json", "x-goog-api-key": "AIza-test" } });
  assert.equal(parseTaskResult(query, created).status, "IN_PROGRESS");
  assert.deepEqual(parseTaskResult(query, deepFreeze(structuredClone(DONE))), { status: "SUCCESS", progress: "100%" });
  assert.deepEqual(extractUsageOnComplete(query, {}, DONE), { input_tokens: 14, output_tokens: 535, video_tokens: 5793 });

  const task = { taskId: "v1_abc", status: "SUCCESS", action: "text_to_video", data: DONE };
  assert.deepEqual(listArtifacts(task), [{ key: "video", type: "video", mimeType: "video/mp4" }]);
  const content = buildContentRequest(Object.assign({}, query, { artifactKey: "video", data: DONE, upstreamTaskId: "v1_abc", clientRequest: { method: "GET" } }));
  assert.equal(content.url, BASE + "/v1beta/interactions/v1_abc");
  assert.equal(content.responseType, "json");
  assert.deepEqual(content.contentPath, ["steps", 2, "content", 0, "data"]);
  assert.equal(content.mimeType, "video/mp4");
});

test("defaults are 8 seconds at 720p, landscape, sent explicitly", () => {
  const ctx = driverCtx(videoIntent({ prompt: "x" }));
  assert.deepEqual(buildSubmitRequest(ctx).body.response_format, { type: "video", aspect_ratio: "16:9", resolution: "720p", duration: "8s" });
  assert.deepEqual(extractUsage(ctx), { input_tokens: 0, output_tokens: 0, video_tokens: 8 * 5792 });
  assert.equal(buildSubmitRequest(driverCtx(videoIntent({ prompt: "x", size: "1920x1080" }))).body.response_format.resolution, "1080p");
});

test("images become input blocks in order; one is a first frame, two skip the task hint", () => {
  const png = "data:image/png;base64,iVBORw0KGgoAAAA";
  const jpeg = "/9j/4AAQSkZJRg";
  const one = buildSubmitRequest(driverCtx(videoIntent({ prompt: "animate", input_reference: png })));
  assert.deepEqual(one.body.input, [{ type: "image", mime_type: "image/png", data: "iVBORw0KGgoAAAA" }, { type: "text", text: "animate" }]);
  assert.deepEqual(one.body.generation_config, { video_config: { task: "image_to_video" } });
  assert.equal(one.action, "image_to_video");
  const two = buildSubmitRequest(driverCtx(videoIntent({ prompt: "morph", images: [png, jpeg], seconds: 10 })));
  assert.deepEqual(two.body.input.map((b) => b.mime_type || b.type), ["image/png", "image/jpeg", "text"]);
  assert.equal(two.body.generation_config, undefined);
  assert.throws(() => extractUsage(driverCtx(videoIntent({ prompt: "morph", images: [png, jpeg], seconds: 11 }))), /3 to 10/);
  assert.throws(() => videoIntent({ prompt: "x", images: Array.from({ length: 7 }, (_, i) => png + "A".repeat(i)) }), /at most 6/);
  assert.throws(() => buildSubmitRequest(driverCtx(videoIntent({ prompt: "x", images: ["data:image/gif;base64,R0lGOD"] }))), /image\/jpeg or image\/png/);
});

test("a multipart input_reference upload is sent as the first frame", () => {
  const intent = protocols.openai_video.decodeRequest({
    model: "gemini-omni-1.2-flash",
    body: { kind: "multipart", fields: { prompt: ["animate"], seconds: ["4"] }, files: [{ field: "input_reference", mimeType: "image/jpeg", ref: "request_file:input_reference" }] },
  });
  assert.equal(intent.requestBody.duration, 4);
  const ctx = driverCtx(intent, { files: [{ field: "input_reference", mimeType: "image/jpeg", ref: "request_file:input_reference" }] });
  const block = buildSubmitRequest(ctx).body.input[0];
  assert.equal(block.mime_type, "image/jpeg");
  assert.equal(block.data.__fileRef, "request_file:input_reference");
  assert.throws(
    () => protocols.openai_video.decodeRequest({ model: "m", body: { kind: "multipart", fields: {}, files: [{ field: "input_reference", mimeType: "image/gif" }] } }),
    /image\/jpeg or image\/png/,
  );
});

test("duration and resolution limits follow the model", () => {
  assert.throws(() => videoIntent({ prompt: "x", seconds: 2 }), /3 to 15/);
  assert.throws(() => videoIntent({ prompt: "x", seconds: 16 }), /3 to 15/);
  assert.throws(() => videoIntent({ prompt: "x", seconds: 4.5 }), /3 to 15/);
  assert.throws(() => videoIntent({ prompt: "x", resolution: "480p" }), /360p, 720p, 1080p, 4k/);
  assert.deepEqual(extractUsage(driverCtx(videoIntent({ prompt: "x", seconds: 15 }))).video_tokens, 15 * 5792);
  const old = videoIntent({ prompt: "x", seconds: 12 }, "gemini-omni-1.1-flash");
  assert.throws(() => extractUsage(driverCtx(old)), /3 to 10/);
  assert.throws(() => buildSubmitRequest(driverCtx(old)), /3 to 10/);
});

test("the Responses protocol decodes text and image input for Omni", () => {
  const intent = protocols.openai_responses.decodeRequest({
    body: {
      kind: "json",
      value: { model: "gemini-omni-1.2-flash", input: [{ role: "user", content: [{ type: "input_text", text: "A cat" }, { type: "input_image", image_url: "data:image/png;base64,iVBORw0KGgo" }] }], seconds: 5 },
    },
  });
  assert.equal(intent.action, "image_to_video");
  const body = buildSubmitRequest(driverCtx(intent)).body;
  assert.equal(body.response_format.duration, "5s");
  assert.deepEqual(body.input[1], { type: "text", text: "A cat" });
  const done = protocols.openai_responses.renderFinal({ artifacts: { video: { url: "https://gw.example/v.mp4?a=1&b=2" } } }, {});
  assert.match(done.output[0].content[0].text, /src="https:\/\/gw.example\/v.mp4\?a=1&amp;b=2"/);
});

test("Omni failures and unknown states are reported, never guessed", () => {
  assert.deepEqual(parseTaskResult({}, { status: "failed", errors: [{ code: "safety", message: "blocked" }] }), { status: "FAILURE", progress: "100%", reason: "safety: blocked" });
  assert.equal(parseTaskResult({}, { error: { message: "boom" } }).status, "FAILURE");
  assert.equal(parseTaskResult({}, { status: "requires_action" }).status, "UNKNOWN");
  assert.equal(parseTaskResult({}, { status: "completed", steps: [] }).status, "FAILURE");
  assert.deepEqual(listArtifacts({ status: "FAILURE", data: DONE }), []);
  assert.throws(() => buildContentRequest({ artifactKey: "image", data: DONE }), /artifact_not_found/);
  assert.equal(extractUsageOnComplete({ model: "gemini-omni-1.2-flash" }, {}, { status: "completed" }), null);
});

test("Omni through another New API gateway is refused before billing reaches Google", () => {
  const ctx = driverCtx(videoIntent({ prompt: "x" }), { baseUrl: "https://up.example", upstream: { kind: "new_api" } });
  assert.throws(() => buildSubmitRequest(ctx), /not available through a New API gateway/);
});

test("a mapped Omni alias sends the upstream model name", () => {
  const intent = videoIntent({ prompt: "x" }, "video");
  assert.equal(buildSubmitRequest(driverCtx(intent, { model: "video", upstreamModel: "gemini-omni-1.2-flash" })).body.model, "gemini-omni-1.2-flash");
});


test("code never references meta, so the gateway can read it statically", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../plugin.js", import.meta.url), "utf8");
  const rest = src.slice(src.indexOf("\n};\n", src.indexOf("export const meta = {")));
  assert.doesNotMatch(rest, /(^|[^A-Za-z0-9_$.])meta([^A-Za-z0-9_$]|$)/m);
  assert.ok(rest.includes(JSON.stringify(meta.key)));
});
