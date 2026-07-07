# 运营方溯源与联系方式

调研时间：2026-07-07

## 结论先说

**baxigpt.com 页面上没有任何客服/联系方式。**  
无法从公开信息定位到「真实姓名/身份证级」自然人，只能定位到 **发卡商生态 + 社交账号矩阵**。

域名注册信息被阿里云 WHOIS 隐私保护，仅知：**中国福建**。

---

## 1. baxigpt.com 本体

| 项目 | 信息 |
|------|------|
| 站内客服 | **无**（首页/后台/API 文档均无 TG/微信/邮箱） |
| 域名注册商 | 阿里云万网 |
| 注册地 | 福建 (`fu jian`) |
| 注册人邮箱 | 隐私保护 → 需通过 https://whois.aliyun.com/whois/whoisForm 申诉查询 |
| 站点性质 | 卡密兑换网关，面向持卡用户和「合伙人 API 对接」 |

**推断**：baxigpt 是 **B 端兑换系统**，C 端售后走发卡网，不在本域做客服。

---

## 2. 已确认关联商业主体（发卡方）

### 蔚莱云 / 未来云 AI 出海工作室

| 资产 | URL / 账号 |
|------|------------|
| 发卡网 A | https://web3chirou.com/ |
| 发卡网 B | https://chirou.ai/ （与 A 同模板/同运营） |
| 教程中心 | https://chirou.ai/usage-docs-current.html |
| Telegram 客服 | **@web3_chirou** |
| Telegram 频道 | **@chiroukyc2** |
| 微信客服 | **oxalin_13** |
| Twitter/X | **@chiroukyc** |
| 关联 API 站 | https://www.ai-openclaw.one/ |

Telegram 公开简介（@web3_chirou）：

> 发卡网 chirou.ai · 频道 https://t.me/chiroukyc2 · 推特 https://x.com/chiroukyc

### 与 baxigpt 的硬关联

- 第三方商品页写明兑换地址为 `https://baxigpt.com/`
- 你的卡密 `EU-HFNDFHD4` 为 **EU 通道（BLIK 代开）**，与后台 `channel=eu` 一致
- 卡密由 baxigpt 后台 `/api/admin/gen` 生成，通过发卡网售出

**关系图**：

```
自然人/团队（身份未公开）
  └── 蔚莱云/未来云（chirou 品牌）
        ├── web3chirou.com / chirou.ai  ← 你买卡的地方
        │     客服: TG @web3_chirou / 微信 oxalin_13
        └── baxigpt.com  ← 兑换网关（无客服）
```

---

## 3. 为什么查不到「真实人」

1. **域名 WHOIS 隐私** — 阿里云标准保护，无注册人姓名/手机
2. **站点无 ICP 备案号展示**（首页未检出）
3. **baxigpt 刻意不做 C 端联系入口** — 降低直接被追责表面
4. **发卡网 Cloudflare 保护** — web3chirou 商品 API 403，难进一步挖商户主体

---

## 4. 你能用的联系渠道（按优先级）

| 优先级 | 渠道 | 用途 |
|--------|------|------|
| 1 | Telegram **@web3_chirou** | 买卡售后、EU 通道问题 |
| 2 | 微信 **oxalin_13** | 同上 |
| 3 | Telegram 频道 **@chiroukyc2** | 公告/上新 |
| 4 | Twitter **@chiroukyc** | 公开信息（当前镜像抓取受限） |
| 5 | 阿里云 WHOIS 申诉表单 | 仅法律/争议场景，非普通客服 |

**baxigpt.com 本身没有可联系的人。**

---

## 5. 技术侧身份指纹（无法指向个人，但可关联同团队）

- FastAPI v0.1.0 自研单体
- 后台路径 hash：`9f3f9a2e1b` / `8d3f9a2c7e1b`
- 卡密下载名：`baxi_codes.txt`
- 与 `chirou` 优惠码体系交叉（AdsPower `crclub`、MoreLogin `chirou` 等）

说明 **baxigpt 开发与 chirou 发卡业务极可能同一技术团队**。