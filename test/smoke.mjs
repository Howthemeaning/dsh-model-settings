/**
 * Smoke test for dsh-model-settings host half.
 *
 * Mocks a minimal cordis ctx (on/inject/effect/get) and drives:
 *   1. apply() registration (settings namespace, agent/request listener, routes)
 *   2. agent/request interception: subagent → subagent slot; goal-active session
 *      → goal slot; plain session → untouched; empty slot → untouched
 *   3. /save writes agent-default-model + model-settings, returns updated state
 *   4. /apply-current installs an agent-scoped override that only rewrites the
 *      target agent's own requests (child requests pass through)
 *   5. /state exposes the model catalog with reasoning efforts
 *
 * Run with the project's node_modules junctioned to the dsh profile's
 * node_modules so @deepseek-ai/dsh-settings etc. resolve.
 */
import assert from "node:assert/strict";
import { apply } from "../lib/index.js";

// --- minimal cordis ctx mock ---
function createCtx(services = {}) {
	const listeners = new Map();
	const routes = new Map();
	if (services.webServer === void 0) {
		services.webServer = {
			register: (route) => {
				routes.set(route.path, route.handler);
				return () => routes.delete(route.path);
			}
		};
	}
	const ctx = {
		...services,
		on(event, handler) {
			if (!listeners.has(event)) listeners.set(event, []);
			listeners.get(event).push(handler);
			return () => {
				const list = listeners.get(event) ?? [];
				list.splice(list.indexOf(handler), 1);
			};
		},
		inject(deps, callback) {
			if (deps.includes("settings") && ctx.get("settings") === void 0) return;
			const sctx = { ...ctx, settings: ctx.get("settings"), effect: ctx.effect };
			return callback(sctx);
		},
		effect(fn) {
			const disposer = fn();
			return typeof disposer === "function" ? disposer : () => {};
		},
		get(key) {
			return services[key];
		},
		logger: { warn: () => {}, info: () => {}, error: () => {} },
		fiber: { state: 0 }
	};
	return { ctx, listeners, routes };
}

// --- fake settings service (mirrors the SettingsProvider surface we use) ---
function createSettings(initial = {}) {
	const documents = new Map();
	let revision = 1;
	const watchers = new Set();
	const service = {
		writable: true,
		documentPath: "/fake/settings.yaml",
		register(ns, schema, options) {
			const key = String(ns);
			const base = options?.base ?? {};
			documents.set(key, { value: {}, base, revision: revision++ });
			return {
				get: () => ({ ...base, ...documents.get(key).value }),
				watch: (fn) => {
					watchers.add(fn);
					return () => watchers.delete(fn);
				}
			};
		},
		async replace(ns, section) {
			const key = String(ns);
			if (!documents.has(key)) throw new Error(`unknown namespace ${key}`);
			documents.set(key, { ...documents.get(key), value: section, revision: revision++ });
			for (const fn of watchers) fn();
		},
		describe() {
			return [...documents.entries()].map(([ns, doc]) => ({
				ns: String(ns),
				schema: {},
				value: { ...doc.base, ...doc.value },
				applies: "user",
				revision: doc.revision,
				secrets: []
			}));
		}
	};
	return service;
}

// --- fake agents / goals / llm / default-model services ---
function createAgents(map) {
	return { get: (id) => map.get(id) };
}
function createGoals(activeIds) {
	const set = new Set(activeIds);
	return {
		view(agent) {
			return set.has(agent.id) ? { phase: "active", activation: "armed" } : void 0;
		}
	};
}
function createLlm() {
	return {
		listProviders: () => [{ id: "deepseek-official" }, { id: "kimi-coding" }],
		listModels: async (provider) =>
			provider === "deepseek-official"
				? [{ id: "deepseek-v4-flash" }, { id: "deepseek-v4" }]
				: [{ id: "k3-256k" }],
		resolveModelInfo: async (provider, model) => ({
			reasoning: model === "deepseek-v4" ? { efforts: [{ id: "low" }, { id: "high", name: "High" }] } : void 0
		})
	};
}
function fakeAgent(id, overrides = {}) {
	return {
		id,
		options: overrides.options ?? {},
		session: { header: overrides.header ?? {}, append: overrides.append ?? (() => {}) },
		ctx: { on: () => () => {} }
	};
}
function streamReq(rawBody) {
	const handlers = {};
	const req = {
		setEncoding: () => {},
		destroy: () => {},
		on: (event, fn) => {
			(handlers[event] ??= []).push(fn);
			return req;
		},
		emit(event, arg) {
			for (const fn of handlers[event] ?? []) fn(arg);
		}
	};
	return { req, rawBody };
}
function jsonRes() {
	let status = 0;
	let body = null;
	const res = {
		writeHead: (s) => { status = s; },
		end: (b) => { body = JSON.parse(b); }
	};
	return { res, get status() { return status; }, get body() { return body; } };
}
async function callWithBody(handler, rawBody) {
	const { req } = streamReq(rawBody);
	const out = jsonRes();
	await handler(req, out.res);
	if (rawBody.length > 0) {
		req.emit("data", rawBody);
		req.emit("end");
	}
	// readBody resolves on 'end'; the handler already awaited it, so re-run with
	// the body delivered synchronously before awaiting is impossible — instead
	// emit before calling the handler:
	// (see callWithBody2 below)
	return out;
}
async function callWithBody2(handler, rawBody) {
	const { req } = streamReq(rawBody);
	const out = jsonRes();
	// start the handler first so readBody's listeners are registered, then emit
	const pending = handler(req, out.res);
	if (rawBody.length > 0) req.emit("data", rawBody);
	req.emit("end");
	await pending;
	return out;
}

// --- build the composition ---
const agents = createAgents(new Map());
const goals = createGoals(["session-goal"]);
const settings = createSettings();
// the agent-default-model namespace is owned by dsh-agent-default-model in a
// real deployment; pre-register it here with the same shape
settings.register("agent-default-model", {}, { base: { provider: "deepseek-official", model: "deepseek-v4-flash" } });
const llm = createLlm();
// real agentDefaultModel.currentSelection() reads the settings namespace live
const agentDefaultModel = {
	currentSelection: () => {
		const ns = settings.describe().find((d) => d.ns === "agent-default-model");
		const value = ns?.value ?? {};
		return {
			provider: value.provider ?? "deepseek-official",
			model: value.model ?? "deepseek-v4-flash",
			...(value.reasoningEffort !== void 0 ? { reasoningEffort: value.reasoningEffort } : {})
		};
	}
};
const { ctx, listeners, routes } = createCtx({ settings, agents, goals, llm, agentDefaultModel });
apply(ctx, {});

// --- 1) registrations ---
assert.ok(listeners.has("agent/request"), "agent/request listener registered");
assert.equal(routes.size, 3, "three routes registered");
for (const path of ["/api/model-settings/state", "/api/model-settings/save", "/api/model-settings/apply-current"]) {
	assert.ok(routes.has(path), `route ${path}`);
}

// --- 2) agent/request interception ---
async function runWaterfall(agent) {
	// real seed: agent.options (agent-loop buildRequest route)
	let resolved = {
		provider: agent.options?.provider ?? "deepseek-official",
		model: agent.options?.model ?? "deepseek-v4-flash",
		...(agent.options?.reasoningEffort !== void 0 ? { reasoningEffort: agent.options.reasoningEffort } : {})
	};
	for (const handler of listeners.get("agent/request")) {
		resolved = await handler({ agent }, async () => resolved);
	}
	return resolved;
}

// no override configured → untouched
{
	const agent = fakeAgent("session-plain", { options: { provider: "kimi-coding", model: "k3-256k" } });
	const result = await runWaterfall(agent);
	assert.equal(result.provider, "kimi-coding", "plain session untouched without config");
}

// subagent with subagent slot configured → overridden
await settings.replace("model-settings", { subagent: { provider: "kimi-coding", model: "k3-256k" } });
{
	const agent = fakeAgent("child-1", { options: { provider: "deepseek-official", model: "deepseek-v4-flash", subagentDepth: 1 }, header: { origin: "subagent" } });
	const result = await runWaterfall(agent);
	assert.equal(result.provider, "kimi-coding", "subagent provider overridden");
	assert.equal(result.model, "k3-256k", "subagent model overridden");
	assert.equal(result.reasoningEffort, void 0, "no effort when slot omits it");
}

// subagent detected via session header origin alone
{
	const agent = fakeAgent("child-2", { header: { origin: "subagent" } });
	const result = await runWaterfall(agent);
	assert.equal(result.provider, "kimi-coding", "subagent via origin header");
}

// subagent slot cleared → untouched again
await settings.replace("model-settings", {});
{
	const agent = fakeAgent("child-3", { options: { subagentDepth: 1 } });
	const result = await runWaterfall(agent);
	assert.equal(result.provider, "deepseek-official", "cleared subagent slot leaves request untouched");
}

// goal-active session with goal slot configured → goal override
await settings.replace("model-settings", { goal: { provider: "deepseek-official", model: "deepseek-v4", reasoningEffort: "low" } });
{
	const agent = fakeAgent("session-goal", { options: { provider: "deepseek-official", model: "deepseek-v4-flash" } });
	const result = await runWaterfall(agent);
	assert.equal(result.model, "deepseek-v4", "goal slot model");
	assert.equal(result.reasoningEffort, "low", "goal slot effort");
}

// plain session still untouched while goal slot is set
{
	const agent = fakeAgent("session-plain", { options: { provider: "kimi-coding", model: "k3-256k" } });
	const result = await runWaterfall(agent);
	assert.equal(result.model, "k3-256k", "plain session untouched even with goal slot set");
}

// subagent AND goal-active: subagent wins (subagent check first)
await settings.replace("model-settings", {
	subagent: { provider: "kimi-coding", model: "k3-256k" },
	goal: { provider: "deepseek-official", model: "deepseek-v4" }
});
{
	const agent = fakeAgent("session-goal", { options: { subagentDepth: 1 }, header: { origin: "subagent" } });
	const result = await runWaterfall(agent);
	assert.equal(result.model, "k3-256k", "subagent takes precedence over goal slot");
}

// --- 3) /save endpoint ---
{
	const save = routes.get("/api/model-settings/save");
	const out = await callWithBody2(save, JSON.stringify({
		main: { provider: "kimi-coding", model: "k3-256k", reasoningEffort: "high" },
		subagent: { provider: "kimi-coding", model: "k3-256k" },
		goal: null
	}));
	assert.equal(out.status, 200, "save ok");
	assert.equal(out.body.ok, true, "save ok flag");
	assert.equal(out.body.defaultModel.provider, "kimi-coding", "default model updated");
	assert.equal(out.body.subagent.provider, "kimi-coding", "subagent override saved");
	assert.equal(out.body.goal, null, "goal cleared");

	// empty body → no-op 200 (nothing to write)
	const out2 = await callWithBody2(save, "");
	assert.equal(out2.status, 200, "empty body is a no-op 200");

	// malformed body → 400
	const out3 = await callWithBody2(save, "{not-json");
	assert.equal(out3.status, 400, "malformed body rejected");
}

// --- 4) /apply-current endpoint: session override lives on the root interceptor ---
{
	const agent = fakeAgent("session-live", { options: { provider: "kimi-coding", model: "k3-256k" } });
	const liveCtx = createCtx({ settings, agents: createAgents(new Map([["session-live", agent]])), goals, llm, agentDefaultModel });
	apply(liveCtx.ctx, {});
	const applyRoute = liveCtx.routes.get("/api/model-settings/apply-current");
	const waterfall = liveCtx.listeners.get("agent/request");

	const out = await callWithBody2(applyRoute, JSON.stringify({ sessionId: "session-live", provider: "deepseek-official", model: "deepseek-v4" }));
	assert.equal(out.status, 200, "apply ok");
	assert.equal(out.body.ok, true, "apply ok flag");

	// target session rewritten by the ROOT interceptor (must beat the session's own selection)
	let resolved = await waterfall[0]({ agent }, async () => ({ provider: "kimi-coding", model: "k3-256k" }));
	assert.equal(resolved.provider, "deepseek-official", "session override provider");
	assert.equal(resolved.model, "deepseek-v4", "session override model");

	// another session untouched
	const other = fakeAgent("other", { options: { provider: "kimi-coding", model: "k3-256k" } });
	resolved = await waterfall[0]({ agent: other }, async () => ({ provider: "kimi-coding", model: "k3-256k" }));
	assert.equal(resolved.model, "k3-256k", "other session untouched");

	// unknown session → 404
	const out2 = await callWithBody2(applyRoute, JSON.stringify({ sessionId: "nope", provider: "x", model: "y" }));
	assert.equal(out2.status, 404, "unknown session 404");
}

// --- 4b) /save with sessionId also applies main override to the current conversation ---
{
	const agent = fakeAgent("session-save", { options: { provider: "deepseek-official", model: "deepseek-v4-flash" } });
	const { ctx: ctx2, routes: routes2, listeners: listeners2 } = createCtx({ settings, agents: createAgents(new Map([["session-save", agent]])), goals, llm, agentDefaultModel });
	apply(ctx2, {});
	const save = routes2.get("/api/model-settings/save");
	const waterfall = listeners2.get("agent/request");
	const body = { main: { provider: "kimi-coding", model: "k3-256k" }, subagent: null, goal: null };

	// save with sessionId: writes config AND installs a session override
	const out1 = await callWithBody2(save, JSON.stringify({ ...body, sessionId: "session-save" }));
	assert.equal(out1.status, 200, "save with sessionId ok");
	assert.equal(out1.body.defaultModel.provider, "kimi-coding", "global default written by save");
	let resolved = await waterfall[0]({ agent }, async () => ({ provider: "deepseek-official", model: "deepseek-v4-flash" }));
	assert.equal(resolved.provider, "kimi-coding", "save-applied override rewrites the session");

	// repeated save replaces the override (Map.set idempotent — no stacking)
	const out2 = await callWithBody2(save, JSON.stringify({ ...body, sessionId: "session-save" }));
	assert.equal(out2.status, 200, "second save ok");
	resolved = await waterfall[0]({ agent }, async () => ({ provider: "deepseek-official", model: "deepseek-v4-flash" }));
	assert.equal(resolved.model, "k3-256k", "override still applied after repeated save");

	// save without sessionId: no session override (future-only path)
	const agentB = fakeAgent("session-b", { options: {} });
	const { ctx: ctx3, routes: routes3, listeners: listeners3 } = createCtx({ settings, agents: createAgents(new Map([["session-b", agentB]])), goals, llm, agentDefaultModel });
	apply(ctx3, {});
	const out3 = await callWithBody2(routes3.get("/api/model-settings/save"), JSON.stringify(body));
	assert.equal(out3.status, 200, "save without sessionId ok");
	resolved = await listeners3.get("agent/request")[0]({ agent: agentB }, async () => ({ provider: "deepseek-official", model: "deepseek-v4-flash" }));
	assert.equal(resolved.model, "deepseek-v4-flash", "no session override when sessionId omitted");
}

// --- 5) /state endpoint exposes catalog ---
{
	const state = routes.get("/api/model-settings/state");
	const out = jsonRes();
	await state({}, out.res);
	assert.equal(out.body.ok, true);
	assert.ok(Array.isArray(out.body.catalog.groups), "catalog groups array");
	const deepseek = out.body.catalog.groups.find((g) => g.id === "deepseek-official");
	assert.ok(deepseek, "deepseek group present");
	assert.equal(deepseek.models.length, 2, "deepseek models listed");
	const v4 = deepseek.models.find((m) => m.id === "deepseek-v4");
	assert.deepEqual(v4.reasoning.efforts.map((e) => e.id), ["low", "high"], "reasoning efforts listed");
	assert.equal(out.body.defaultModel.model, "k3-256k", "default model reflects the earlier save");
}

console.log("all smoke assertions passed ✓");
