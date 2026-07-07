# 后台逆向

## 入口

```
https://baxigpt.com/bx-admin-9f3c7a2e1b
https://baxigpt.com/bx-admin-9f3c7a2e1b/
```

原件：`evidence/snapshots/admin-panel.html`  
提取 JS：`evidence/extracted/admin-panel.js`

> 该路径虽看似隐藏，但已完整列在 `evidence/snapshots/openapi.json` 中。

## 登录

### UI

- 单字段密码框 `#pw`
- 回车或点击「登录」触发 `login()`

### API

```
POST /api/admin/login
Content-Type: application/json

{"password": "<admin_password>"}
```

响应：

| 情况 | 响应 |
|------|------|
| 成功 | `{"ok": true}` + 设置 Session Cookie |
| 失败 | `401 {"ok":false,"msg":"密码错误"}` |

### 会话保持

页面加载时自动调用：

```javascript
api('/api/admin/stats').then(d => {
  if (d.ok) { /* 直接进入后台 */ }
});
```

未登录访问管理 API 返回：

- `401 {"ok":false}`
- 或 `401 {"ok":false,"msg":"未登录"}`

## 功能模块

### 1. 统计面板

```
POST /api/admin/stats
```

返回结构（由 JS 还原）：

```json
{
  "ok": true,
  "codes": {"c": 100, "uq": 30, "tq": 100},
  "orders": [{"status": "paid", "c": 25}, {"status": "processing", "c": 2}]
}
```

### 2. 生成卡密

```
POST /api/admin/gen
```

请求：

```json
{
  "count": 10,
  "quota": 1,
  "note": "可选备注",
  "channel": "pix"
}
```

`channel` 枚举：

| 值 | 含义 | 卡密前缀 |
|----|------|----------|
| `pix` | PIX 巴西 | `BX-` |
| `pl` | PL 大厅 | `PL-` |
| `eu` | EU 代开 BLIK | `EU-` |

成功返回 `codes: ["BX-...", ...]`。前端下载文件名固定为 **`baxi_codes.txt`**。

### 3. 卡密列表

```
POST /api/admin/codes
{"kw": "搜索词"}
```

字段：

| 字段 | 说明 |
|------|------|
| `code` | 卡密 |
| `total_quota` | 总次数 |
| `used_quota` | 已用次数 |
| `status` | `active` / `disabled` |
| `note` | 备注 |
| `created_at` | 创建时间 |

操作：

```
POST /api/admin/code-action
{"code": "BX-XXX", "action": "disable|enable|delete"}
```

### 4. 订单列表

```
POST /api/admin/orders
```

字段：

| 字段 | 说明 |
|------|------|
| `id` | 自增 ID |
| `code` | 使用的卡密 |
| `email` | 从 token 解析的邮箱 |
| `display_id` | 展示订单号，如 `PAY-68A850E9` |
| `pix_order_id` | 上游 PIX 订单号 |
| `status` | 见状态机 |
| `created_at` | 创建时间 |
| `paid_at` | 付款时间 |
| `error` | 失败原因 |

订单状态标签 CSS 类：`paid`, `processing`, `failed`, `expired`, `refunded`, `superseded`

## 安全观察

- 无用户名，仅密码
- 未见 CAPTCHA / 2FA / 登录限速
- 所有管理接口仅依赖 Cookie，无额外 CSRF Token
- OpenAPI 公开暴露全部管理路径