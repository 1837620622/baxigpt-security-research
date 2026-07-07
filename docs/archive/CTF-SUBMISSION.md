# CTF 漏洞提交报告 — baxigpt.com

**测试时间**：2026-07-07  
**测试范围**：`https://baxigpt.com` 全站 API + 隐藏后台  
**测试轮次**：Round 1–8（含全量逆向 + 6 项攻击链）  
**授权声明**：官方靶场授权测试

---

## 执行摘要

| 项目 | 结论 |
|------|------|
| 后台突破 | ❌ 900+ 口令、30+ 绕过向量均失败 |
| 可提交漏洞 | ✅ 4 项 HIGH + 2 项 MEDIUM |
| Flag 路径 | 卡密枚举 + `/api/query` 泄露链（需有效卡密） |
| 第二部署 | ❌ 未发现同指纹公开实例 |

---

## 漏洞清单（按严重度）

### [HIGH-1] 限流绕过 — 信任 X-Forwarded-For

**描述**：服务端按 `X-Forwarded-For` / `X-Real-IP` 计数，攻击者可每请求伪造 IP 绕过 429 封禁。

**PoC**：
```bash
curl -s https://baxigpt.com/api/code-info \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 1.2.3.4" \
  -d '{"code":"EU-TEST000"}'
# 轮换 IP 可无限探测
```

**影响**：卡密暴力枚举、公开 API 滥用、轻量 DoS。

**修复**：仅信任 nginx 设置的 `$remote_addr`，忽略客户端 XFF。

---

### [HIGH-2] BOLA — /api/query 仅凭卡密泄露隐私

**描述**：无需 accessToken，仅凭卡密返回全部历史订单、邮箱、失败原因。

**PoC**：
```bash
curl -s https://baxigpt.com/api/query \
  -H "Content-Type: application/json" \
  -d '{"code":"EU-HFNDFHD4"}'
```

**响应（实测）**：
```json
{
  "ok": true,
  "orders": [{
    "email": "67_bashes_crawl@icloud.com",
    "status": "paid",
    "created_at": "2026-07-07 10:56",
    "paid_at": "2026-07-07 10:57"
  }]
}
```

**影响**：卡密转卖/泄露 → 用户邮箱与订单时间线暴露。附加字段 `admin:true` **被忽略**，无法提权。

**修复**：query 需二次验证（邮箱验证码 / 订单 PIN / 仅返回脱敏信息）。

---

### [HIGH-3] OpenAPI 完全暴露管理接口

**描述**：`/openapi.json`、`/docs`、`/redoc` 公网可读，泄露全部 15 条路由含 admin API。

**PoC**：`GET https://baxigpt.com/openapi.json`

**影响**：隐藏路径 `bx-admin-9f3c7a2e1b` 形同虚设；降低攻击成本。

**修复**：生产环境关闭文档端点；admin 路由移出 OpenAPI schema。

---

### [HIGH-4] 管理登录无速率限制

**描述**：连续 900+ 次错误密码仍返回 `401 密码错误`，无锁定/验证码/CAPTCHA。

**对比**：公开 API 在大量失败后可触发 `429 错误次数过多`。

**修复**：admin/login 独立限速（如 5 次/分钟/IP）+ 指数退避。

---

### [MEDIUM-1] 类型混淆导致 HTTP 500

**描述**：FastAPI 无严格 schema，非字符串 `code`/`at` 触发未捕获异常。

**PoC（Round 8，36 payload）**：
| 端点 | Payload | 结果 |
|------|---------|------|
| `/api/query` | `{"code":{"$gt":""}}` | 500 |
| `/api/submit` | `{"at": true}` | 500 |
| `/api/code-info` | `{"code": true}` | 500 |
| `/api/admin/login` | form-urlencoded | 500 |

**影响**：信息泄露风险（当前仅 generic `Internal Server Error`，无 traceback）。

**修复**：Pydantic 模型严格校验；全局异常处理器。

---

### [MEDIUM-2] 缺少安全响应头

**描述**：响应无 `Strict-Transport-Security`、`Content-Security-Policy`、`X-Frame-Options`。

**修复**：nginx/FastAPI 中间件添加标准安全头。

---

## Round 8 攻击链执行结果

### 1. 大规模卡密枚举 ✅ 已执行

| 指标 | 数值 |
|------|------|
| 探测总量 | **384**（三通道 EU/BX/PL） |
| 模式词 | FLAG/CTF/TEST/ADMIN/BAXIGPT 等 |
| 随机样本 | 360 张 |
| 有效卡密 | **1**（已知 `EU-HFNDFHD4`，已耗尽） |
| 新卡密 | **0** |

→ CTF flag 不在 obvious 模式卡密中；需赛题附件给卡密或更大规模随机枚举。

### 2. order_id 时间戳 IDOR ✅ 已执行

| 指标 | 数值 |
|------|------|
| 时间窗口 | `EU-HFNDFHD4` 付费时刻 ±10 分钟 |
| 探测 ObjectId | **482** |
| 命中 | **0** |

→ MongoDB ObjectId 后 8 字节（machine+pid+counter）不可预测，纯时间戳扫描无效。

### 3. 500 深度 Fuzz ✅ 已执行

| 指标 | 数值 |
|------|------|
| Payload 数 | **36** |
| HTTP 500 | **18** |
| Stack trace 泄露 | **0** |
| 新绕过 | **0** |

### 4. 同指纹狩猎 ✅ 已执行

| 目标 | 结果 |
|------|------|
| GitHub `baxi_codes.txt` / `bx-admin-*` | 需 auth，无公开命中 |
| crt.sh 子域 | 仅 baxigpt.com + www |
| chirou.ai | 发卡网，无 baxigpt API 指纹 |
| web3chirou.com | 403 Forbidden |
| 第二套 bx-admin 部署 | **未发现** |

### 5. 后台全量测试 ✅ Round 1–7 已完成

- 弱口令 900+、BFLA、SQLi/NoSQLi、Header/Cookie 伪造 → 全失败
- nginx CVE、子域 vhost、请求走私 → 不适用

---

## 证据文件索引

| 文件 | 内容 |
|------|------|
| `evidence/probes/round8/round8-cards.json` | 卡密枚举结果 |
| `evidence/probes/round8/round8-idor.json` | ObjectId IDOR |
| `evidence/probes/round8/round8-fuzz.json` | 500 fuzz 全量 |
| `evidence/probes/round8/round8-fingerprint.json` | 同指纹探测 |
| `evidence/probes/round7/round7-full.json` | DNS/绕过/口令 |
| `MASTER-REVERSE-ANALYSIS.md` | 全量逆向 |
| `exploits/ip_bypass_enum.py` | 可复现 PoC 脚本 |

---

## 建议裁判关注点

1. **可立即得分**：HIGH-1 ~ HIGH-4 均有稳定 PoC，无需后台权限
2. **Flag 可能在**：有效卡密的 `/api/query` 订单备注 / 特定 CTF 卡密后缀
3. **非预期解**：后台弱口令（已证伪）、nginx RCE（已证伪）、子域隐藏站（已证伪）

---

## 修复优先级（给运营方）

1. 关闭公网 OpenAPI/docs
2. 修复 XFF 信任 → 限流失效
3. `/api/query` 加二次校验
4. admin 登录限速 + 2FA
5. Pydantic 校验消除 500
6. 添加安全响应头