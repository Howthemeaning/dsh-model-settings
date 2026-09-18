# dsh-model-settings

[English](README.en.md) | [中文](README.md)

## Overview

One panel to configure the model for the three kinds of independent model consumers in dsh:

- **Main agent** (the default model for new sessions)
- **Subagents** (subagent / workflow-spawned children)
- **Goal rounds** (rounds while a goal is active)

Each slot sets its own **provider / model / reasoning effort** independently — saved settings take effect immediately, no restart needed.

Two actions, kept distinct: **Apply globally** writes the config and switches the current conversation; **Apply to this conversation only** switches just the current session without writing config.

![Model Settings panel](docs/dsh-model-settings.png)

## Origin

This plugin was born from a real billing accident.

On 2026-08-19, the author switched dsh's main session to kimi (a subscription plan, to save some money). Around that time, DeepSeek had just introduced **peak/valley pricing** — and in the community's telling, the daytime bill belongs to *Liang Wenfeng*, while the nighttime rate belongs to *Liang Wengu*. (See the note below for what that means.)

Since daytime is peak-priced, metered DeepSeek should be saved for the night; daytime work should run on a subscription.

That evening, the DeepSeek balance had gone from ~¥50 to **-1.6**.

An investigation — decompressing all 76 session logs and checking them line by line — found the truth: the main session was indeed kimi, but the 12 subagents spawned that afternoon had all hit the DeepSeek official API (`deepseek-v4-flash`), along with 40 more the previous evening. About **¥41–52 over two days**. No leaked key — it's dsh's model routing design: subagents inherit the **default model at creation time** (`agent-default-model`), not the model selected in the main session's UI.

In other words: once the main session is switched to another model (say, kimi), subagents do not follow — they keep the default model from creation time. Hence this plugin: one panel to control the model and reasoning effort for the **main model**, **subagents**, and **goal rounds**, hot-reloaded on save.

> **About the joke**: DeepSeek's founder is Liang Wenfeng (梁文锋). Peak/valley pricing (like off-peak electricity tariffs) splits the day into expensive *peaks* and cheap *valleys* — 峰 (fēng, "peak") is a homophone of 锋 (fēng, in *Wenfeng*), and 谷 (gǔ) means "valley". So the gag goes: daytime (peak) billing is run by "Liang Wenfeng", nighttime (valley) rates by his fictional sibling "Liang Wengu" (梁文谷). It's just a pun — there is no second founder.

## What it does

Adds a **Model Settings** entry to the bottom-left of the dsh web UI (below the workspace, above Settings — pinyin order puts it right before "用量/余额"). One panel controls the three kinds of independent model consumers:

| Slot | Controls | Takes effect |
| --- | --- | --- |
| Main model | New-session default (writes `agent-default-model`) | On save: writes global config **and switches the current conversation immediately** |
| Subagents (incl. workflow) | Every subagent request (global `agent/request` interception) | Hot: the next subagent request in a running session |
| Goal rounds | Rounds while a goal is active | Hot: the next goal round |

Each slot sets its own **provider / model / reasoning effort**, or follows the default.

### Two buttons, don't mix them up

| Button | Meaning | In one line |
| --- | --- | --- |
| **Apply globally** | Writes global config **and** switches the current conversation too | Now *and* the future |
| **Apply to this conversation only** | Switches only the open conversation, no config write | Just now, no side effects |

**Hot reload**: no dsh restart needed. New sessions use the new main model; the next subagent request or goal round in a running session uses the new config.

## Compatibility

- The current code targets the new dsh-settings API (`SettingsProvider` / `ctx.settings.installSection`) and has been verified on dsh **0.1.5-rc.2** (plugin loads cleanly and the `/api/model-settings/state` endpoints work).
- If your dsh is older (`@deepseek-ai/dsh-settings` still exports `settingsNamespace` / `installSettingsSection`), use version **0.1.0** of this plugin instead.

## Requirements

- **dsh web profile**: the panel is web-side UI (`dsh.client.platform: "web"`) and only loads under a web profile.
- **Peer dependencies**:

  | Package | Range |
  | --- | --- |
  | `@deepseek-ai/cordis` | `^4.0.1` |
  | `@deepseek-ai/dsh-llm` | `>=0.0.1-rc.1 <0.2.0` |
  | `@deepseek-ai/dsh-settings` | `>=0.0.1-rc.1 <0.2.0` |
  | `@deepseek-ai/schemastery` | `>=0.0.1-rc.1 <0.2.0` |

- **Required host services**: `agents`, `webServer` (server side); `slots`, `locale` (client side).
- **Optional services** — when absent the matching capability degrades instead of crashing:

  | Service | When absent |
  | --- | --- |
  | `settings` | Panel is read-only; saving returns `settings service unavailable` |
  | `llm` | Empty model catalog; the panel shows "No configurable model providers" |
  | `agentDefaultModel` | Current default is unreadable; the main route shows "Not configured" |
  | `goals` | The goal slot has no effect; the other two work normally |

## Installation

### Standard install (recommended)

```bash
# Install from GitHub
dsh plugin --profile web add github:Howthemeaning/dsh-model-settings
```

`dsh plugin` installs the package into the profile and automatically appends `dsh-model-settings` to the `dsh.profile.bundles` layer (the package declares `dsh.bundle.patch`). **Restart dsh** for it to take effect.

### Uninstall

```bash
dsh plugin --profile web remove dsh-model-settings
```

Or manually: remove `dsh-model-settings` from both the `dsh.profile.bundles` array and `dependencies` in `~/.dsh/profiles/web/package.json`, then delete `~/.dsh/profiles/web/node_modules/dsh-model-settings`.

## Configuration

Day to day, just open the panel — it writes the settings *user* layer, which takes precedence over the defaults below.

To pre-seed defaults at deploy time (say, pinning every subagent to a cheaper model across a team), override this plugin's `config` with an `update` entry in the profile's `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- update:
    - id: model-settings
      config:
        subagent:
          provider: deepseek-official
          model: deepseek-v4-flash
          reasoningEffort: low
```

Two optional slots, same fields:

| Field | Type | Notes |
| --- | --- | --- |
| `subagent` | object | Override for subagents (workflow children included); omit to follow the default |
| `goal` | object | Override for rounds while a goal is active; omit to follow the default |
| `<slot>.provider` | string | Provider id, matching the panel's "Provider" dropdown |
| `<slot>.model` | string | Model id |
| `<slot>.reasoningEffort` | string | Reasoning effort id; omit to use the model's own default |

The main-model slot is not configured here — it writes the `agent-default-model` namespace, owned by the panel or by dsh's own settings.

## Development

This package is hand-written ESM with no build step: `lib/index.js` is the host half, `lib/client.js` the browser half (a hand-written `__ModuleLoader__` bundle with the CSS inlined).

The peer dependencies ship with the dsh CLI, so point `node_modules` at them for local work:

```bash
ln -sfn "$(npm root -g)/@deepseek-ai/dsh/node_modules" node_modules
npm run check
```

| Command | What it does |
| --- | --- |
| `npm run build` | Verifies every published artifact exists and `node --check`s both js files (no transpile) |
| `npm run check` | `build`, then `test/smoke.mjs` |

`test/smoke.mjs` mocks a minimal cordis ctx and covers the `agent/request` slot precedence plus all three endpoints. Two more scripts are investigation tools, not part of `check`: `test/read-log.mjs` decompresses a session log and prints its `request/header` entries, and `test/render-debug.mjs` force-renders the panel under node to reproduce crashes.

After editing `lib/client.js`, sync it to the installed copy and hard-reload the page to see the change (the CSS is injected into a `<style>` tag on first load; no dsh restart needed):

```bash
cp lib/client.js ~/.dsh/profiles/web/node_modules/dsh-model-settings/lib/client.js
```

## License

MIT — this plugin was born from a real billing accident. May it keep every model bill under control.
