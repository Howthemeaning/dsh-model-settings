# dsh-model-settings

[English](README.en.md) | [中文](README.md)

## Overview

One panel to configure the model for the three kinds of independent model consumers in dsh:

- **Main agent** (the default model for new sessions)
- **Subagents** (subagent / workflow-spawned children)
- **Goal rounds** (rounds while a goal is active)

Each slot sets its own **provider / model / reasoning effort** independently — saved settings take effect immediately, no restart needed.

Two actions, kept distinct: **Apply globally** writes the config and switches the current conversation; **Apply to this conversation only** switches just the current session without writing config.

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

Or manually: remove the model-settings block from `~/.dsh/profiles/web/cordis.patch.yml`, then delete `~/.dsh/profiles/node_modules/dsh-model-settings`.

## License

MIT — this plugin was born from a real billing accident. May it keep every model bill under control.
