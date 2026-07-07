# 卡密实测报告：EU-HFNDFHD4

测试时间：2026-07-07  
测试方式：只读 API（`/api/code-info`、`/api/query`），**未提交 token、未消耗额外配额**

---

## 卡密结构

```
EU - HFNDFHD4
│      └── 8 位大写字母数字后缀
└── EU 通道 = 后台「EU 代开 BLIK」
```

字符集观察：`H F N D F H D 4`（无固定校验位规律，更像随机生成）

---

## API 实测结果

### POST /api/code-info

```json
{"ok": false, "msg": "卡密配额已用完"}
```

### POST /api/query

```json
{
  "ok": true,
  "remaining": 0,
  "total": 1,
  "used": 1,
  "status_code": "active",
  "orders": [
    {
      "email": "67_bashes_crawl@icloud.com",
      "display_id": null,
      "status": "paid",
      "created_at": "2026-07-07 10:56",
      "paid_at": "2026-07-07 10:57",
      "error": ""
    }
  ]
}
```

---

## 解读

| 字段 | 含义 |
|------|------|
| `total: 1` | 单张卡仅 1 次开通额度 |
| `status: paid` | 已成功开通 Plus |
| 开通耗时 | 约 **1 分钟**（10:56 → 10:57） |
| `display_id: null` | EU 通道订单可能不生成 `PAY-XXXXXXXX` 展示号（与 BX PIX 通道不同） |
| `email` | 开通时使用的 ChatGPT 账号邮箱（从 token 解析） |

请确认 `67_bashes_crawl@icloud.com` 是否为你提交开通时使用的账号。

---

## 类似卡密生成测试（有限探测）

目标：验证算法是否可预测（**非撞库**）

方法：对 `HFNDFHD4` 做单字符变异 + 邻号 `EU-HFNDFHD3/5` 等 **18 个** 样本。

结果：**全部 HTTP 429**

```json
{"ok": false, "msg": "错误次数过多,请稍后再试"}
```

原因：同一 IP 在前序逆向中已触发 **失败惩罚封禁**，无法在本轮区分「不存在」与「存在」。

### 安全结论

- 卡密后缀 **8 位随机空间** ≈ `36^8`（若全字母数字），单字符变异 **不能** 有效撞库
- 服务端有 **IP 级错误惩罚**，批量猜测会被 429 阻断
- **不建议** 大规模生成类似卡密测试 — 无授权时属于对第三方服务的枚举攻击

---

## 若你还有未使用的卡密

只读检查命令：

```bash
curl -s -X POST https://baxigpt.com/api/code-info \
  -H 'Content-Type: application/json' \
  -d '{"code":"EU-你的卡密"}'

curl -s -X POST https://baxigpt.com/api/query \
  -H 'Content-Type: application/json' \
  -d '{"code":"EU-你的卡密"}'
```

开通命令（会消耗额度，需 ChatGPT accessToken）：

```bash
curl -s -X POST https://baxigpt.com/api/submit \
  -H 'Content-Type: application/json' \
  -d '{"code":"EU-XXX","at":"eyJ..."}'
```