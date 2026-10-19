/**
 * Client-half smoke test.
 *
 * Loads the hand-written `__ModuleLoader__` bundle twice: once with the old
 * `IconX16` primitives surface (dsh <= 0.1.6) and once with the new
 * `IconXRegular/Medium` surface (dsh >= 0.1.7). This catches the class of bug
 * where the panel registers but crashes on its first render because an icon
 * export disappeared.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = await readFile(join(root, "lib/client.js"), "utf8");

const oldIcons = [
	"IconBranchOutline16",
	"IconCheckOutline16",
	"IconCloseOutline16",
	"IconGoalOutline16",
	"IconLoadingOutline16",
	"IconRefreshOutline14",
	"IconSettingsOutline16",
	"IconSparkle16",
	"IconWarningOutline16"
];
const newIcons = [
	"IconBranchOutlineRegular",
	"IconCheckOutlineRegular",
	"IconCloseOutlineRegular",
	"IconGoalOutlineRegular",
	"IconLoadingOutlineRegular",
	"IconRefreshOutlineRegular",
	"IconSettingsOutlineRegular",
	"IconSparkleRegular",
	"IconWarningOutlineRegular"
];

function createPrimitives(names) {
	const base = { Tooltip: () => null };
	for (const name of names) base[name] = () => null;
	const accessed = [];
	const primitives = new Proxy(base, {
		get(target, key) {
			if (typeof key === "string") accessed.push(key);
			return target[key];
		}
	});
	return { primitives, accessed };
}

function load(primitives) {
	let registration;
	const window = {
		__ModuleLoader__: {
			load(value) {
				registration = value;
			}
		}
	};
	const document = {
		querySelector: () => null,
		createElement: () => ({ dataset: {}, textContent: "" }),
		head: { appendChild: () => {} }
	};
	const requireStub = (id) => {
		if (id === "react") return {};
		if (id === "react/jsx-runtime") return {};
		if (id === "react-dom") return {};
		if (id === "@deepseek-ai/dsh-client-ui-primitives") return primitives;
		throw new Error(`unexpected client require: ${id}`);
	};
	new Function("window", "document", "require", source)(window, document, requireStub);
	assert.ok(registration !== undefined, "bundle registers with __ModuleLoader__");
	assert.equal(registration.id, "dsh-model-settings", "bundle id");
	const module = registration.factory(requireStub);
	assert.equal(typeof module.apply, "function", "bundle exports apply");
	return module;
}

function applyToSlots(module) {
	const registrations = [];
	const ctx = {
		effect(fn) {
			const disposer = fn();
			return typeof disposer === "function" ? disposer : () => {};
		},
		locale: {
			register() {
				return () => {};
			}
		},
		slots: {
			inject(name, callback) {
				assert.equal(name, "sidebar.footer.action", "injects the sidebar footer slot");
				callback();
			},
			register(definition, component) {
				registrations.push({ definition, component });
				return () => {};
			}
		}
	};
	module.apply(ctx);
	assert.equal(registrations.length, 1, "registers one footer action");
	assert.equal(registrations[0].definition.id, "model-settings", "footer action id");
	assert.equal(typeof registrations[0].component, "function", "footer action component");
}

{
	const { primitives, accessed } = createPrimitives(oldIcons);
	applyToSlots(load(primitives));
	assert.ok(accessed.includes("IconBranchOutline16"), "old primitive icon selected first");
	assert.ok(!accessed.includes("IconBranchOutlineRegular"), "new fallback untouched on old hosts");
}

{
	const { primitives, accessed } = createPrimitives(newIcons);
	applyToSlots(load(primitives));
	assert.ok(accessed.includes("IconBranchOutline16"), "old name probed first");
	assert.ok(accessed.includes("IconBranchOutlineRegular"), "new primitive icon selected as fallback");
}

{
	// A host that renames again must still render: pickIcon falls back to a
	// component returning null rather than handing React `undefined`.
	const { primitives } = createPrimitives([]);
	applyToSlots(load(primitives));
}

console.log("client smoke assertions passed ✓");
