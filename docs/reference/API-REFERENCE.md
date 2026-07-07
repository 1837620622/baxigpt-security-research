# API 接口说明

Base URL：`https://baxigpt.com`

通用格式：

- 请求：`Content-Type: application/json`
- 成功：`{"ok": true, ...}`
- 失败：`{"ok": false, "msg": "中文原因"}`

完整路由清单见 `evidence/extracted/endpoints.txt` 与 `evidence/snapshots/openapi.json`。

## 公开接口

### POST /api/code-info

验证卡密余额。

```json
// 请求
{"code": "BX-XXXXXXXX"}

// 成功
{"ok": true, "remaining": 8, "total": 10}

// 失败 msg
// 卡密不存在 | 卡密已停用 | 卡密配额已用完 | 请输入卡密
```

### POST /api/submit

提交开通（核心）。

```json
// 请求
{
  "code": "BX-XXXXXXXX",
  "at": "eyJhbGciOi..."
}

// at 支持：
// 1. 裸 accessToken (JWT)
// 2. 完整 chatgpt.com/api/auth/session JSON（自动提取 accessToken）

// 成功
{
  "ok": true,
  "order_id": "68a850e9...",
  "display_id": "PAY-68A850E9",
  "email": "user@example.com",
  "status": "processing",
  "expires_at": 1780600000,
  "server_now": 1780543000
}
```

常见失败 `msg`：

| msg | 含义 |
|-----|------|
| 该账号已经是 Plus 了,无需开通 | 已是 Plus |
| 该账号没有免费试用资格 | 不符合试用条件 |
| access token 已失效,请重新登录 | token 过期 |
| access token 无效或已过期 | token 无效 |
| 出码失败 | PIX 付款码生成失败 |
| 卡密不存在 | 卡密无效 |
| 没识别到有效的 access token | 输入格式错误 |

配额规则：

- 成功下单才扣 1 次
- `failed` / `expired` / `canceled` 自动退卡密
- 相同 `code + at` 重复提交复用同一订单

### POST /api/status

查询单个订单。

```json
// 请求（二选一）
{"order_id": "68a850e9..."}
{"at": "eyJhbGciOi..."}

// 成功
{
  "ok": true,
  "status": "paid",
  "display_id": "PAY-68A850E9",
  "order_id": "68a850e9...",
  "email": "user@example.com",
  "expires_at": 1780600000,
  "server_now": 1780543000
}
```

状态枚举：

| status | 含义 | 卡密 |
|--------|------|------|
| `processing` | 上游付款中 | 已扣，待结果 |
| `paid` | 开通成功 | 已消耗 |
| `failed` | 出码/付款失败 | 已退回 |
| `expired` | 订单超时 | 已退回 |
| `canceled` | 上游取消 | 已退回 |
| `superseded` | 被新单覆盖 | — |

建议轮询：每 20–30 秒；用户页前端为 5 秒。

### POST /api/query

按卡密查询全部订单与余额。

```json
// 请求
{"code": "BX-XXXXXXXX"}

// 成功
{
  "ok": true,
  "remaining": 7,
  "total": 10,
  "used": 3,
  "status_code": "active",
  "orders": [
    {
      "display_id": "PAY-68A850E9",
      "email": "user@example.com",
      "status": "paid",
      "created_at": "2026-06-04 03:09",
      "paid_at": "2026-06-04 03:18",
      "error": null
    }
  ]
}
```

### GET /healthz

```json
{"ok": true}
```

## 管理接口（需 Cookie 登录）

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/admin/login` | 密码登录 |
| POST | `/api/admin/gen` | 生成卡密 |
| POST | `/api/admin/codes` | 卡密列表 |
| POST | `/api/admin/orders` | 订单列表 |
| POST | `/api/admin/stats` | 统计数据 |
| POST | `/api/admin/code-action` | 停用/启用/删除卡密 |

详见 `ADMIN-PANEL.md`。

## 限流（来自官方 API 文档页）

| 路径 | 限制 |
|------|------|
| `/api/submit` | 2 次/秒/IP |
| 其他 `/api/*` | 8 次/秒/IP |
| 错误刷取 | 存在失败惩罚，可能临时封 IP |

## 第三方调用示例

见 `third-party/plus_baxi.py`。