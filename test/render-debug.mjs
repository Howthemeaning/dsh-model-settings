// Render ModelSettingsPanel in node (forced open) to capture the real crash.
// Mocks the __ModuleLoader__ environment and the primitives/slot deps.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const react = require("react");
const jsxRuntime = require("react/jsx-runtime");
const { renderToStaticMarkup } = require("react-dom/server");

// minimal primitives: icon components + Tooltip passthrough
const iconStub = (name) => (props) => react.createElement("span", { "data-icon": name, ...props });
const primitives = new Proxy({}, {
	get: (target, prop) => {
		if (prop === "Tooltip") return ({ children }) => children;
		return iconStub(String(prop));
	}
});

const registry = {};
const requireShim = (spec) => {
	if (spec === "react") return react;
	if (spec === "react/jsx-runtime") return jsxRuntime;
	if (spec === "react-dom") return { createPortal: (node) => node };
	if (spec === "@deepseek-ai/dsh-client-ui-primitives") return primitives;
	throw new Error(`unknown require: ${spec}`);
};
globalThis.window = {
	__ModuleLoader__: {
		load: ({ id, factory }) => {
			registry[id] = factory;
		}
	}
};
globalThis.document = {
	createElement: () => ({ style: {}, dataset: {}, appendChild: () => {}, setAttribute: () => {} }),
	head: { appendChild: () => {} },
	addEventListener: () => {},
	removeEventListener: () => {},
	querySelector: () => null
};

// mock loaded state so the panel renders the full content (SlotCard path)
const PROVIDERS = [
	{ id: "deepseek-official", name: "DeepSeek", models: [{ id: "deepseek-v4-flash", name: "DeepSeek-V4-Flash", reasoning: { efforts: [{ id: "high" }] } }] },
	{ id: "kimi-coding", name: "kimi", models: [{ id: "k3-256k", name: "k3-256k" }] }
];
const mockState = {
	ok: true,
	defaultModel: { provider: "kimi-coding", model: "k3-256k", reasoningEffort: "high" },
	subagent: null,
	goal: null,
	catalog: { groups: PROVIDERS, failures: [] }
};
const mockDraft = {
	main: { provider: "deepseek-official", model: "deepseek-v4-flash", reasoningEffort: "" },
	subagent: { enabled: true, provider: "kimi-coding", model: "k3-256k", reasoningEffort: "high" },
	goal: { enabled: true, provider: "deepseek-official", model: "deepseek-v4-flash", reasoningEffort: "low" }
};
globalThis.__MOCK_STATE = mockState;
globalThis.__MOCK_DRAFT = mockDraft;

const src = readFileSync(join(here, "..", "lib", "client.js"), "utf8");
// force the panel open AND seed stateData/draft so the full content renders
const forced = src
	.replace(/const \[open, setOpen\] = react\.useState\(false\);/, "const [open, setOpen] = react.useState(true);")
	.replace(/const \[stateData, setStateData\] = react\.useState\(null\);/, "const [stateData, setStateData] = react.useState(globalThis.__MOCK_STATE);")
	.replace(/const \[draft, setDraft\] = react\.useState\(null\);/, "const [draft, setDraft] = react.useState(globalThis.__MOCK_DRAFT);");
eval(forced);

eval(forced);
console.error("registered ids:", Object.keys(registry));
if (registry["dsh-model-settings"] === void 0) process.exit(1);

const Panel = registry["dsh-model-settings"](requireShim).ModelSettingsPanel;
const useSessions = (selector) => selector({
	current: "session-d27b9b83-8be6-4f6f-a96f-dfe0770e0b7d",
	currentAddress: undefined,
	byId: {},
	ids: [],
	phase: "ready",
	subagentsByParent: {},
	jobsBySession: {}
});
const t = (key) => key;

try {
	const html = renderToStaticMarkup(react.createElement(Panel, { wide: true, t, useSessions }));
	console.log("RENDER OK, length:", html.length);
} catch (error) {
	console.error("RENDER CRASH:");
	console.error(error);
}
