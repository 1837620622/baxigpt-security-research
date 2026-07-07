# 漏洞与风险分析

分析方式：被动侦察、公开 API 探测、OpenAPI/前端逆向。未进行密码爆破或未授权渗透。

## 高危

### 1. OpenAPI 暴露全部隐藏路径

- `/openapi.json`、`/docs`、`/redoc` 公网可访问
- 泄露 `/bx-admin-9f3c7a2e1b`、`/apiref-8d3f9a2c7e1b` 及全部 admin API
- 影响：攻击者可完整绘制攻击面

### 2. Access Token 收集（账号接管）

- 用户需提交 ChatGPT `accessToken` 或完整 session JSON
- JWT 在有效期内可代表用户身份操作 OpenAI
- 站点声明「不保存」，但服务端必然在开通过程中使用 token
- 影响：token 泄露 = 账号控制权移交

### 3. 卡密即凭据，导致隐私泄露

- `/api/query` 仅需卡密即可返回：
  - 全部历史订单
  - 关联邮箱
  - 失败原因与时间线
- 影响：卡密转卖/泄露后，他人可枚举用户邮箱

### 4. 管理后台弱认证

- 单密码、无 2FA、无验证码
- 登录接口未见明显限速
- 后台路径已被 OpenAPI 公开
- 影响：暴力破解风险

## 中危

### 5. 输入类型校验不足

```json
{"code": 12345}
```

返回 `HTTP 500 Internal Server Error`（`/api/code-info`）。

### 6. 缺少安全响应头

未见：`Content-Security-Policy`、`Strict-Transport-Security`、`X-Frame-Options` 等。

### 7. Swagger UI 可直接调试

`/docs` 加载 `/openapi.json`，降低攻击者试探成本。

### 8. 限流与封禁可被触发/滥用

文档声明 8 次/秒；深度探测中连续伪造卡密可触发：

```json
HTTP 429
{"ok":false,"msg":"错误次数过多,请稍后再试"}
```

攻击者可对目标 IP 灌垃圾请求造成临时封禁（轻量 DoS）。

## 低危 / 信息泄露

- `Server: nginx/1.24.0 (Ubuntu)`
- `/healthz` 暴露存活状态
- 合伙人 API 文档 `/apiref-8d3f9a2c7e1b` 公开
- 后台下载文件名 `baxi_codes.txt` 可作为同类站点指纹
- 订单字段 `pix_order_id` 暴露上游 PIX 集成细节

## 业务/合规风险（非 CVE，但影响用户）

| 风险 | 说明 |
|------|------|
| 违反 OpenAI ToS | 代充、token 代操作、跨境支付套利 |
| 试用资格薅羊毛 | 仅支持有免费试用资格的新号 |
| 新站跑路风险 | 域名注册仅约 1 个月 |
| 无质保 | 分销商明示无售后 |
| Team Token 禁用 | 商品页警告不要用 Team 空间 token |

## 修复建议（给运营方）


1. 关闭公网 `/openapi.json`、`/docs`、`/redoc`
2. 管理后台增加 2FA、登录限速、IP 白名单
3. `/api/query` 增加二次校验，避免仅凭卡密枚举邮箱
4. 强制 HSTS + CSP + 安全响应头
5. 修复类型错误导致的 500
6. 不要要求用户提交长期有效的 accessToken；改用 OAuth 最小权限或官方合法渠道