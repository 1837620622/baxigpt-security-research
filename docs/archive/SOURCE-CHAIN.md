# 源头与分销链路

## 1. 站点本体

| 字段 | 值 |
|------|-----|
| 域名 | `baxigpt.com` / `www.baxigpt.com` |
| 注册商 | 阿里云万网 (HiChina) |
| 注册地 | 中国福建 |
| 注册时间 | 2026-06-01 |
| 到期时间 | 2027-06-01 |
| TLS | Let's Encrypt，到期 2026-08-30 |
| 对外 IP（第三方记录） | `23.148.180.26` |
| 服务标识 | `nginx/1.24.0 (Ubuntu)` |
| 后端 | FastAPI `v0.1.0` |

## 2. 名称含义

- **baxi** = 巴西
- 卡密前缀与支付通道：
  - `BX-` → PIX 巴西
  - `PL-` → PL 大厅
  - `EU-` → EU 代开 BLIK

## 3. 商业模式

```
OpenAI Plus 官方订阅
    ↑ 使用用户 accessToken 代操作
baxigpt.com 兑换网关（本站点）
    ↑ 批发卡密
卡商平台（web3chirou.com 等）
    ↑ 人民币购买
终端用户
```

套利逻辑：用巴西 PIX / 欧洲 BLIK 等低成本本币通道为 OpenAI 代付，再向国内用户出售人民币卡密。

## 4. 已确认分销渠道

### web3chirou.com（蔚莱云 / 未来云 AI 出海工作室）

- 商品描述写明兑换地址：`https://baxigpt.com/`
- 渠道标注：**巴西 Pix 渠道**
- 限制：仅支持有试用资格的新号；无质保
- 客服：
  - Telegram：`@web3_chirou`
  - 微信：`oxalin_13`

### chirou.ai

- 教程站：`https://chirou.ai/usage-docs-current.html`
- 运营主体描述：未来云 AI 出海工作室
- 关联发卡网：`web3chirou.com`

## 5. 技术生态中的 API 消费者

| 项目 | 文件 | 状态 |
|------|------|------|
| `tiantianGPU/reg-factory` | `common/plus_baxi.py`, `activate_plus.py` | 2026-06-25 删除 |
| `ryugadev/AUTO-REGGPT` | `web/manager.py` Auto CDK 流程 | 仍在使用 |

恢复后的客户端见 `recovered-code/`。

## 6. 上游支付线索

后台订单表字段 `pix_order_id` 表明后端存在独立的 PIX 出码/付款子系统：

```
用户 token
  → baxigpt 后端创建订单
  → 上游生成 PIX 付款码（pix_order_id）
  → 自动付款
  → OpenAI 订阅状态变为 Plus
```

英文文案 `"upstream is paying"`、失败提示 `"PIX code generation failed"` 进一步佐证该链路。

## 7. 源头判断

| 问题 | 结论 |
|------|------|
| 谁运营？ | 中国团队（福建注册域名），与蔚莱云/未来云生态强关联 |
| 是否官方？ | 否，非 OpenAI 合作方 |
| 是否开源？ | 否，但 API 被 OpenAPI 与合伙人文档公开 |
| 是否白标？ | 否，自研单体服务，v0.1.0 |