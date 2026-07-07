# 综合分析报告

目标：`https://baxigpt.com/`  
方法：Observe → Capture → Rebuild（js-reverse 工作流）  
时间：2026-07-07

## 执行摘要

`baxigpt.com` 是一个自建的 ChatGPT Plus 卡密兑换网关。用户购买 `BX-/PL-/EU-` 卡密后，在网站粘贴 ChatGPT `accessToken`，由后端通过巴西 PIX / 波兰 / 欧洲 BLIK 等通道向上游自动付款，为用户开通 Plus 试用。

站点由 **FastAPI v0.1.0 + nginx** 驱动，前端为内联 HTML/JS。运营方与 **web3chirou.com / chirou.ai**（蔚莱云/未来云）分销体系强关联。技术上最大问题是 **OpenAPI 完全暴露隐藏后台**，以及 **收集用户 JWT token**。

## 架构图

```
┌─────────────┐     卡密      ┌────────────────┐     token     ┌──────────────┐
│  终端用户    │ ──────────→ │  baxigpt.com   │ ───────────→ │  OpenAI API  │
└─────────────┘               │  (FastAPI)     │               └──────────────┘
                              │                │
┌─────────────┐   批发卡密     │  ┌──────────┐  │   PIX 付款
│ web3chirou  │ ────────────→ │  │ 订单系统  │──┼──────────→ 上游 PIX 出码
│  等卡商      │               │  └──────────┘  │
└─────────────┘               │  ┌──────────┐  │
                              │  │ 卡密系统  │  │ ← /bx-admin-*
┌─────────────┐   API 调用    │  └──────────┘  │
│ AUTO-REGGPT │ ────────────→ └────────────────┘
│ reg-factory │
└─────────────┘
```

## 逆向过程

### 1. Observe（页面观察）

- 抓取首页 `evidence/snapshots/homepage.html`（19KB 单文件）
- 提取 4 个 `fetch()` 端点：`/api/code-info`, `/api/submit`, `/api/status`, `/api/query`
- 识别卡密前缀 `BX-/PL-/EU-` 与 PIX 上游文案

### 2. Capture（接口取证）

- 探测空请求与伪造参数，收集错误消息
- 发现 FastAPI 特征响应 `{"detail":"Not Found"}`
- 拉取 `/openapi.json`，获得完整 15 条路由

### 3. Rebuild（逻辑还原）

- 从用户页 JS 还原开通状态机与轮询逻辑 → `evidence/extracted/homepage.js`
- 从后台 HTML 还原管理功能与数据模型 → `evidence/extracted/admin-panel.js`
- 从 GitHub 恢复第三方客户端 `third-party/plus_baxi.py`

### 4. DeepDive（关联溯源）

- Exa 搜索定位 `web3chirou.com` 商品页引用本域
- GitHub 代码搜索发现 `reg-factory`、`AUTO-REGGPT` 对接实现
- WHOIS / TLS / ScamAdviser 补充基础设施信息

## 用户端业务流程

1. 输入卡密 → `POST /api/code-info`
2. 粘贴 `accessToken` 或 session JSON → `POST /api/submit`
3. 获得 `order_id`，状态 `processing`
4. 每 5 秒 `POST /api/status` 轮询
5. 终态：`paid` 成功；`failed/expired/canceled` 退卡

## 后台业务流程

1. 访问 `/bx-admin-9f3c7a2e1b`
2. `POST /api/admin/login` 密码认证
3. `POST /api/admin/gen` 按通道批量生成卡密
4. 卡密卖给下游卡商或直客
5. `POST /api/admin/orders` 监控 `pix_order_id` 与失败原因

## 数据模型（从 JS 推断）

### 卡密（Code）

```
code, total_quota, used_quota, status, note, created_at, channel
```

### 订单（Order）

```
id, code, email, display_id, pix_order_id, status, created_at, paid_at, error
```

## 关键发现排序

| 优先级 | 发现 |
|--------|------|
| P0 | OpenAPI 暴露隐藏后台与管理 API |
| P0 | 收集 ChatGPT accessToken |
| P1 | 卡密可查询全部关联邮箱 |
| P1 | 后台单密码弱认证 |
| P2 | 类型错误导致 500 |
| P2 | 缺少安全响应头 |

## 关联文件

- 源头：`SOURCE-CHAIN.md`
- 后台：`ADMIN-PANEL.md`
- API：`API-ENDPOINTS.md`
- 风险：`VULNERABILITIES.md`
- 指纹：`INDICATORS.md`
- 原件：`evidence/snapshots/`
- 代码：`third-party/`