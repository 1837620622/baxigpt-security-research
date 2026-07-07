# 取证材料（evidence）

按类型与探测阶段分类，避免根目录堆满零散 JSON。

```
evidence/
├── snapshots/          # 页面与 OpenAPI 原始快照（HTML/JSON）
├── probes/
│   ├── pentest/        # 早期渗透批次与绕过测试
│   ├── round6/         # 第 6 阶段扫描
│   ├── round7/         # DNS、vhost、口令与绕过
│   ├── round8/         # 卡密枚举、IDOR、fuzz、指纹
│   ├── round9/         # 补充 API 边界探测
│   └── recon/          # 子域、debug-probe 等侦察
├── extracted/          # 从页面提取的 JS、端点列表
└── logs/               # 脚本运行日志（.log）
```

## 主报告引用的关键文件

| 发现 | 路径 |
|------|------|
| 速率限制绕过 | `probes/pentest/pentest-enum-bypass.json` |
| BOLA / 隐私泄露 | `probes/round8/round8-cards.json` |
| OpenAPI 暴露 | `snapshots/openapi.json` |
| 管理登录策略 | `probes/round7/round7-full.json` |
| 类型混淆 500 | `probes/round8/round8-fuzz.json` |

> 脚本默认写入对应 `probes/` 子目录；live 验证请用 `OUT_DIR` 写到仓库外，勿污染已提交证据。