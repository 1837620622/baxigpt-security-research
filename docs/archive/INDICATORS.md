# 指标清单（IOC / 指纹）

## 域名

| 类型 | 值 |
|------|-----|
| 主域 | `baxigpt.com` |
| 子域 | `www.baxigpt.com` |
| DNS | `dns1.hichina.com`, `dns2.hichina.com` |
| 注册商 | Alibaba Cloud / HiChina |
| 注册地 | 中国福建 |

## 网络

| 类型 | 值 |
|------|-----|
| IP（第三方记录） | `23.148.180.26` |
| 端口 | 443/TCP |
| TLS 颁发 | Let's Encrypt (YE2) |
| Server 头 | `nginx/1.24.0 (Ubuntu)` |

## 关键 URL 路径

### 用户面

- `/`
- `/api/code-info`
- `/api/submit`
- `/api/status`
- `/api/query`
- `/healthz`

### 隐藏/管理面（已被 OpenAPI 暴露）

- `/bx-admin-9f3c7a2e1b`
- `/apiref-8d3f9a2c7e1b`
- `/api/admin/login`
- `/api/admin/gen`
- `/api/admin/codes`
- `/api/admin/orders`
- `/api/admin/stats`
- `/api/admin/code-action`

### 文档/调试面

- `/openapi.json`
- `/docs`
- `/redoc`

## 技术指纹

| 指纹 | 值 |
|------|-----|
| OpenAPI title | `baxigpt` |
| OpenAPI version | `0.1.0` |
| FastAPI 404 格式 | `{"detail":"Not Found"}` |
| 后台下载文件名 | `baxi_codes.txt` |
| 订单展示 ID 前缀 | `PAY-` |
| 卡密前缀 | `BX-`, `PL-`, `EU-` |
| 上游字段名 | `pix_order_id` |

## 关联生态

| 类型 | 值 |
|------|-----|
| 卡商站 | `web3chirou.com` |
| 教程站 | `chirou.ai` |
| Telegram | `@web3_chirou` |
| 微信客服 | `oxalin_13` |
| GitHub 消费者 | `tiantianGPU/reg-factory`, `ryugadev/AUTO-REGGPT` |

## 错误消息指纹（中文）

可用于识别同类后端：

- `卡密不存在`
- `请输入卡密`
- `出码失败`
- `该账号已经是 Plus 了,无需开通`
- `该账号没有免费试用资格`
- `access token 已失效,请重新登录`
- `没识别到有效的 access token`
- `密码错误`
- `未登录`

## YARA / 搜索建议

```
# 路径
bx-admin-9f3c7a2e1b
apiref-8d3f9a2c7e1b
baxi_codes.txt
pix_order_id

# 页面标题
ChatGPT Plus 卡密开通
baxigpt 后台
baxigpt 开通 API

# API
https://baxigpt.com/api/submit
```