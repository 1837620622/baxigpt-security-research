# baxigpt-security-research

针对 **baxigpt.com** 的独立安全研究与威胁情报文档。该站点是基于 FastAPI 的 ChatGPT Plus 卡密兑换网关。

> **说明：** GitHub 仓库名为 `baxigpt-security-research`。本地克隆目录可能叫 `baxigpt-reverse`，内容一致。

本仓库汇总了侦察取证、后端架构推断、已确认漏洞分析，以及只读 PoC 脚本，供安全工程师、审计人员与集成方评估 API 风险时参考。

## 执行摘要

| 项目 | 详情 |
|------|------|
| **技术栈** | nginx/1.24.0 (Ubuntu) → FastAPI v0.1.0 → 推断上游 PIX/BLIK |
| **业务** | 用户提交 ChatGPT `accessToken`，通过卡密完成兑换 |
| **关键问题** | 速率限制绕过（XFF）、`/api/query` BOLA、OpenAPI 泄露管理端、管理登录策略薄弱 |
| **管理端** | 未突破；会话认证经大量测试仍未取得访问 |

完整分析见 **[docs/SECURITY-REPORT.md](docs/SECURITY-REPORT.md)**

## 快速复现

```bash
# 依赖：无（仅 Python 标准库）
python3 exploits/baxigpt_audit.py health
python3 exploits/baxigpt_audit.py code-info --code EU-HFNDFHD4
python3 exploits/baxigpt_audit.py query --code EU-HFNDFHD4
```

全部命令见 **[docs/REPRODUCTION.md](docs/REPRODUCTION.md)**。

```bash
OUT_DIR=/tmp/baxigpt-verify ./scripts/verify_release.sh
```

## 目录结构

```
.
├── README.md                 # 本文件
├── LICENSE                   # MIT（脚本）；研究免责声明见下文
├── docs/
│   ├── SECURITY-REPORT.md    # 主报告：漏洞与发现
│   ├── REPRODUCTION.md       # PoC 复现命令
│   ├── ARCHITECTURE.md       # 后端架构重建
│   ├── API-REFERENCE.md      # 接口说明
│   ├── ADMIN-SURFACE.md      # 管理端界面分析
│   ├── THREAT-INTELLIGENCE.md
│   ├── METHODOLOGY.md
│   ├── INDEX.md
│   └── archive/              # 早期工作草稿
├── exploits/                 # 只读审计脚本
├── artifacts/                # 探测 JSON 输出
├── captures/                 # 原始 HTTP/HTML 快照
└── recovered-code/           # 第三方 API 客户端（来自 GitHub）
```

## 已确认发现（摘要）

1. **速率限制绕过** — 轮换 `X-Forwarded-For` 可避开 `HTTP 429`（[证据](artifacts/pentest-enum-bypass.json)）
2. **BOLA / 隐私泄露** — `POST /api/query` 仅凭卡密即可返回全部订单与邮箱（[证据](artifacts/round8-cards.json)）
3. **OpenAPI 暴露** — `/openapi.json` 列出隐藏管理端路由（[快照](captures/openapi.json)）
4. **管理登录策略** — `/api/admin/login` 未观察到节流（[证据](artifacts/round7-full.json)）
5. **输入校验缺陷** — 类型错误触发 HTTP 500（[证据](artifacts/round8-fuzz.json)）

## 脚本

| 脚本 | 说明 |
|------|------|
| `exploits/baxigpt_audit.py` | 统一 CLI：health、code-info、query、openapi |
| `exploits/ip_bypass_enum.py` | XFF 轮换 + 卡密探测 |
| `exploits/round8_fuzz500.py` | 类型混淆 fuzz（请谨慎、少量使用） |

## 文档导航

从 **[docs/INDEX.md](docs/INDEX.md)** 开始阅读。

## 威胁情报

该服务与卡密分销生态（chirou.ai / web3chirou.com）相关联，主要分发 EU/PIX 卡密。站点本身未公开客服联系方式。详见 [docs/THREAT-INTELLIGENCE.md](docs/THREAT-INTELLIGENCE.md)。

## 免责声明

本项目记录以**只读方式**开展的安全研究方法与结论，脚本与报告仅供防御分析、集成风险评估与教育用途。

- **请勿**大规模暴力枚举卡密、窃取第三方凭证或干扰服务运行。
- 取证材料可能包含测试流量中的真实标识符，请妥善处置。
- 作者与 baxigpt.com 及其运营方无任何关联。

## 许可证

MIT License — 见 [LICENSE](LICENSE)。研究正文与第三方抓取内容仍受各自条款约束。