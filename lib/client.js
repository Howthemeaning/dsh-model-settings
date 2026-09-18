/**
 * dsh-model-settings — browser half.
 *
 * Hand-written `__ModuleLoader__` bundle (no build step): a sidebar footer
 * action 「模型设置」that opens a polished floating panel for configuring the
 * main model, subagent model, and goal-round model. Data flows through the
 * server half's loopback endpoints; saving hot-reloads request routing.
 */
window.__ModuleLoader__.load({
	id: "dsh-model-settings",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region css
		const css = [
			"@keyframes mst_panelIn{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}",
			"@keyframes mst_spin{to{transform:rotate(360deg)}}",
			"@keyframes mst_shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}",
			".mst_layer{flex:none;align-items:center;width:100%;height:49px;margin:8px 0 0;display:flex;position:relative}",
			".mst_layer + .usg_layer{margin-top:4px}",
			".mst_badge{width:100%;height:49px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:12px;align-items:center;gap:8px;padding:0 8px 0 6px;font-family:inherit;font-size:14px;display:inline-flex;overflow:hidden;transition:background .15s ease,color .15s ease}",
			".mst_badge:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}",
			".mst_badge[data-active]{background:var(--dsw-alias-interactive-bg-hover)}",
			".mst_brainIcon{color:currentColor;flex:none;display:inline-flex}",
			".mst_badgeLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}",
			".mst_layer.mst_rail{width:36px;height:36px;margin:0}",
			".mst_layer.mst_rail .mst_badge{border-radius:50%;justify-content:center;gap:0;width:36px;height:36px;padding:0}",
			".mst_panel{--mst-bottom:128px;--mst-blue:#4f7cff;--mst-violet:#8b5cf6;--mst-amber:#f59e0b;--mst-green:#10b981;--mst-shadow:color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent);z-index:60;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:linear-gradient(180deg,var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base)) 0%,var(--dsw-alias-bg-base) 100%);color:var(--dsw-alias-label-primary);width:480px;max-width:calc(100vw - 24px);max-height:min(760px,calc(100vh - var(--mst-bottom) - 16px));box-shadow:0 24px 70px var(--mst-shadow),0 6px 22px color-mix(in srgb,var(--dsw-alias-label-primary) 9%,transparent);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:20px;flex-direction:column;display:flex;position:fixed;bottom:var(--mst-bottom);left:12px;overflow:hidden;animation:mst_panelIn .18s cubic-bezier(.2,.8,.2,1)}",
			".mst_header{box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base)) 88%,transparent);backdrop-filter:blur(18px);flex:none;justify-content:space-between;align-items:center;min-height:66px;padding:14px 16px;display:flex}",
			".mst_headerLeft{min-width:0;align-items:center;gap:11px;display:flex}",
			".mst_appIcon{color:#fff;background:linear-gradient(135deg,#356bff,#7c5cff);box-shadow:0 8px 20px color-mix(in srgb,var(--mst-blue) 28%,transparent);width:36px;height:36px;border-radius:12px;justify-content:center;align-items:center;display:inline-flex;flex:none}",
			".mst_titleWrap{min-width:0;display:flex;flex-direction:column;gap:1px}",
			".mst_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:650;line-height:20px;letter-spacing:-.01em}",
			".mst_subtitle{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;white-space:nowrap}",
			".mst_headerActions{align-items:center;gap:2px;display:flex;flex:none}",
			".mst_iconButton{cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;border-radius:8px;justify-content:center;align-items:center;padding:0;display:inline-flex;transition:background .15s ease,color .15s ease,opacity .15s ease}",
			".mst_iconButton:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}",
			".mst_iconButton:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--mst-blue) 18%,transparent)}",
			".mst_iconButton:disabled{opacity:.45;cursor:default}",
			".mst_body{flex:1;min-height:0;padding:0 16px 16px;overflow-y:auto;overscroll-behavior:contain}",
			".mst_body::-webkit-scrollbar{width:8px}",
			".mst_body::-webkit-scrollbar-track{background:transparent}",
			".mst_body::-webkit-scrollbar-thumb{background:var(--dsh-scrollbar-thumb);border-radius:999px}",
			".mst_body::-webkit-scrollbar-thumb:hover{background:var(--dsh-scrollbar-thumb-hover)}",
			".mst_hero{box-sizing:border-box;border:1px solid color-mix(in srgb,var(--mst-blue) 22%,var(--dsw-alias-border-l2));background:radial-gradient(circle at 12% 0%,color-mix(in srgb,var(--mst-blue) 18%,transparent),transparent 42%),linear-gradient(135deg,color-mix(in srgb,var(--mst-blue) 10%,transparent),transparent 58%),var(--dsw-alias-fill-l1,transparent);border-radius:18px;align-items:center;gap:12px;margin:14px 0 4px;padding:14px;display:flex}",
			".mst_heroIcon{color:var(--mst-blue);background:color-mix(in srgb,var(--mst-blue) 12%,transparent);border:1px solid color-mix(in srgb,var(--mst-blue) 18%,transparent);width:38px;height:38px;border-radius:13px;justify-content:center;align-items:center;display:inline-flex;flex:none}",
			".mst_heroCopy{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}",
			".mst_heroLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:600;line-height:15px}",
			".mst_heroModel{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:700;line-height:20px;overflow:hidden}",
			".mst_heroMeta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}",
			".mst_sectionHead{align-items:end;justify-content:space-between;margin:16px 0 8px;display:flex}",
			".mst_sectionTitle{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:700;line-height:18px}",
			".mst_sectionMeta{color:var(--dsw-alias-label-caption);font-size:10px;line-height:16px;font-variant-numeric:tabular-nums}",
			".mst_slot{--slot-accent:var(--mst-blue);box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base));border-radius:17px;margin-top:10px;overflow:hidden;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}",
			".mst_slot[data-slot=main]{--slot-accent:var(--mst-blue)}",
			".mst_slot[data-slot=subagent]{--slot-accent:var(--mst-violet)}",
			".mst_slot[data-slot=goal]{--slot-accent:var(--mst-amber)}",
			".mst_slot[data-enabled=true]{border-color:color-mix(in srgb,var(--slot-accent) 30%,var(--dsw-alias-border-l2));box-shadow:0 10px 28px color-mix(in srgb,var(--slot-accent) 8%,transparent)}",
			".mst_slotHead{align-items:center;gap:11px;padding:13px 14px;display:flex}",
			".mst_slotMark{color:var(--slot-accent);background:linear-gradient(135deg,color-mix(in srgb,var(--slot-accent) 15%,transparent),color-mix(in srgb,var(--slot-accent) 6%,transparent));border:1px solid color-mix(in srgb,var(--slot-accent) 20%,transparent);width:34px;height:34px;border-radius:12px;justify-content:center;align-items:center;display:inline-flex;flex:none}",
			".mst_slotCopy{min-width:0;flex:1;display:flex;flex-direction:column;gap:1px}",
			".mst_slotTitleRow{align-items:center;gap:7px;display:flex}",
			".mst_slotTitle{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:700;line-height:18px}",
			".mst_slotState{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-fill-l2);border-radius:999px;padding:2px 7px;font-size:10px;font-weight:650;line-height:14px;white-space:nowrap}",
			".mst_slot[data-enabled=true] .mst_slotState{color:var(--slot-accent);background:color-mix(in srgb,var(--slot-accent) 11%,transparent)}",
			".mst_slotState:empty{display:none}",
			".mst_slotDesc{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:16px;overflow:hidden}",
			".mst_switch{position:relative;flex:none;width:46px;height:26px;display:inline-block}",
			".mst_switch input{position:absolute;opacity:0;width:1px;height:1px}",
			".mst_switchTrack{box-sizing:border-box;cursor:pointer;position:absolute;inset:0;background:var(--dsw-alias-fill-l2);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;transition:background .18s ease,border-color .18s ease,box-shadow .18s ease}",
			".mst_switchTrack:hover{border-color:var(--dsw-alias-border-l1)}",
			".mst_switchTrack:before{content:\"\";box-sizing:border-box;position:absolute;top:2px;left:2px;width:20px;height:20px;background:#fff;border:1px solid var(--dsw-alias-border-l1);border-radius:50%;box-shadow:0 1px 4px color-mix(in srgb,var(--dsw-alias-label-primary) 16%,transparent);transition:transform .18s cubic-bezier(.2,.8,.2,1),background .18s ease,border-color .18s ease}",
			".mst_switch input:checked + .mst_switchTrack{background:var(--slot-accent);border-color:var(--slot-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--slot-accent) 15%,transparent)}",
			".mst_switch input:checked + .mst_switchTrack:hover{border-color:var(--slot-accent)}",
			".mst_switch input:checked + .mst_switchTrack:before{transform:translateX(20px);background:#fff;border-color:#fff}",
			".mst_switch input:focus-visible + .mst_switchTrack{box-shadow:0 0 0 3px color-mix(in srgb,var(--slot-accent) 24%,transparent)}",
			".mst_slotBody{border-top:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-fill-l1,transparent) 70%,transparent);padding:13px 14px 14px;display:flex;flex-direction:column;gap:11px}",
			".mst_inheritRow{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-fill-l1,transparent);border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;align-items:center;gap:8px;padding:10px 11px;font-size:12px;line-height:18px;display:flex}",
			".mst_inheritRow svg{color:var(--slot-accent);flex:none}",
			".mst_fieldGrid{grid-template-columns:minmax(0,1fr) minmax(112px,.55fr);gap:10px;display:grid}",
			".mst_field{min-width:0;display:flex;flex-direction:column;gap:5px}",
			".mst_fieldLabel{color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:650;line-height:14px;letter-spacing:.02em}",
			".mst_selectWrap{position:relative;display:block}",
			".mst_selectWrap:after{content:\"\";pointer-events:none;position:absolute;top:50%;right:11px;width:7px;height:7px;border-right:1.5px solid var(--dsw-alias-label-tertiary);border-bottom:1.5px solid var(--dsw-alias-label-tertiary);transform:translateY(-65%) rotate(45deg)}",
			".mst_select{box-sizing:border-box;appearance:none;width:100%;height:36px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base));border:1px solid var(--dsw-alias-border-l2);border-radius:11px;outline:none;padding:0 30px 0 10px;font:inherit;font-size:12px;font-weight:550;line-height:18px;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}",
			".mst_select:hover:not(:disabled){border-color:var(--dsw-alias-border-l1)}",
			".mst_select:focus{border-color:var(--slot-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--slot-accent) 15%,transparent)}",
			".mst_select:disabled{color:var(--dsw-alias-label-caption);background:var(--dsw-alias-fill-l1,transparent);cursor:not-allowed}",
			".mst_notice{border-radius:12px;align-items:flex-start;gap:8px;margin:10px 0 0;padding:9px 10px;font-size:12px;line-height:17px;display:flex}",
			".mst_notice svg{flex:none;margin-top:1px}",
			".mst_error{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger);border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,transparent)}",
			".mst_success{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 9%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-state-success-primary) 18%,transparent)}",
			".mst_hotNote{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-fill-l1,transparent);border:1px solid var(--dsw-alias-border-l2);border-radius:13px;gap:8px;margin-top:12px;padding:10px 11px;font-size:11px;line-height:16px;display:flex;flex-direction:column;align-items:flex-start}",
			".mst_hotNote svg{color:var(--mst-blue);flex:none;margin-top:1px}",
			".mst_footer{box-sizing:border-box;border-top:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base)) 92%,transparent);backdrop-filter:blur(18px);flex:none;align-items:center;gap:9px;padding:12px 16px;display:flex;justify-content:flex-end}",
			".mst_footerHint{min-width:0;flex:1;color:var(--dsw-alias-label-tertiary);align-items:center;gap:7px;font-size:11px;line-height:16px;display:flex}",
			".mst_statusDot{width:6px;height:6px;background:var(--dsw-alias-label-caption);border-radius:50%;flex:none}",
			".mst_statusDot[data-dirty]{background:var(--mst-amber);box-shadow:0 0 0 3px color-mix(in srgb,var(--mst-amber) 13%,transparent)}",
			".mst_statusDot[data-saved]{background:var(--mst-green);box-shadow:0 0 0 3px color-mix(in srgb,var(--mst-green) 13%,transparent)}",
			".mst_button{cursor:pointer;height:34px;border-radius:10px;align-items:center;justify-content:center;gap:6px;padding:0 13px;font-family:inherit;font-size:12px;font-weight:700;line-height:18px;display:inline-flex;transition:transform .15s ease,opacity .15s ease,background .15s ease,border-color .15s ease}",
			".mst_button:hover:not(:disabled){transform:translateY(-1px)}",
			".mst_button:disabled{opacity:.48;cursor:default}",
			".mst_primary{color:var(--dsw-alias-bg-base);background:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-label-primary)}",
			".mst_secondary{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base));border:1px solid var(--dsw-alias-border-l2)}",
			".mst_secondary:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1)}",
			".mst_loading{min-height:260px;justify-content:center;align-items:center;gap:10px;color:var(--dsw-alias-label-tertiary);font-size:12px;display:flex;flex-direction:column}",
			".mst_loadingIcon{animation:mst_spin 1s linear infinite;color:var(--mst-blue)}",
			".mst_skeletonGrid{display:flex;flex-direction:column;gap:10px;padding:14px 0}",
			".mst_skeleton{position:relative;height:88px;background:var(--dsw-alias-fill-l1,transparent);border:1px solid var(--dsw-alias-border-l2);border-radius:16px;overflow:hidden}",
			".mst_skeleton:after{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-base)) 72%,transparent),transparent);animation:mst_shimmer 1.4s infinite}",
			".mst_empty{color:var(--dsw-alias-label-tertiary);text-align:center;padding:44px 18px;font-size:12px;line-height:18px}",
			"@media (max-width:520px){.mst_panel{--mst-bottom:112px;left:8px;width:calc(100vw - 16px);border-radius:18px}.mst_fieldGrid{grid-template-columns:1fr}.mst_footer{flex-wrap:wrap}.mst_footerHint{flex-basis:100%}.mst_button{flex:1}}"
		].join("\n");
		const tagId = "dsh-model-settings/ModelSettings.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-model-settings";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region locales
		const NS = "model-settings";
		const zh = {
			"action.label": "模型设置",
			"panel.title": "模型设置",
			"panel.subtitle": "统一配置模型路由与推理强度",
			"panel.routes": "模型路由",
			"panel.providerCount": "{count} 个提供方",
			"panel.live": "实时生效",
			"action.refresh": "刷新",
			"action.close": "关闭",
			"action.save": "应用到全局",
			"action.applyCurrent": "仅应用到当前对话",
			"state.loading": "正在读取模型目录…",
			"state.empty": "没有可配置的模型提供方",
			"state.saved": "已保存，新的路由立即生效",
			"state.applied": "已应用到当前会话，请刷新页面",
			"state.saving": "正在保存…",
			"state.dirty": "有未保存的更改",
			"state.error": "出错了：{message}",
			"state.noSession": "没有打开的会话",
			"state.unset": "尚未设置",
			"current.main": "当前主路由",
			"current.defaultEffort": "默认推理强度",
			"current.follow": "跟随默认",
			"current.custom": "自定义",
			"current.defaultRoute": "默认路由",
			"main.title": "主模型",
			"main.desc": "新会话与主会话的默认路由",
			"subagent.title": "子代理",
			"subagent.desc": "普通子代理与 workflow 子代理统一生效",
			"goal.title": "Goal 回合",
			"goal.desc": "Goal 激活期间的会话回合",
			"field.provider": "提供方",
			"field.model": "模型",
			"field.effort": "推理强度",
			"effort.default": "默认",
			"select.provider": "选择提供方",
			"select.model": "选择模型",
			"hot.title": "应用到全局：写入全局配置并切换当前对话",
			"hot.desc": "仅应用到当前对话：只切当前，不写配置，刷新生效"
		};
		const en = {
			"action.label": "Model Settings",
			"panel.title": "Model Settings",
			"panel.subtitle": "Model routing and reasoning effort",
			"panel.routes": "Model routes",
			"panel.providerCount": "{count} providers",
			"panel.live": "Live",
			"action.refresh": "Refresh",
			"action.close": "Close",
			"action.save": "Apply globally",
			"action.applyCurrent": "Apply to this conversation only",
			"state.loading": "Loading model catalog…",
			"state.empty": "No configurable model providers",
			"state.saved": "Saved — the new route is live",
			"state.applied": "Applied to this conversation — refresh the page",
			"state.saving": "Saving…",
			"state.dirty": "Unsaved changes",
			"state.error": "Something went wrong: {message}",
			"state.noSession": "No session open",
			"state.unset": "Not configured",
			"current.main": "Current main route",
			"current.defaultEffort": "Default reasoning effort",
			"current.follow": "Follow default",
			"current.custom": "Custom",
			"current.defaultRoute": "Default route",
			"main.title": "Main model",
			"main.desc": "Default route for new and primary sessions",
			"subagent.title": "Subagents",
			"subagent.desc": "Applies to plain and workflow subagents",
			"goal.title": "Goal rounds",
			"goal.desc": "Rounds while a goal is active",
			"field.provider": "Provider",
			"field.model": "Model",
			"field.effort": "Effort",
			"effort.default": "Default",
			"select.provider": "Select provider",
			"select.model": "Select model",
			"hot.title": "Apply globally: writes config + switches this conversation",
			"hot.desc": "Apply to this conversation only: no config write, refresh to see it",
		};
		//#endregion

		//#region helpers
		/** Interpolate `{key}` placeholders. */
		function interpolate(template, params) {
			return String(template).replace(/\{([a-zA-Z0-9_.]+)\}/g, (match, key) => params && key in params ? String(params[key]) : match);
		}

		async function fetchJson(path, options) {
			const response = await fetch(path, {
				headers: { accept: "application/json", ...(options?.body !== void 0 ? { "content-type": "application/json" } : {}) },
				method: options?.method ?? "GET",
				...(options?.body !== void 0 ? { body: JSON.stringify(options.body) } : {})
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.message ?? `HTTP ${response.status}`);
			return payload;
		}

		const STATE_PATH = "/api/model-settings/state";
		const SAVE_PATH = "/api/model-settings/save";
		const APPLY_PATH = "/api/model-settings/apply-current";

		/** 读一个会话当前使用的模型（session.models RPC 的 current）。 */
		async function fetchSessionModels(sessionId) {
			const payload = await fetchJson("/api/session.models", {
				method: "POST",
				body: { type: "client-request", rpcId: `ms-${Date.now()}`, method: "session.models", payload: { sessionId } }
			});
			return payload?.result?.ok === true ? payload.result.value?.current ?? null : null;
		}

		function cleanSelection(selection) {
			if (selection === null || selection === void 0) return null;
			if (typeof selection.provider !== "string" || typeof selection.model !== "string") return null;
			return {
				provider: selection.provider,
				model: selection.model,
				...(selection.reasoningEffort !== void 0 && selection.reasoningEffort !== "" ? { reasoningEffort: String(selection.reasoningEffort) } : {})
			};
		}

		function payloadFromDraft(draft) {
			return {
				main: cleanSelection(draft.main),
				subagent: draft.subagent.enabled ? cleanSelection(draft.subagent) : null,
				goal: draft.goal.enabled ? cleanSelection(draft.goal) : null
			};
		}

		function payloadFromState(payload) {
			return {
				main: cleanSelection(payload.defaultModel),
				subagent: cleanSelection(payload.subagent),
				goal: cleanSelection(payload.goal)
			};
		}

		function draftFromState(payload) {
			return {
				main: {
					provider: payload.defaultModel?.provider ?? "",
					model: payload.defaultModel?.model ?? "",
					reasoningEffort: payload.defaultModel?.reasoningEffort ?? ""
				},
				subagent: {
					enabled: payload.subagent !== null && payload.subagent !== void 0,
					provider: payload.subagent?.provider ?? "",
					model: payload.subagent?.model ?? "",
					reasoningEffort: payload.subagent?.reasoningEffort ?? ""
				},
				goal: {
					enabled: payload.goal !== null && payload.goal !== void 0,
					provider: payload.goal?.provider ?? "",
					model: payload.goal?.model ?? "",
					reasoningEffort: payload.goal?.reasoningEffort ?? ""
				}
			};
		}
		//#endregion

		//#region presentational pieces
		function SelectField({ label, value, options, placeholder, disabled, onChange }) {
			return react_jsx_runtime.jsxs("label", {
				className: "mst_field",
				children: [
					react_jsx_runtime.jsx("span", { className: "mst_fieldLabel", children: label }),
					react_jsx_runtime.jsx("div", {
						className: "mst_selectWrap",
						children: react_jsx_runtime.jsxs("select", {
							className: "mst_select",
							value,
							disabled,
							onChange: (event) => onChange(event.target.value),
							children: [
								value === "" && react_jsx_runtime.jsx("option", { value: "", children: placeholder }),
								...options.map((entry) => react_jsx_runtime.jsx("option", { value: entry.id, children: entry.name }, entry.id))
							]
						})
					})
				]
			});
		}

		/** Hand-drawn 16px outline brain, matched to the dsh icon stroke style. */
			function IconBrainOutline16({ size = 16, className }) {
				return react_jsx_runtime.jsxs("svg", {
					width: size,
					height: size,
					viewBox: "0 0 24 24",
					fill: "none",
					"aria-hidden": true,
					className,
					children: [
						react_jsx_runtime.jsx("path", {
							d: "M12 5A3 3 0 1 0 6.003 5.125A4 4 0 0 0 3.477 10.896A4 4 0 0 0 4.033 17.484A4 4 0 1 0 12 18Z",
							stroke: "currentColor",
							strokeWidth: "1.8",
							strokeLinecap: "round",
							strokeLinejoin: "round"
						}),
						react_jsx_runtime.jsx("path", {
							d: "M12 5A3 3 0 1 1 17.997 5.125A4 4 0 0 1 20.523 10.896A4 4 0 0 1 19.967 17.484A4 4 0 1 1 12 18Z",
							stroke: "currentColor",
							strokeWidth: "1.8",
							strokeLinecap: "round",
							strokeLinejoin: "round"
						}),
						react_jsx_runtime.jsx("path", {
							d: "M15 13A4.5 4.5 0 0 1 12 9A4.5 4.5 0 0 1 9 13",
							stroke: "currentColor",
							strokeWidth: "1.8",
							strokeLinecap: "round"
						}),
						react_jsx_runtime.jsx("path", {
							d: "M6.401 6.5A3 3 0 0 0 6.003 5.125M17.599 6.5A3 3 0 0 1 17.997 5.125",
							stroke: "currentColor",
							strokeWidth: "1.6",
							strokeLinecap: "round"
						}),
						react_jsx_runtime.jsx("path", {
							d: "M6 18A4 4 0 0 1 4.033 17.484M18 18A4 4 0 0 0 19.967 17.484",
							stroke: "currentColor",
							strokeWidth: "1.8",
							strokeLinecap: "round"
						})
					]
				});
			}

			function SlotIcon({ slotKey, size = 16 }) {
			const Icon = slotKey === "subagent"
				? primitives.IconBranchOutline16
				: slotKey === "goal"
					? primitives.IconGoalOutline16
					: primitives.IconSettingsOutline16;
			return react_jsx_runtime.jsx(Icon, { size });
		}

		/**
		 * 档位卡片（子代理/goal）。必须是组件外定义：定义在面板组件内部会让它每次
		 * 重渲染都是新引用 → React 卸载重挂载 → DOM 重建 → 滚动跳回顶部。
		 * 提升到顶层后引用稳定，编辑时滚动位置保持。
		 */
		function SlotCard({ slotKey, canInherit, slot, providerChoices, models, efforts, defaultLabel, translate, onToggleSlot, onProviderChange, onPatchDraft }) {
			if (slot === void 0 || slot === null) return null;
			const enabled = canInherit ? slot.enabled : true;
			return react_jsx_runtime.jsxs("section", {
				className: "mst_slot",
				"data-slot": slotKey,
				"data-enabled": enabled,
				children: [
					react_jsx_runtime.jsxs("div", {
						className: "mst_slotHead",
						children: [
							react_jsx_runtime.jsx("div", { className: "mst_slotMark", children: react_jsx_runtime.jsx(SlotIcon, { slotKey, size: 16 }) }),
							react_jsx_runtime.jsxs("div", {
								className: "mst_slotCopy",
								children: [
									react_jsx_runtime.jsxs("div", {
										className: "mst_slotTitleRow",
										children: [
											react_jsx_runtime.jsx("span", { className: "mst_slotTitle", children: translate(`${slotKey}.title`) }),
											react_jsx_runtime.jsx("span", {
												className: "mst_slotState",
												children: canInherit ? "" : translate("current.defaultRoute")
											})
										]
									}),
									react_jsx_runtime.jsx("span", { className: "mst_slotDesc", children: translate(`${slotKey}.desc`) })
								]
							}),
							canInherit && react_jsx_runtime.jsxs("label", {
								className: "mst_switch",
								"aria-label": translate(enabled ? "current.custom" : "current.follow"),
								children: [
									react_jsx_runtime.jsx("input", {
										type: "checkbox",
										checked: slot.enabled,
										onChange: (event) => onToggleSlot(slotKey, event.target.checked)
									}),
									react_jsx_runtime.jsx("span", { className: "mst_switchTrack" })
								]
							})
						]
					}),
					enabled ? react_jsx_runtime.jsxs("div", {
						className: "mst_slotBody",
						children: [
							react_jsx_runtime.jsx(SelectField, {
								label: translate("field.provider"),
								value: slot.provider,
								options: providerChoices,
								placeholder: translate("select.provider"),
								disabled: providerChoices.length === 0,
								onChange: (provider) => onProviderChange(slotKey, provider)
							}),
							react_jsx_runtime.jsxs("div", {
								className: "mst_fieldGrid",
								children: [
									react_jsx_runtime.jsx(SelectField, {
										label: translate("field.model"),
										value: slot.model,
										options: models,
										placeholder: translate("select.model"),
										disabled: models.length === 0,
										onChange: (model) => onPatchDraft(slotKey, { model, reasoningEffort: "" })
									}),
									react_jsx_runtime.jsx(SelectField, {
										label: translate("field.effort"),
										value: slot.reasoningEffort,
										options: efforts,
										placeholder: translate("effort.default"),
										disabled: efforts.length === 0,
										onChange: (reasoningEffort) => onPatchDraft(slotKey, { reasoningEffort })
									})
								]
							})
						]
					}) : react_jsx_runtime.jsxs("div", {
						className: "mst_slotBody",
						children: react_jsx_runtime.jsxs("div", {
							className: "mst_inheritRow",
							children: [
								react_jsx_runtime.jsx(primitives.IconCheckOutline16, { size: 14 }),
								react_jsx_runtime.jsx("span", { children: `${translate("current.follow")} · ${defaultLabel}` })
							]
						})
					})
				]
			});
		}
		//#endregion

		//#region ModelSettingsPanel
		/**
		 * Sidebar footer action: badge + floating model settings panel.
		 * @param props - `wide` from the sidebar shell, `t` bound by the slot runtime.
		 */
		function ModelSettingsPanel({ wide, t, useSessions }) {
			const translate = (key, params) => interpolate(t !== void 0 ? t(key) : key, params);
			const [open, setOpen] = react.useState(false);
			const [stateData, setStateData] = react.useState(null);
			const [loading, setLoading] = react.useState(false);
			const [saving, setSaving] = react.useState(false);
			const [savedAt, setSavedAt] = react.useState(null);
			const [appliedAt, setAppliedAt] = react.useState(null);
			const [error, setError] = react.useState(null);
			const [draft, setDraft] = react.useState(null);
			const layerRef = react.useRef(null);
			const panelRef = react.useRef(null);

			const listState = useSessions !== void 0 ? useSessions((s) => s) : void 0;
			const currentSessionId = listState?.current ?? listState?.currentAddress?.childSessionId ?? void 0;

			const load = react.useCallback(() => {
				setLoading(true);
				setError(null);
				fetchJson(STATE_PATH).then(async (payload) => {
					if (payload.ok !== true) {
						setError(translate("state.error", { message: payload.message ?? "state failed" }));
						return;
					}
					setAppliedAt(null);
					// 主模型档的种子：优先用当前会话正在用的模型（覆盖"已切当前会话、
					// 刷新后想把它保存为全局"的场景），否则回退到全局默认。
					let mainSeed = payload.defaultModel;
					if (currentSessionId !== void 0) {
						try {
							const sessionCurrent = await fetchSessionModels(currentSessionId);
							if (sessionCurrent !== null && typeof sessionCurrent.provider === "string" && typeof sessionCurrent.model === "string") mainSeed = sessionCurrent;
						} catch {
							/* 读会话模型失败时用全局默认 */
						}
					}
					// stateData 与 draft 同批提交：避免 setStateData 先落地而 draft 还为 null
					// 的窗口期里渲染内容分支导致 SlotCard 访问 undefined 崩溃。
					setStateData(payload);
					setDraft((current) => current === null ? draftFromState({ ...payload, defaultModel: mainSeed }) : current);
				}).catch((err) => {
					setError(translate("state.error", { message: err instanceof Error ? err.message : String(err) }));
				}).finally(() => {
					setLoading(false);
				});
			}, [currentSessionId]);

			react.useEffect(() => {
				if (open && stateData === null && !loading) load();
			}, [open, stateData, loading, load]);

			// Keep footer actions stacked vertically while this entry is mounted;
			// otherwise the host can squeeze multiple full-width actions into a row.
			react.useEffect(() => {
				let host = layerRef.current?.parentElement ?? null;
				for (let depth = 0; host !== null && depth < 3; depth += 1) {
					if (window.getComputedStyle(host).display.includes("flex")) break;
					host = host.parentElement;
				}
				if (host === null) return void 0;
				const hostStyle = window.getComputedStyle(host);
				if (!hostStyle.display.includes("flex") || hostStyle.flexDirection === "column") return void 0;
				const previous = host.style.flexDirection;
				host.style.flexDirection = "column";
				return () => {
					host.style.flexDirection = previous;
				};
			}, []);

			// Popover ergonomics: Escape and outside pointer close, while clicks on
			// the badge or inside the portaled panel keep their normal behavior.
			react.useEffect(() => {
				if (!open) return void 0;
				const onPointerDown = (event) => {
					if (panelRef.current?.contains(event.target) || layerRef.current?.contains(event.target)) return;
					setOpen(false);
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [open]);

			const groups = stateData?.catalog?.groups ?? [];
			const providerChoices = groups.map((group) => ({ id: group.id, name: group.name, models: group.models }));
			const modelChoicesFor = (slot) => providerChoices.find((entry) => entry.id === slot?.provider)?.models ?? [];
			const effortChoicesFor = (slot) => modelChoicesFor(slot).find((entry) => entry.id === slot?.model)?.reasoning?.efforts ?? [];

			const patchDraft = (slot, patch) => {
				setSavedAt(null);
				setAppliedAt(null);
				setDraft((current) => current === null ? current : ({ ...current, [slot]: { ...current[slot], ...patch } }));
			};

			const firstSelection = () => {
				const provider = providerChoices[0];
				const model = provider?.models?.[0];
				return { provider: provider?.id ?? "", model: model?.id ?? "", reasoningEffort: "" };
			};

			const selectionWithFallback = (slot) => {
				if (slot.provider !== "" && slot.model !== "") return slot;
				const current = stateData?.defaultModel;
				if (current?.provider !== void 0 && current?.model !== void 0) {
					return { provider: current.provider, model: current.model, reasoningEffort: current.reasoningEffort ?? "" };
				}
				return firstSelection();
			};

			const handleProviderChange = (slotKey, provider) => {
				const first = providerChoices.find((entry) => entry.id === provider)?.models[0];
				patchDraft(slotKey, { provider, model: first?.id ?? "", reasoningEffort: "" });
			};

			const handleToggleSlot = (slotKey, enabled) => {
				setDraft((current) => {
					if (current === null) return current;
					const existing = current[slotKey];
					const next = enabled ? selectionWithFallback(existing) : existing;
					return { ...current, [slotKey]: { ...next, enabled } };
				});
				setSavedAt(null);
				setAppliedAt(null);
			};

			const formatSelection = (selection) => {
				if (selection === null || selection === void 0 || selection.provider === "") return translate("state.unset");
				const provider = providerChoices.find((entry) => entry.id === selection.provider);
				const model = provider?.models.find((entry) => entry.id === selection.model);
				return `${provider?.name ?? selection.provider} · ${model?.name ?? selection.model}`;
			};

			const formatEffort = (selection) => {
				if (selection?.reasoningEffort === void 0 || selection?.reasoningEffort === "") return translate("current.defaultEffort");
				const effort = effortChoicesFor(selection).find((entry) => entry.id === selection.reasoningEffort);
				return effort?.name ?? selection.reasoningEffort;
			};

			const handleSave = () => {
				if (draft === null) return;
				setSaving(true);
				setError(null);
				fetchJson(SAVE_PATH, { method: "POST", body: {
					...payloadFromDraft(draft),
					...(currentSessionId !== void 0 ? { sessionId: currentSessionId } : {})
				} }).then((payload) => {
					if (payload.ok !== true) throw new Error(payload.message ?? "save failed");
					setStateData(payload);
					setDraft(draftFromState(payload));
					setSavedAt(Date.now());
				}).catch((err) => {
					setError(translate("state.error", { message: err instanceof Error ? err.message : String(err) }));
				}).finally(() => {
					setSaving(false);
				});
			};

			const handleApplyCurrent = () => {
				if (draft === null) return;
				if (currentSessionId === void 0) {
					setError(translate("state.noSession"));
					return;
				}
				setSaving(true);
				setError(null);
				fetchJson(APPLY_PATH, {
					method: "POST",
					body: {
						sessionId: currentSessionId,
						provider: draft.main.provider,
						model: draft.main.model,
						...(draft.main.reasoningEffort !== "" ? { reasoningEffort: draft.main.reasoningEffort } : {})
					}
				}).then((payload) => {
					if (payload.ok !== true) throw new Error(payload.message ?? "apply failed");
					setAppliedAt(Date.now());
					setSavedAt(null);
				}).catch((err) => {
					setError(translate("state.error", { message: err instanceof Error ? err.message : String(err) }));
				}).finally(() => {
					setSaving(false);
				});
			};

			const normalizedDraft = draft === null ? null : payloadFromDraft(draft);
			const normalizedSaved = stateData === null ? null : payloadFromState(stateData);
			const dirty = normalizedDraft !== null && normalizedSaved !== null && JSON.stringify(normalizedDraft) !== JSON.stringify(normalizedSaved);
			const mainValid = draft !== null && draft.main.provider !== "" && draft.main.model !== "";
			const subagentValid = draft === null || !draft.subagent.enabled || (draft.subagent.provider !== "" && draft.subagent.model !== "");
			const goalValid = draft === null || !draft.goal.enabled || (draft.goal.provider !== "" && draft.goal.model !== "");
			const formValid = draft !== null && mainValid && subagentValid && goalValid;
			const mainModelChoices = providerChoices.find((entry) => entry.id === draft?.main?.provider)?.models ?? [];
			const mainEfforts = mainModelChoices.find((entry) => entry.id === draft?.main?.model)?.reasoning?.efforts ?? [];
			const footerState = saving
				? translate("state.saving")
				: appliedAt !== null
					? translate("state.applied")
					: dirty
						? translate("state.dirty")
						: savedAt !== null
							? translate("state.saved")
							: "";
			const footerDotState = appliedAt !== null ? "applied" : dirty ? "dirty" : savedAt !== null ? "saved" : void 0;

			return react_jsx_runtime.jsxs("div", {
				ref: layerRef,
				className: wide ? "mst_layer" : "mst_layer mst_rail",
				children: [
					open && react_dom.createPortal(react_jsx_runtime.jsxs("section", {
						ref: panelRef,
						className: "mst_panel",
						"data-model-settings-panel": true,
						"aria-label": translate("panel.title"),
						"aria-busy": loading || saving,
						children: [
							react_jsx_runtime.jsxs("header", {
								className: "mst_header",
								children: [
									react_jsx_runtime.jsxs("div", {
										className: "mst_headerLeft",
										children: [
											react_jsx_runtime.jsx("div", { className: "mst_appIcon", children: react_jsx_runtime.jsx(IconBrainOutline16, { size: 18 }) }),
											react_jsx_runtime.jsxs("div", {
												className: "mst_titleWrap",
												children: [
													react_jsx_runtime.jsx("span", { className: "mst_title", children: translate("panel.title") }),
													react_jsx_runtime.jsx("span", { className: "mst_subtitle", children: translate("panel.subtitle") })
												]
											})
										]
									}),
									react_jsx_runtime.jsxs("div", {
										className: "mst_headerActions",
										children: [
											react_jsx_runtime.jsx(primitives.Tooltip, {
												label: translate("action.refresh"),
												side: "bottom",
												delayMs: 500,
												children: react_jsx_runtime.jsx("button", {
													type: "button",
													className: "mst_iconButton",
													"data-model-settings-refresh": true,
													"aria-label": translate("action.refresh"),
													title: translate("action.refresh"),
													onClick: load,
													children: react_jsx_runtime.jsx(primitives.IconRefreshOutline14, { size: 14 })
												})
											}),
											react_jsx_runtime.jsx(primitives.Tooltip, {
												label: translate("action.close"),
												side: "bottom",
												delayMs: 500,
												children: react_jsx_runtime.jsx("button", {
													type: "button",
													className: "mst_iconButton",
													"aria-label": translate("action.close"),
													onClick: () => setOpen(false),
													children: react_jsx_runtime.jsx(primitives.IconCloseOutline16, { size: 14 })
												})
											})
										]
									})
								]
							}),
							react_jsx_runtime.jsxs("div", {
								className: "mst_body",
								children: [
									loading && stateData === null ? react_jsx_runtime.jsxs("div", {
										className: "mst_skeletonGrid",
										children: [
											react_jsx_runtime.jsx("div", { className: "mst_skeleton" }),
											react_jsx_runtime.jsx("div", { className: "mst_skeleton" }),
											react_jsx_runtime.jsx("div", { className: "mst_skeleton" }),
											react_jsx_runtime.jsxs("div", {
												className: "mst_loading",
												children: [
													react_jsx_runtime.jsx(primitives.IconLoadingOutline16, { size: 16, className: "mst_loadingIcon" }),
													react_jsx_runtime.jsx("span", { children: translate("state.loading") })
												]
											})
										]
									}) : stateData === null ? react_jsx_runtime.jsx("div", { className: "mst_empty", children: translate("state.empty") }) : react_jsx_runtime.jsxs(react_jsx_runtime.Fragment, {
										children: [
											react_jsx_runtime.jsxs("section", {
												className: "mst_hero",
												children: [
													react_jsx_runtime.jsx("div", { className: "mst_heroIcon", children: react_jsx_runtime.jsx(IconBrainOutline16, { size: 19 }) }),
													react_jsx_runtime.jsxs("div", {
														className: "mst_heroCopy",
														children: [
															react_jsx_runtime.jsx("span", { className: "mst_heroLabel", children: translate("current.main") }),
															react_jsx_runtime.jsx("span", { className: "mst_heroModel", children: formatSelection(draft?.main) }),
															react_jsx_runtime.jsx("span", { className: "mst_heroMeta", children: formatEffort(draft?.main) })
														]
													})
												]
											}),
											react_jsx_runtime.jsxs("div", {
												className: "mst_sectionHead",
												children: [
													react_jsx_runtime.jsx("span", { className: "mst_sectionTitle", children: translate("panel.routes") }),
													react_jsx_runtime.jsx("span", { className: "mst_sectionMeta", children: translate("panel.providerCount", { count: providerChoices.length }) })
												]
											}),
											react_jsx_runtime.jsx(SlotCard, { slotKey: "main", canInherit: false, slot: draft?.main, providerChoices, models: mainModelChoices, efforts: mainEfforts, defaultLabel: formatSelection(stateData?.defaultModel), translate, onToggleSlot: handleToggleSlot, onProviderChange: handleProviderChange, onPatchDraft: patchDraft }),
											react_jsx_runtime.jsx(SlotCard, { slotKey: "subagent", canInherit: true, slot: draft?.subagent, providerChoices, models: modelChoicesFor(draft?.subagent), efforts: effortChoicesFor(draft?.subagent), defaultLabel: formatSelection(stateData?.defaultModel), translate, onToggleSlot: handleToggleSlot, onProviderChange: handleProviderChange, onPatchDraft: patchDraft }),
											react_jsx_runtime.jsx(SlotCard, { slotKey: "goal", canInherit: true, slot: draft?.goal, providerChoices, models: modelChoicesFor(draft?.goal), efforts: effortChoicesFor(draft?.goal), defaultLabel: formatSelection(stateData?.defaultModel), translate, onToggleSlot: handleToggleSlot, onProviderChange: handleProviderChange, onPatchDraft: patchDraft }),
											error !== null && react_jsx_runtime.jsxs("div", {
												className: "mst_notice mst_error",
												children: [
													react_jsx_runtime.jsx(primitives.IconWarningOutline16, { size: 14 }),
													react_jsx_runtime.jsx("span", { children: error })
												]
											}),
											savedAt !== null && !dirty && react_jsx_runtime.jsxs("div", {
												className: "mst_notice mst_success",
												children: [
													react_jsx_runtime.jsx(primitives.IconCheckOutline16, { size: 14 }),
													react_jsx_runtime.jsx("span", { children: translate("state.saved") })
												]
											}),
											react_jsx_runtime.jsxs("div", {
												className: "mst_hotNote",
												children: [
													react_jsx_runtime.jsx(primitives.IconSparkle16, { size: 14 }),
													react_jsx_runtime.jsx("span", { children: translate("hot.title") }),
													react_jsx_runtime.jsx("span", { children: translate("hot.desc") })
												]
											})
										]
									})
								]
							}),
							react_jsx_runtime.jsxs("footer", {
								className: "mst_footer",
								children: [
									footerState !== "" && react_jsx_runtime.jsxs("div", {
										className: "mst_footerHint",
										children: [
											react_jsx_runtime.jsx("span", { className: "mst_statusDot", "data-dirty": footerDotState === "dirty" || void 0, "data-saved": footerDotState === "saved" || footerDotState === "applied" || void 0 }),
											react_jsx_runtime.jsx("span", { children: footerState })
										]
									}),
									react_jsx_runtime.jsx("button", {
										type: "button",
										className: "mst_button mst_secondary",
										disabled: saving || !mainValid,
										title: currentSessionId === void 0 ? translate("state.noSession") : currentSessionId,
										onClick: handleApplyCurrent,
										children: translate("action.applyCurrent")
									}),
									react_jsx_runtime.jsx("button", {
										type: "button",
										className: "mst_button mst_primary",
										disabled: saving || !formValid || !dirty,
										onClick: handleSave,
										children: translate("action.save")
									})
								]
							})
						]
					}), document.body),
					react_jsx_runtime.jsxs("button", {
						type: "button",
						className: "mst_badge",
						"data-model-settings-badge": true,
						"data-active": open || void 0,
						"aria-label": translate("panel.title"),
						"aria-expanded": open,
						onClick: () => setOpen((value) => !value),
						children: [
							react_jsx_runtime.jsx(IconBrainOutline16, { size: wide ? 14 : 18, className: "mst_brainIcon" }),
							wide && react_jsx_runtime.jsx("span", { className: "mst_badgeLabel", children: translate("action.label") })
						]
					})
				]
			});
		}
		//#endregion

		//#region plugin body
		/** Services required by the client plugin body. */
		const inject = ["slots", "locale"];

		/**
		 * Client plugin body: register the dictionaries and the sidebar footer action.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "model-settings: dictionaries");
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "model-settings",
				locale: NS,
				order: 5
			}, ModelSettingsPanel));
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		exports.ModelSettingsPanel = ModelSettingsPanel;
		return module.exports;
	}
});
