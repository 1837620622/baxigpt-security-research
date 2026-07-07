# 文档索引

## 核心报告（优先阅读）

| 文档 | 说明 |
|------|------|
| [SECURITY-REPORT.md](./reports/SECURITY-REPORT.md) | 漏洞摘要、严重性分级、PoC 引用 |
| [MASTER-ANALYSIS.md](./reports/MASTER-ANALYSIS.md) | 阶段 1–8 技术深潜（整合版） |
| [FINDINGS-ROUND9.md](./reports/FINDINGS-ROUND9.md) | 第 9 阶段补充探测（Cookie、Header、JSON 边界） |

## 参考文档

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](./reference/ARCHITECTURE.md) | 后端逻辑与数据模型推断 |
| [API-REFERENCE.md](./reference/API-REFERENCE.md) | 公开与管理端接口 |
| [ADMIN-SURFACE.md](./reference/ADMIN-SURFACE.md) | 隐藏管理界面与会话行为 |
| [THREAT-INTELLIGENCE.md](./reference/THREAT-INTELLIGENCE.md) | 运营方 OSINT 与供应链 |

## 操作指南

| 文档 | 说明 |
|------|------|
| [REPRODUCTION.md](./guides/REPRODUCTION.md) | 复现命令与验证流程 |
| [METHODOLOGY.md](./guides/METHODOLOGY.md) | 评估方法与范围 |

## 归档

早期草稿与分阶段笔记：[archive/](./archive/)

## 仓库其他目录

| 路径 | 内容 |
|------|------|
| [evidence/](../evidence/) | 取证材料（快照、探测 JSON、提取文件、日志） |
| [exploits/](../exploits/) | 只读复现脚本 |
| [third-party/](../third-party/) | 恢复的第三方 API 客户端 |
| [scripts/verify_release.sh](../scripts/verify_release.sh) | 发布验证门禁 |