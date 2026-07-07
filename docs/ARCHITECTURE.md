# 后端逻辑还原（伪代码）

基于：公开 API 文档、前端 JS、错误消息时序、第三方客户端、OpenAPI operationId。

> 这是 **逻辑重建**，不是反编译源码。

## 总体架构

```
nginx (TLS termination, rate limit?)
  └── uvicorn / FastAPI app "baxigpt" v0.1.0
        ├── Static HTML routes (/, /bx-admin-*, /apiref-*)
        ├── Public JSON API (/api/code-info|submit|status|query)
        ├── Admin JSON API (/api/admin/*) + cookie session middleware
        ├── SQLite or SQL db (codes, orders meta)  [推断]
        ├── MongoDB or doc store (orders)          [推断]
        └── Upstream PIX service (pix_order_id)
              └── OpenAI subscription API (via user accessToken)
```

## 数据模型（推断）

### codes 表

```python
class Code:
    code: str              # BX-XXXXXXXX 主键
    channel: str           # pix | pl | eu
    total_quota: int
    used_quota: int
    status: str            # active | disabled
    note: str | None
    created_at: datetime
```

### orders 表

```python
class Order:
    id: int                # 后台自增
    order_id: str          # 24-hex ObjectId-like
    display_id: str        # PAY-{order_id[:8].upper()}
    code: str              # FK → codes.code
    email: str | None      # 从 JWT 解析
    status: str            # processing|paid|failed|expired|canceled|superseded|refunded
    pix_order_id: str | None
    error: str | None
    created_at: datetime
    paid_at: datetime | None
    expires_at: int        # unix
    access_token_hash: str | None  # 可能仅存 hash 或指纹（未证实）
```

## 核心：api_submit

```python
async def api_submit(body: dict, client_ip: str):
    if rate_limited(client_ip, key="submit"):
        return err(429, "错误次数过多,请稍后再试")

    at_raw = (body.get("at") or "").strip()
    token = parse_access_token(at_raw)
    # parse_access_token:
    #   - if startswith('{': json.loads → accessToken/access_token
    #   - elif startswith('eyJ') and len>=30: use as-is
    #   - else: return None

    if not token:
        return err("没识别到有效的 access token(...)")

    code = normalize_code(body.get("code"))
    if not code:
        return err("请输入卡密")

    card = db.get_code(code)
    if not card:
        return err("卡密不存在")
    if card.status == "disabled":
        return err("卡密已停用")
    if card.remaining <= 0:
        return err("卡密配额已用完")

    # 幂等：同 code + token 指纹 → 返回已有 processing 订单
    existing = db.find_order(code=code, token=token)
    if existing:
        return ok(existing.to_public())

    email = jwt_payload(token).get("https://api.openai.com/profile", {}).get("email")

    eligibility = await openai_check_trial(token)
    if eligibility.already_plus:
        return err("该账号已经是 Plus 了,无需开通 ✅")
    if not eligibility.has_trial:
        return err("该账号没有免费试用资格…")

    # 扣配额（或下单后扣 — 文档说成功下单才扣）
    order = db.create_order(code, email, status="processing")

    try:
        pix = await upstream_create_pix_payment(token, channel=card.channel)
        order.pix_order_id = pix.id
        db.save(order)
    except UpstreamError:
        db.refund_quota(card)
        order.status = "failed"
        order.error = "出码失败"
        db.save(order)
        return err("出码失败")

    asyncio.create_task(poll_pix_and_activate(order.id))

    return ok({
        "order_id": order.order_id,
        "display_id": order.display_id,
        "email": email,
        "status": "processing",
        "expires_at": order.expires_at,
        "server_now": now(),
    })
```

## 后台轮询任务（推断）

```python
async def poll_pix_and_activate(order_id):
    while not expired(order):
        status = await upstream_poll_pix(order.pix_order_id)
        if status == "paid":
            await openai_confirm_subscription(order.token)
            order.status = "paid"
            order.paid_at = now()
            db.finalize_quota(order.code)
            return
        if status in ("failed", "canceled"):
            order.status = status
            db.refund_quota(order.code)
            return
        await sleep(5)

    order.status = "expired"
    db.refund_quota(order.code)
```

## admin_login

```python
async def admin_login(body: dict, response: Response):
    pw = body.get("password") or ""
    if not secrets.compare_digest(pw, SETTINGS.ADMIN_PASSWORD):
        return JSONResponse({"ok": False, "msg": "密码错误"}, status_code=401)

    session = create_session()
    response.set_cookie(
        key="???",              # 名称未在失败响应中暴露
        value=session.token,
        httponly=True,
        secure=True,
        samesite="lax",
    )
    return {"ok": True}
```

## admin_gen

```python
async def admin_gen(body: dict, admin: AdminUser):
    channel = body.get("channel", "pix")
    prefix = {"pix": "BX-", "pl": "PL-", "eu": "EU-"}[channel]
    codes = []
    for _ in range(int(body.get("count", 1))):
        code = prefix + random_code_body()
        db.insert_code(code, quota=body.get("quota", 1), note=body.get("note"), channel=channel)
        codes.append(code)
    return {"ok": True, "codes": codes}
```

## 速率限制（推断）

```python
# IP 维度滑动窗口
# submit: 2 req/s
# other /api/*: 8 req/s
# 失败惩罚：某段时间内大量「卡密不存在」→ 429 错误次数过多
```

## 与前端差异

| 项目 | 用户页 | API 文档 |
|------|--------|----------|
| status 轮询间隔 | 5 秒 | 建议 20–30 秒 |
| 失败英文 | PIX code generation failed | 出码失败 |

说明前后端由同一人维护，但用户页更激进轮询。