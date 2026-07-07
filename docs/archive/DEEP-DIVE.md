# 深度逆向报告（第二轮）

方法：路径模糊测试、源码泄露扫描、HTTP 方法矩阵、鉴权绕过尝试、请求体模糊测试、速率限制触发、GitHub 生态代码交叉验证、FastAPI operationId 还原。

## 1. 后端技术指纹（加强版）

### FastAPI 单文件/单模块特征

从 `operationId` 可还原 Python 处理函数命名：

| 路由 | operationId | 推断函数 |
|------|-------------|----------|
| `/api/code-info` | `api_code_info_api_code_info_post` | `api_code_info()` |
| `/api/submit` | `api_submit_api_submit_post` | `api_submit()` |
| `/api/admin/login` | `admin_login_api_admin_login_post` | `admin_login()` |
| `/` | `home__get` | `home()` |

模式：无路由分层版本号，无 `/v1`，典型 **小型 FastAPI 单文件或单 router 项目**。

### 数据库指纹

API 文档示例：

```json
"order_id": "68a850e9...",
"display_id": "PAY-68A850E9"
```

推断：

- `order_id` = **24 位十六进制** → 高度疑似 **MongoDB ObjectId**
- `display_id` = `PAY-` + `order_id` 前 8 位大写
- 后台订单表 `id` 为自增整数（admin JS 里 `+r.id`），与 `order_id` 分离

结论：可能是 **MongoDB 存订单 + SQLite/MySQL 存卡密**，或全部 SQLite 但 `order_id` 仿 ObjectId 格式。更倾向 MongoDB/文档库。

### 订单超时

文档样例：`expires_at - server_now = 57000` 秒（约 15.8 小时）。

前端倒计时 `fmtLeft()` 用秒级差显示 `MM:SS`，说明真实 processing 订单的 TTL 可能是 **分钟级**；文档样例数字未必反映生产值。

---

## 2. 隐藏路径模糊测试

基于已知 hash 模式穷举：

```
hash 集: 8d3f9a2c7e1b, 9f3c7a2e1b
prefix: bx-admin, apiref, api-admin, admin, panel, manage, internal, debug, test
```

**仅发现 4 个 200 响应（无新路径）：**

| 路径 | 大小 |
|------|------|
| `/bx-admin-9f3c7a2e1b` | 9593 B |
| `/bx-admin-9f3c7a2e1b/` | 9593 B |
| `/apiref-8d3f9a2c7e1b` | 6395 B |
| `/apiref-8d3f9a2c7e1b/` | 6395 B |

hash 长度不一致（10 vs 12 位 hex），说明是 **人工随机字符串**，不是统一算法生成。

---

## 3. 源码/配置泄露扫描

对以下路径探测均为 **404/403/405**（无泄露）：

```
.git/HEAD  .env  .env.bak  backup.zip
app.db  data.db  baxigpt.db  sqlite.db
requirements.txt  pyproject.toml  main.py  config.py
docker-compose.yml  nginx.conf  server-status
```

---

## 4. HTTP 方法矩阵

所有 `/api/*` 仅允许 **POST**（`Allow: POST`）。

| 端点 | GET | POST | 其他 |
|------|-----|------|------|
| `/api/code-info` | 405 | ✅ | 405 |
| `/api/submit` | 405 | ✅ | 405 |
| `/healthz` | ✅ | 405 | 405 |
| `/openapi.json` | ✅ | 405 | HEAD ✅ |

无 RESTful 越权读取面（不能用 GET 拉订单）。

---

## 5. 鉴权机制深度分析

### 管理后台

测试以下方式访问 `/api/admin/stats`，均 **401**：

- `Cookie: admin=1`
- `Cookie: session=admin`
- `Cookie: baxigpt_admin=1`
- `Authorization: Bearer x`
- `X-Admin-Token: x`

登录接口字段探测：

| 请求体 | 响应 |
|--------|------|
| `{"password":"x"}` | `401 密码错误` |
| `{"pwd":"x"}` | `401 密码错误` |
| `{"username":"admin","password":"x"}` | `401 密码错误` |

说明：

- 只认 `password` 字段（或无字段时当作空密码）
- 空请求 `{}` 也返回 `密码错误`，无独立「请输入密码」校验
- 成功登录应通过 **HttpOnly Cookie** 维持（失败响应无 Set-Cookie）

### 公开 API

- 无 API Key
- 卡密 `code` 即凭据
- 合伙人文档明确写给「自有系统对接」

---

## 6. `/api/submit` 解析顺序（运行时推断）

| 测试输入 | 响应 |
|----------|------|
| `at=""` | `没识别到有效的 access token` |
| `at="eyJ..."`（假 JWT） | `卡密不存在` |
| `at=session JSON` | `卡密不存在` |

**推断执行顺序：**

```
1. 解析 at（空/短/非 JWT/非 JSON → 立即失败）
2. 校验 code 是否存在、可用
3. 调 OpenAI 检查账号资格
4. 创建订单 + 走上游 PIX
```

这解释为何空 token 不会走到卡密校验。

---

## 7. 速率限制与封禁（实测触发）

官方文档：

> `/api/submit` 2次/秒；其余 `/api/*` 8次/秒；错误刷取有失败惩罚

实测：

- 连续伪造卡密查询后返回：

```json
HTTP 429
{"ok":false,"msg":"错误次数过多,请稍后再试"}
```

- 畸形 JSON（重复键、invalid json）也可加速触发 429
- 畸形 JSON 通常先 **500 Internal Server Error**

**攻击面**：攻击者可对某 IP 故意制造 429 拒绝服务；也可扫描卡密直到被封。

---

## 8. 输入校验缺陷汇总

| 输入 | 端点 | 结果 |
|------|------|------|
| `{"code": 12345}` | code-info | **500** |
| `{bad` | code-info | **500** |
| `[]` | code-info | **500** |
| `code=BX` (form) | code-info | **500** |
| 重复 JSON 键 | code-info | **429** |

缺少严格 schema 校验（未见 Pydantic 错误格式，直接 500）。

---

## 9. 上游 OpenAI 交互（间接还原）

`ryugadev/AUTO-REGGPT` 在 baxigpt 回报 `paid` 后，会二次验证：

```python
# check_subscription(access_token)
# → 等价于 ChatGPT backend-api accounts/check
plan_str = "..."

# JWT 邮箱提取（与 baxigpt 相同思路）
payload["https://api.openai.com/profile"]["email"]
```

推断 baxigpt 后端至少调用：

1. 解析 JWT payload 取 `https://api.openai.com/profile.email`
2. 调 OpenAI 内部 API 检查 trial/plan 状态
3. 不满足则拒绝并退卡密

第三方项目还记录了 baxigpt **误报 paid** 的情况，说明上游 PIX 回调与 OpenAI 状态存在 **竞态/不同步**。

---

## 10. 卡密格式观察

| 输入 | 响应 |
|------|------|
| `BX` / `BX-` / `BX-1` | `卡密不存在` |
| `XX-TEST` | 存在则 404 消息；刷多后 429 |
| `bx-test`（小写） | `卡密不存在`（客户端会 toUpperCase，服务端似乎 case-sensitive 或仅匹配大写） |

卡密生成逻辑（后台）：按 `channel` 生成前缀 `BX-/PL-/EU-` + 随机体。

---

## 11. 生态代码交叉验证

### tiantianGPU/reg-factory（已移除模块）

2026-06-25 删除 `plus_baxi.py`，改用 `oauth_codex.py` 走正规 refresh_token 路线。

说明 baxigpt 在 **批量注册灰产** 里曾是标准 Plus 开通通道，但因不可靠被废弃。

### ryugadev/AUTO-REGGPT（仍在用）

完整 Auto CDK 流程：

```
浏览器登录 ChatGPT → 取 accessToken
→ POST baxigpt /api/code-info
→ POST /api/submit
→ 轮询 /api/status（每 5s，最多 180s）
→ 交叉验证 ChatGPT plan
```

见 `recovered-code/` 与 GitHub `web/manager.py`。

---

## 12. 新发现漏洞

| 严重度 | 发现 |
|--------|------|
| 高 | 429 封禁可被滥用为 IP DoS |
| 高 | 畸形输入致 500，暴露后端异常处理粗糙 |
| 中 | `submit` 空 token 与无效 token 错误分支可探测服务逻辑 |
| 中 | 卡密枚举 + 429 惩罚可指纹化「有效/无效」卡密（时序侧信道需进一步验证） |
| 低 | 所有 API 仅 POST，降低但未消除自动化滥用 |

---

## 13. 后续可继续方向

1. 用合法测试卡密观察完整 `submit → status` 状态流转（需授权）
2. 对 `pix_order_id` 格式做统计学分析判断上游 PIX 平台
3. 监控 `openapi.json` 版本变更
4. 在 GitHub/telegram 持续搜 `PAY-` + `baxigpt` 新部署
5. 比对 `web3chirou.com` 商品 API（需绕过 Cloudflare）