# dsh-model-settings

[中文](README.md) | [English](README.en.md)

## 概述

一个面板统一设置 dsh 里三类独立调用模型的对象：

- **主 agent**（新会话默认模型）
- **子代理**（subagent / workflow 拉起的子任务）
- **goal 回合**（goal 激活期间的回合）

每档独立设置 **provider / 模型 / 推理强度（reasoningEffort）**，保存即热更新，无需重启。

两个动作分清：**应用到全局**写入配置并切换当前对话；**仅应用到当前对话**只切当前会话，不写配置。

## 起源

这个插件的诞生源于一次真实的账单事故。

2026 年 8 月 19 日，作者把 dsh 的主会话切到了 kimi（走订阅，想省点钱）。彼时 DeepSeek 刚推出峰谷计价——白天的账归梁文峰，夜里的价归梁文谷。白天是峰价，按量计费该留到夜里；白天干活，该走套餐。

结果晚上一看余额，DeepSeek 从五十多变成了 -1.6。

排查（解压全部 76 个会话日志逐条核对）后发现：主会话确实是 kimi，但下午拉起的 12 个子代理全部走了 DeepSeek 官方 API（deepseek-v4-flash），前一天晚上还有 40 个，两天合计约 ¥41–52。不是 key 泄露，而是 dsh 的模型路由机制：子代理继承的是创建时的默认模型（`agent-default-model`），不跟随主会话在界面里选的模型。

也就是说：一旦主会话被切到别的模型（比如 kimi），子代理并不会跟随——它们继承的是创建时的默认模型。于是有了这个插件：用一个面板统一控制主模型、子代理、goal 回合的模型与推理强度，保存即热更新。

## 它做什么

在 dsh Web 界面左下角（工作区下方、设置的上面，按拼音排在「用量/余额」之前）新增 **模型设置** 入口，用一个面板统一管住三类独立调用模型的"消费者"：

| 档位 | 管谁 | 什么时候生效 |
| --- | --- | --- |
| 主模型 | 新会话默认（写 `agent-default-model`） | 应用到全局：写全局配置 **+ 立即切换当前对话** |
| 子代理（含 workflow） | 所有子代理请求（`agent/request` 瀑布全局拦截） | 热更新：运行中的会话下一次拉子代理即生效 |
| goal 回合 | goal 激活期间的会话回合 | 热更新：下一个 goal 回合即生效 |

每个档位都可以独立设置 **provider / model / 推理强度（reasoningEffort）**，也可以选择「跟随默认」。

### 两个按钮，别搞混

| 按钮 | 含义 | 一句话 |
| --- | --- | --- |
| **应用到全局** | 写全局配置 **+** 立即把当前对话也切过去 | 现在和未来，都归你管 |
| **仅应用到当前对话** | 只切当前打开的对话，不写配置 | 只改当下，不留后患 |

**热更新**：保存后无需重启 dsh。新会话用新主模型，已运行会话的下一次子代理请求、下一个 goal 回合立即用新配置。

## 兼容性

- 当前代码适配新版 dsh-settings API（`SettingsProvider` / `ctx.settings.installSection`），已在 dsh **0.1.5-rc.2** 上实测通过（插件可正常加载，`/api/model-settings/state` 等端点工作正常）。
- 如果你的 dsh 较旧（`@deepseek-ai/dsh-settings` 仍导出 `settingsNamespace` / `installSettingsSection`），请使用本插件 **0.1.0** 的代码。

## 安装

### 标准安装（推荐）

```bash
# 从 GitHub 安装
dsh plugin --profile web add github:Howthemeaning/dsh-model-settings
```

`dsh plugin` 会把包安装进 profile 并自动把 `dsh-model-settings` 加入 `dsh.profile.bundles` 层（因为本包声明了 `dsh.bundle.patch`）。**重启 dsh** 后生效。

### 卸载

```bash
dsh plugin --profile web remove dsh-model-settings
```

或手动：从 `~/.dsh/profiles/web/cordis.patch.yml` 删除 model-settings 注册块，删除 `~/.dsh/profiles/node_modules/dsh-model-settings`。

## License

MIT —— 本插件因一次真实的余额事故而生，希望它能帮你管住每一笔模型开销。
