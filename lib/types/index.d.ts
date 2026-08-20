/**
 * dsh-model-settings — Cordis plugin type declarations.
 *
 * The runtime implementation is plain ESM in `lib/index.js` (no build step);
 * these declarations describe the plugin contract for tooling and consumers.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Schema } from '@deepseek-ai/schemastery';

/** One model override slot: provider + model + optional reasoning effort. */
export interface ModelSlot {
    provider: string;
    model: string;
    reasoningEffort?: string;
}

/** Plugin config = base layer of the `model-settings` settings namespace. */
export interface ModelSettingsConfig {
    /** Override for every subagent request (workflow children included). */
    subagent?: ModelSlot;
    /** Override for rounds while a goal is active. */
    goal?: ModelSlot;
}

export declare const Config: Schema<ModelSettingsConfig>;

/** Services required by the plugin body. */
export declare const inject: string[];

/**
 * Plugin body: registers the `model-settings` settings namespace, the global
 * `agent/request` interception (hot model overrides for subagents and goal
 * rounds), and three loopback endpoints under `/api/model-settings/`.
 */
export declare function apply(ctx: Context, config?: ModelSettingsConfig): void;
