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
 * 兼容性：dsh-settings 的 API 在 0.1.x / 0.2.x 之间换过三次，这里按运行时能力探测，
 * 不静态依赖任何一代的具名导出：
 * - 0.0.1–0.1.1：模块导出 `installSettingsSection` + `settingsNamespace`；
 * - 0.1.2–0.1.6：`SettingsProvider.installSection`；
 * - 0.1.7–0.2.x：`SettingsForms`，配置 schema 的 `.volatile()` 字段由 settings 表单编辑。
 *
 * 热更新语义：settings 写入后 source 立即指向新值（旧版 install* 的 setSource 实时
 * 替换；新版从 describe() 读取并做短 TTL 缓存），agent/request 拦截实时读取，因此
 * 运行中的会话下一次拉子代理、下一个 goal 回合即用新模型，无需重启。
 */
import z from "@deepseek-ai/schemastery";
import * as dshSettings from "@deepseek-ai/dsh-settings";
import { ReasoningEffortId } from "@deepseek-ai/dsh-llm";

const name = "model-settings";
const inject = ["agents", "webServer"];

// --- settings API era detection -------------------------------------------
/** 0.1.7+ replaces namespace registration with Config-derived forms. */
const formsHost = typeof dshSettings.SettingsForms === "function";
/**
 * 0.0.1–0.1.1 module-level helper; absent from 0.1.2 onward. Prefer the forms
 * path when a host exposes both, so a newer host's compatibility shim can
 * never pull the plugin back onto the legacy registration model.
 */
const legacyInstall =
	!formsHost && typeof dshSettings.installSettingsSection === "function"
		? dshSettings.installSettingsSection
		: void 0;
/** Brand a namespace when the host still exports the helper; otherwise use the raw string. */
const namespaceOf =
	typeof dshSettings.settingsNamespace === "function" ? dshSettings.settingsNamespace : (value) => value;

/** 覆盖档 schema：provider/model 必填，reasoningEffort 可选。 */
const SLOT_SCHEMA = z.object({
	provider: z.string(),
	model: z.string(),
	reasoningEffort: z.string()
});
/**
 * On 0.1.7+ the settings page only edits volatile Config fields, and `replace()`
 * refuses a field that is not volatile. Marking the whole slot volatile makes
 * `subagent` / `goal` editable as one object; older hosts keep the plain schema
 * because their `installSection` path does not understand volatile forms.
 */
const SLOT = formsHost && typeof SLOT_SCHEMA.volatile === "function" ? SLOT_SCHEMA.volatile() : SLOT_SCHEMA;
/** 插件配置 = settings 命名空间的 base 层（cordis.patch.yml 可写默认值）。 */
const Config = z.object({
	subagent: SLOT.default(void 0),
	goal: SLOT.default(void 0)
});

const NS = namespaceOf("model-settings");
const DEFAULT_MODEL_NS = namespaceOf("agent-default-model");

const STATE_PATH = "/api/model-settings/state";
const SAVE_PATH = "/api/model-settings/save";
const APPLY_PATH = "/api/model-settings/apply-current";
const MAX_BODY_BYTES = 1024 * 64;
const FORM_CACHE_TTL_MS = 1000;

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

/**
 * Normalize a slot value from any host generation. Old settings sections return
 * plain objects, 0.1.7+ configs can hand back volatile refs, and callers may
 * send null/partial bodies; all of them collapse to the same shape.
 * @param value - candidate slot.
 * @returns a detached `{provider, model, reasoningEffort?}` or undefined.
 */
function normalizeSlot(value) {
	let slot = value;
	if (
		slot !== null &&
		typeof slot === "object" &&
		typeof slot.get === "function" &&
		typeof slot.provider !== "string"
	) {
		try {
			slot = slot.get();
		} catch {
			return void 0;
		}
	}
	if (slot === null || typeof slot !== "object") return void 0;
	if (typeof slot.provider !== "string" || typeof slot.model !== "string") return void 0;
	const effort =
		typeof slot.reasoningEffort === "string" && slot.reasoningEffort.length > 0
			? slot.reasoningEffort
			: void 0;
	return {
		provider: slot.provider,
		model: slot.model,
		...(effort === void 0 ? {} : { reasoningEffort: effort })
	};
}

function apply(ctx, config = {}) {
	// --- 1) settings 接入（三代 API 的能力探测） ---
	let source;
	let cachedForm;
	let cachedAt = 0;
	let lastRefreshAt = 0;

	/** Read the plugin's own settings namespace through the forms API. */
	function readForm() {
		const settings = ctx.get("settings");
		if (settings === void 0 || typeof settings.describe !== "function") return void 0;
		try {
			const row = settings
				.describe({ redactSecrets: true })
				.find((candidate) => String(candidate.ns) === String(NS));
			return row?.value;
		} catch {
			return void 0;
		}
	}

	/** Refresh the forms snapshot. Throttled because describe() walks every entry. */
	function refreshForm(force = false) {
		const now = Date.now();
		if (!force && now - lastRefreshAt < FORM_CACHE_TTL_MS) return;
		lastRefreshAt = now;
		const next = readForm();
		if (next === void 0) {
			// The entry can disappear when it is disabled or reloaded; do not keep
			// serving the last snapshot after that.
			cachedForm = void 0;
			cachedAt = 0;
			return;
		}
		cachedForm = next;
		cachedAt = now;
	}

	/** Read one arbitrary namespace (used only as a default-model fallback). */
	function readNamespace(namespace) {
		const settings = ctx.get("settings");
		if (settings === void 0 || typeof settings.describe !== "function") return void 0;
		try {
			return settings
				.describe({ redactSecrets: true })
				.find((candidate) => String(candidate.ns) === String(namespace))?.value;
		} catch {
			return void 0;
		}
	}

	const hooks = {
		setSource: (thunk) => {
			source = thunk;
		},
		onChange: () => {}
	};

	if (legacyInstall !== void 0) {
		// dsh 0.0.1–0.1.1: the helper itself installs the optional settings inject.
		try {
			legacyInstall(ctx, NS, Config, config, hooks);
		} catch (error) {
			ctx.logger.warn?.(`model-settings: legacy settings install failed: ${String(error)}`);
		}
	} else {
		ctx.inject(["settings"], (settingsCtx) => {
			const settings = settingsCtx.settings;
			if (settings === void 0) return;
			if (typeof settings.installSection === "function") {
				// dsh 0.1.2–0.1.6: SettingsProvider owns the section install.
				try {
					settings.installSection(ctx, NS, Config, config, hooks);
				} catch (error) {
					ctx.logger.warn?.(`model-settings: settings.installSection failed: ${String(error)}`);
				}
				return;
			}
			// dsh 0.1.7+: no registration; the volatile Config schema is the form.
			refreshForm(true);
			// Keep the snapshot hot when the settings surface (or another plugin)
			// edits the same entry. SettingsForms emits this on its owner context.
			const eventCtx = settings.ownerContext ?? settings.ctx;
			if (eventCtx !== void 0 && typeof eventCtx.on === "function" && typeof settingsCtx.effect === "function") {
				settingsCtx.effect(() => eventCtx.on("settings/document-updated", (changed) => {
					if (String(changed) === String(NS)) refreshForm(true);
				}), "model-settings: settings change");
			}
		});
	}

	/** 当前生效的覆盖配置：旧版 source 优先，新版读 describe() 快照，最后回落组装配置。 */
	const currentSettings = () => {
		if (source !== void 0) {
			try {
				return source();
			} catch {
				/* settings 服务瞬时不可用时回落缓存/配置 */
			}
		}
		if (cachedForm !== void 0 && Date.now() - cachedAt < FORM_CACHE_TTL_MS) return cachedForm;
		// A missing snapshot means either the entry is not active yet or settings
		// changed before the first read; force one read instead of waiting a TTL.
		refreshForm(cachedForm === void 0);
		if (cachedForm !== void 0) return cachedForm;
		// On forms hosts `config` contains volatile refs, not values; never leak it
		// into the request path. Older hosts keep the plain composition entry.
		return formsHost ? {} : config;
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
		const settings = currentSettings() ?? {};
		// 子代理（含 workflow 拉起的子代理）：spawn/fork 都在 options 上盖了 subagentDepth，
		// 会话 header 也有 origin: 'subagent'。dsh 内核不区分 workflow 子代理与普通子代理。
		const header = agent.session?.header;
		const isSubagent = agent.options?.subagentDepth !== void 0 || header?.origin === "subagent";
		if (isSubagent) return normalizeSlot(settings.subagent);
		// goal 回合：goal-round-driver 在 goal active+armed 时用 source.kind='goal' 消息
		// followup 驱动下一轮。这里以「该 agent 当前 goal 处于 active」近似判定 goal 回合。
		// GoalService.get(agent) 从 0.1.0 起就是公开入口；0.2 的 view(state, runtime) 是内部方法。
		const goals = ctx.get("goals");
		if (goals !== void 0) {
			try {
				const view =
					typeof goals.get === "function"
						? goals.get(agent)
						: typeof goals.view === "function"
							? goals.view(agent)
							: void 0;
				if (view !== void 0 && view.phase === "active") return normalizeSlot(settings.goal);
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
		if (slot === void 0) return resolved;
		// 未设置 reasoningEffort 表示用模型默认值，因此要清掉内层继承的 effort，
		// 不能只是不覆盖它。
		const { reasoningEffort: _inheritedEffort, ...rest } = resolved;
		return {
			...rest,
			provider: slot.provider,
			model: slot.model,
			...slot.reasoningEffort === void 0 ? {} : { reasoningEffort: ReasoningEffortId(slot.reasoningEffort) }
		};
	});

	// --- 3) loopback-only HTTP 端点 ---
	/** 与 apiproxy buildModelCatalog 相同的数据源：provider 分组 + 模型 + reasoning 选项。 */
	async function buildCatalog(llm) {
		if (llm === void 0) return { groups: [], failures: [{ id: "", name: "llm", message: "llm service unavailable" }] };
		const catalog = await Promise.all(llm.listProviders().map(async (provider) => {
			try {
				const models = await llm.listModels(provider.id);
				const entries = await Promise.all(models.map(async (model) => {
					const resolved = await llm.resolveModelInfo(provider.id, model.id);
					const reasoning = resolved?.reasoning === void 0 ? void 0 : {
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
		refreshForm(true);
		let defaultSelection;
		const agentDefaultModel = ctx.get("agentDefaultModel");
		if (agentDefaultModel !== void 0 && typeof agentDefaultModel.currentSelection === "function") {
			try {
				defaultSelection = agentDefaultModel.currentSelection();
			} catch {
				/* 读不到时尝试 settings 命名空间 */
			}
		}
		if (defaultSelection === void 0) defaultSelection = readNamespace(DEFAULT_MODEL_NS);
		const overrides = currentSettings() ?? {};
		return {
			defaultModel: normalizeSlot(defaultSelection) ?? null,
			subagent: normalizeSlot(overrides.subagent) ?? null,
			goal: normalizeSlot(overrides.goal) ?? null,
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
		const effort =
			reasoningEffort === void 0 || reasoningEffort === null || reasoningEffort === ""
				? void 0
				: String(reasoningEffort);
		sessionOverrides.set(String(agent.id), {
			provider,
			model,
			...(effort === void 0 ? {} : { reasoningEffort: effort })
		});
		// 同步写入 request/header 日志：让 dsh 的 selectionFor 从日志恢复到新模型，
		// composer 的模型选择器立即跟着变；且该选择随会话日志持久化（重启 dsh 后仍生效）。
		// 0.1.7+ 的 canonicalHeader 会保留 tools / adapterDefaults，这里沿用旧 header，
		// 只替换 config，避免把工具声明从日志里抹掉。
		try {
			const current = typeof agent.session.requestHeader === "function" ? agent.session.requestHeader() : void 0;
			const headerConfig = { ...(current?.config ?? {}), provider, model };
			if (effort === void 0) delete headerConfig.reasoningEffort;
			else headerConfig.reasoningEffort = effort;
			const header = { config: headerConfig };
			if (current?.adapterDefaults !== void 0) header.adapterDefaults = current.adapterDefaults;
			if (Array.isArray(current?.tools) && current.tools.length > 0) header.tools = current.tools;
			agent.session.append("request/header", { header, reason: "change" });
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
			// 主模型（新会话默认）：优先走 agentDefaultModel.saveSelection()。这个入口
			// 在 0.1.0–0.2.x 都存在，旧版内部转 settings.replace，新版转 configEditor。
			if (body.main !== void 0 && body.main !== null) {
				const main = normalizeSlot(body.main);
				if (main === void 0) {
					return json(res, 400, { ok: false, message: "main.provider and main.model are required" });
				}
				const agentDefaultModel = ctx.get("agentDefaultModel");
				if (agentDefaultModel !== void 0 && typeof agentDefaultModel.saveSelection === "function") {
					await agentDefaultModel.saveSelection(main);
				} else {
					await settings.replace(DEFAULT_MODEL_NS, main);
				}
				// 保存并生效：若同时传了当前会话 id，则把主模型档也立即应用到该对话
				// （未来会话由 agent-default-model 生效；当前对话由请求覆盖生效）。
				if (typeof body.sessionId === "string") {
					const agent = ctx.agents.get(body.sessionId);
					if (agent !== void 0) {
						installCurrentOverride(agent, main.provider, main.model, main.reasoningEffort);
					}
				}
			}
			// 覆盖档：null / 缺省 = 跟随默认（从命名空间移除）；replace({}) 会 re-inherit base。
			// 只要请求里出现任一档，就做整段 replace，未出现的档一并回落默认。
			if (body.subagent !== void 0 || body.goal !== void 0) {
				const section = {};
				if (body.subagent !== void 0 && body.subagent !== null) {
					const subagent = normalizeSlot(body.subagent);
					if (subagent === void 0) {
						return json(res, 400, { ok: false, message: "subagent.provider and subagent.model are required" });
					}
					section.subagent = subagent;
				}
				if (body.goal !== void 0 && body.goal !== null) {
					const goal = normalizeSlot(body.goal);
					if (goal === void 0) {
						return json(res, 400, { ok: false, message: "goal.provider and goal.model are required" });
					}
					section.goal = goal;
				}
				await settings.replace(NS, section);
				refreshForm(true);
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
		const slot = normalizeSlot(body);
		if (typeof body.sessionId !== "string" || slot === void 0) {
			return json(res, 400, { ok: false, message: "sessionId, provider and model are required" });
		}
		const agent = ctx.agents.get(body.sessionId);
		if (agent === void 0) return json(res, 404, { ok: false, message: `session "${body.sessionId}" is not live` });
		installCurrentOverride(agent, slot.provider, slot.model, slot.reasoningEffort);
		return json(res, 200, { ok: true, sessionId: body.sessionId });
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
