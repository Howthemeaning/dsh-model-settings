/**
 * dsh-model-settings — server half.
 *
 * 模型设置面板的宿主侧：
 * 1. `model-settings` settings 命名空间（subagent / goal 两档模型覆盖，热更新）。
 * 2. 全局 `agent/request` 瀑布拦截：子代理（含 workflow 拉起的子代理）请求按
 *    `model-settings.subagent` 覆盖；goal 激活期间的会话回合按 `model-settings.goal`
 *    覆盖。主会话普通回合不受影响（新会话默认模型由 agent-default-model 负责）。
 * 3. 三个 loopback-only 端点：
 *      GET  /api/model-settings/state         — 当前默认模型 + 覆盖档 + 模型目录
 *      POST /api/model-settings/save          — 写 agent-default-model / model-settings
 *      POST /api/model-settings/apply-current — 切当前会话的请求路由（root 拦截器）
 *      并写一条 request/header 日志同步 composer 的模型选择器
 *
 * 热更新语义：settings 写入后 source 立即指向新值（installSection 的
 * setSource 实时替换），agent/request 拦截实时读取，因此运行中的会话下一次拉
 * 子代理、下一个 goal 回合即用新模型，无需重启。
 */
import z from "@deepseek-ai/schemastery";
import { ReasoningEffortId } from "@deepseek-ai/dsh-llm";

const name = "model-settings";
const inject = ["agents", "webServer"];

/** 覆盖档 schema：provider/model 必填，reasoningEffort 可选。 */
const SLOT = z.object({
	provider: z.string(),
	model: z.string(),
	reasoningEffort: z.string()
});
/** 插件配置 = settings 命名空间的 base 层（cordis.patch.yml 可写默认值）。 */
const Config = z.object({
	subagent: SLOT.default(void 0),
	goal: SLOT.default(void 0)
});

const NS = "model-settings";
const DEFAULT_MODEL_NS = "agent-default-model";

const STATE_PATH = "/api/model-settings/state";
const SAVE_PATH = "/api/model-settings/save";
const APPLY_PATH = "/api/model-settings/apply-current";
const MAX_BODY_BYTES = 1024 * 64;

/** Collect and parse a small JSON request body. */
function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.setEncoding("utf8");
		req.on("data", (chunk) => {
			data += chunk;
			if (data.length > MAX_BODY_BYTES) {
				reject(new Error("request body too large"));
				req.destroy();
			}
		});
		req.on("end", () => {
			try {
				resolve(data.length === 0 ? {} : JSON.parse(data));
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
		req.on("error", reject);
	});
}

/** Write one JSON response. */
function json(res, status, payload) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(payload));
}

function apply(ctx, config = {}) {
	// --- 1) settings 命名空间（热更新 source） ---
	let source;
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.installSection(ctx, NS, Config, config, {
			setSource: (thunk) => {
				source = thunk;
			},
			onChange: () => {}
		});
	});
	/** 当前生效的覆盖配置：settings 用户层优先，否则 composition entry。 */
	const currentSettings = () => {
		if (source !== void 0) {
			try {
				return source();
			} catch {
				/* settings 服务瞬时不可用时回落配置 */
			}
		}
		return config;
	};

	// --- 2) 全局 agent/request 拦截（热更新核心） ---
	/**
	* 会话级覆盖表（「仅应用到当前对话」/「保存并生效并切当前对话」写入）。
	* 必须放在 root 拦截器（外层）而不是 agent.ctx（内层）：会话自己的模型选择
	* installModelSelection 装在 agent.ctx，waterfall 是先注册的外层赢——装在
	* agent.ctx 的覆盖会被它盖掉（实测 d27b9b83 仍走会话的 kimi）。root 拦截器
	* 在所有内层之后执行，所以这张表能真正生效。
	*/
	const sessionOverrides = /* @__PURE__ */ new Map(); // sessionId -> { provider, model, reasoningEffort? }

	/** 判定某 agent 请求应使用的覆盖档。 */
	function overrideSlotFor(agent) {
		// 会话级覆盖优先（仅应用到当前对话）
		const sessionOverride = sessionOverrides.get(String(agent.id));
		if (sessionOverride !== void 0) return sessionOverride;
		const settings = currentSettings();
		// 子代理（含 workflow 拉起的子代理）：spawn/fork 都在 options 上盖了 subagentDepth，
		// 会话 header 也有 origin: 'subagent'。dsh 内核不区分 workflow 子代理与普通子代理。
		const header = agent.session?.header;
		const isSubagent = agent.options?.subagentDepth !== void 0 || header?.origin === "subagent";
		if (isSubagent) return settings.subagent;
		// goal 回合：goal-round-driver 在 goal active+armed 时用 source.kind='goal' 消息
		// followup 驱动下一轮。这里以「该 agent 当前 goal 处于 active」近似判定 goal 回合。
		const goals = ctx.get("goals");
		if (goals !== void 0) {
			try {
				const view = goals.view(agent);
				if (view !== void 0 && view.phase === "active") return settings.goal;
			} catch {
				/* 非 live agent（如已发布但不可 view 的对象），忽略 */
			}
		}
		return void 0;
	}

	ctx.on("agent/request", async (payload, next) => {
		const resolved = await next();
		const agent = payload.agent;
		if (agent === void 0) return resolved;
		const slot = overrideSlotFor(agent);
		if (slot === void 0 || slot.provider === void 0 || slot.model === void 0) return resolved;
		return {
			...resolved,
			provider: slot.provider,
			model: slot.model,
			...slot.reasoningEffort === void 0 ? {} : { reasoningEffort: ReasoningEffortId(slot.reasoningEffort) }
		};
	});

	// --- 3) loopback-only HTTP 端点 ---
	/** 读一个命名空间的合并 value（settings 服务缺席时返回 undefined）。 */
	function readNamespace(ns) {
		const settings = ctx.get("settings");
		if (settings === void 0) return void 0;
		const descriptor = settings.describe({ redactSecrets: true }).find((candidate) => String(candidate.ns) === String(ns));
		return descriptor?.value;
	}

	/** 与 apiproxy buildModelCatalog 相同的数据源：provider 分组 + 模型 + reasoning 选项。 */
	async function buildCatalog(llm) {
		if (llm === void 0) return { groups: [], failures: [{ id: "", name: "llm", message: "llm service unavailable" }] };
		const catalog = await Promise.all(llm.listProviders().map(async (provider) => {
			try {
				const models = await llm.listModels(provider.id);
				const entries = await Promise.all(models.map(async (model) => {
					const resolved = await llm.resolveModelInfo(provider.id, model.id);
					const reasoning = resolved.reasoning === void 0 ? void 0 : {
						efforts: resolved.reasoning.efforts.map((effort) => ({
							id: effort.id,
							name: effort.name,
							...effort.description === void 0 ? {} : { description: effort.description }
						})),
						...resolved.reasoning.defaultEffort === void 0 ? {} : { defaultEffort: resolved.reasoning.defaultEffort }
					};
					return {
						id: model.id,
						name: model.name,
						...model.description === void 0 ? {} : { description: model.description },
						...reasoning === void 0 ? {} : { reasoning }
					};
				}));
				return { kind: "group", group: { id: provider.id, name: provider.name, models: entries } };
			} catch (error) {
				return {
					kind: "failure",
					failure: {
						id: provider.id,
						name: provider.name,
						message: error instanceof Error ? error.message : String(error)
					}
				};
			}
		}));
		return {
			groups: catalog.flatMap((item) => item.kind === "group" ? [item.group] : []).filter((group) => group.models.length > 0),
			failures: catalog.flatMap((item) => item.kind === "failure" ? [item.failure] : [])
		};
	}

	async function statePayload() {
		const defaultSelection = ctx.get("agentDefaultModel")?.currentSelection() ?? void 0;
		const overrides = readNamespace(NS) ?? {};
		return {
			defaultModel: defaultSelection === void 0 ? null : defaultSelection,
			subagent: overrides.subagent ?? null,
			goal: overrides.goal ?? null,
			catalog: await buildCatalog(ctx.get("llm"))
		};
	}

	async function handleState(req, res) {
		try {
			return json(res, 200, { ok: true, ...await statePayload() });
		} catch (error) {
			return json(res, 500, { ok: false, message: error instanceof Error ? error.message : String(error) });
		}
	}

	/**
	* 给一个会话装模型覆盖（仅应用到当前对话）。直接写进程内的会话覆盖表——
	* 不要给 agent.ctx 装监听器：会话自己的选择（installModelSelection）装在
	* agent.ctx，waterfall 里先注册的外层赢，装在内层的覆盖会被盖掉。这张表由
	* root 拦截器（最外层）读取，才能真正生效。Map.set 天然幂等（覆盖旧值）。
	* @param agent - 目标会话 agent。
	* @param provider - 覆盖 provider。
	* @param model - 覆盖 model。
	* @param reasoningEffort - 可选覆盖推理强度。
	* @returns true 表示成功安装，false 表示目标不是 live agent。
	*/
	function installCurrentOverride(agent, provider, model, reasoningEffort) {
		if (agent === void 0) return false;
		sessionOverrides.set(String(agent.id), {
			provider,
			model,
			...reasoningEffort === void 0 ? {} : { reasoningEffort: String(reasoningEffort) }
		});
		// 同步写入 request/header 日志：让 dsh 的 selectionFor 从日志恢复到新模型，
		// composer 的模型选择器立即跟着变；且该选择随会话日志持久化（重启 dsh 后仍生效）。
		try {
			agent.session.append("request/header", {
				header: { config: { provider, model, ...reasoningEffort === void 0 ? {} : { reasoningEffort: String(reasoningEffort) } } },
				reason: "change"
			});
		} catch (error) {
			ctx.logger.warn?.(`model-settings: request/header append failed for "${String(agent.id)}": ${String(error)}`);
		}
		return true;
	}

	async function handleSave(req, res) {
		const settings = ctx.get("settings");
		if (settings === void 0) return json(res, 400, { ok: false, message: "settings service unavailable" });
		let body;
		try {
			body = await readBody(req);
		} catch (error) {
			return json(res, 400, { ok: false, message: error instanceof Error ? error.message : String(error) });
		}
		try {
			// 主模型（新会话默认）：全量替换 agent-default-model（provider/model 必填）
			if (body.main !== void 0 && body.main !== null) {
				await settings.replace(DEFAULT_MODEL_NS, {
					provider: body.main.provider,
					model: body.main.model,
					...body.main.reasoningEffort === void 0 ? {} : { reasoningEffort: String(body.main.reasoningEffort) }
				});
				// 保存并生效：若同时传了当前会话 id，则把主模型档也立即应用到该对话
				// （未来会话由 agent-default-model 生效；当前对话由请求覆盖生效）。
				if (typeof body.sessionId === "string" && body.main.provider !== void 0 && body.main.model !== void 0) {
					const agent = ctx.agents.get(body.sessionId);
					if (agent !== void 0) {
						installCurrentOverride(agent, body.main.provider, body.main.model, body.main.reasoningEffort);
					}
				}
			}
			// 覆盖档：null / 缺省 = 跟随默认（从命名空间移除）；replace({}) 会 re-inherit base
			const overrides = {};
			if (body.subagent !== void 0 && body.subagent !== null) overrides.subagent = body.subagent;
			if (body.goal !== void 0 && body.goal !== null) overrides.goal = body.goal;
			if (body.subagent !== void 0 || body.goal !== void 0) {
				await settings.replace(NS, overrides);
			}
			return json(res, 200, { ok: true, ...await statePayload() });
		} catch (error) {
			return json(res, 400, { ok: false, message: error instanceof Error ? error.message : String(error) });
		}
	}

	async function handleApplyCurrent(req, res) {
		let body;
		try {
			body = await readBody(req);
		} catch (error) {
			return json(res, 400, { ok: false, message: error instanceof Error ? error.message : String(error) });
		}
		const { sessionId, provider, model, reasoningEffort } = body;
		if (typeof sessionId !== "string" || typeof provider !== "string" || typeof model !== "string") {
			return json(res, 400, { ok: false, message: "sessionId, provider and model are required" });
		}
		const agent = ctx.agents.get(sessionId);
		if (agent === void 0) return json(res, 404, { ok: false, message: `session "${sessionId}" is not live` });
		installCurrentOverride(agent, provider, model, reasoningEffort);
		return json(res, 200, { ok: true, sessionId });
	}

	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: STATE_PATH,
		handler: handleState
	}), "model-settings: state route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: SAVE_PATH,
		handler: handleSave
	}), "model-settings: save route");
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: APPLY_PATH,
		handler: handleApplyCurrent
	}), "model-settings: apply-current route");
}

export { Config, apply, inject, name };
