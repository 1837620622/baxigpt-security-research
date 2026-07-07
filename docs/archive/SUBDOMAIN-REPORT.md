# 子域探测报告 — baxigpt.com

探测时间：2026-07-07  
脚本：`exploits/subdomain_probe.py`

---

## 核心结论（先看这个）

### 1. 本地看到的 70+ 子域 **绝大多数不是真子域**

| 现象 | 解释 |
|------|------|
| `dig @8.8.8.8 flag.baxigpt.com` → `198.18.0.122` | **Clash/Surge Fake-IP**（`198.18.0.0/15` 保留段） |
| 词表 80 个前缀几乎 **全部有 A 记录** | 代理对未知域名统一分配假 IP，**不是**真实 DNS |
| 直接 `curl https://flag.baxigpt.com` | **SSL 握手失败**（证书不含该 SAN） |

**真子域（TLS 证书确认）仅 2 个：**

```
baxigpt.com
www.baxigpt.com
```

Let's Encrypt 证书 SAN（真实 IP `23.148.180.26`）：

```
TLS SAN: ['baxigpt.com', 'www.baxigpt.com']
```

### 2. 真实服务器：**无虚拟主机隔离**

对 `23.148.180.26:443` 强制 Host 头扫描：

| Host 头 | `/healthz` | 与主站差异 |
|---------|------------|------------|
| `baxigpt.com` | `{"ok":true}` | 基准 |
| `www.baxigpt.com` | 同上 | **相同** |
| `flag.baxigpt.com` | 同上 | **相同** |
| `dev.baxigpt.com` | 同上 | **相同** |
| `admin.baxigpt.com` | 同上 | **相同** |
| `api.baxigpt.com` | 同上 | **相同** |
| `localhost` / `127.0.0.1` | 同上 | **相同** |

→ nginx **默认 server** 接受任意 Host，全部回落到同一套 baxigpt 前端/API。  
**不存在**独立的 dev/flag/staging 后台环境。

### 3. HTTP 80 端口

| Host | 结果 |
|------|------|
| `baxigpt.com` | `200 {"ok":true}` |
| `flag/dev/admin.baxigpt.com` | 连接被关闭 |

仅 HTTPS + 主域 Host 可用。

### 4. 隐藏路径在各 Host 下均相同

对真实 IP + `Host: flag.baxigpt.com`：

| 路径 | 状态 |
|------|------|
| `/openapi.json` | 200（同主站） |
| `/bx-admin-9f3c7a2e1b` | 200（同后台页） |
| `/apiref-8d3f9a2c7e1b` | 200 |
| `/flag` `/flag.txt` | 404（无 flag 文件） |
| `POST /api/admin/login` | 401 密码错误（同生产鉴权） |

---

## 探测方法汇总

```
┌─────────────────────────────────────────────────────────┐
│ 1. DNS 词表（80 前缀）                                   │
│    → 本地/8.8.8.8 均返回 198.18.0.x → Fake-IP 误判      │
├─────────────────────────────────────────────────────────┤
│ 2. 真实 IP 23.148.180.26 + Host 头（绕过 DNS）           │
│    → 任意 Host 同站，无独立子域应用                       │
├─────────────────────────────────────────────────────────┤
│ 3. TLS 证书 SAN                                          │
│    → 仅 baxigpt.com + www                               │
├─────────────────────────────────────────────────────────┤
│ 4. 直连 https://子域/（系统 DNS）                        │
│    → 非 www 子域 SSL 失败（证书不匹配）                   │
├─────────────────────────────────────────────────────────┤
│ 5. crt.sh 证书透明度                                     │
│    → 查询失败（无额外子域列表）                           │
└─────────────────────────────────────────────────────────┘
```

---

## 安全含义

| 发现 | 严重度 | 说明 |
|------|--------|------|
| 任意 Host 回落主站 | 低~中 | 潜在 **缓存投毒 / Host 头攻击** 面，但无跨租户数据 |
| 无独立 debug 子域 | 信息 | `debug.baxigpt.com` 不是真实调试环境 |
| Fake-IP 误导侦察 | 信息 | 词表爆破子域在本环境会产生 **假阳性** |
| 证书仅主域 | 信息 | 运维未配置多域证书 |

**不成立的方向：**

- ❌ `flag.baxigpt.com` 有独立 flag 服务
- ❌ `dev.baxigpt.com` 弱鉴权/开 debug
- ❌ `admin.baxigpt.com` 不同后台入口

---

## 若仍要「从子域角度」挖洞

既然 Host 任意值都进同一应用，子域思路应转为：

### A. 用真实 IP 绕过本地代理

```bash
# /etc/hosts 或 curl --resolve
curl -sk --resolve "baxigpt.com:443:23.148.180.26" \
  https://baxigpt.com/openapi.json
```

避免 Fake-IP 导致的 SSL/路由异常。

### B. Host 头 + 路径（不是子域）

在同一应用内继续挖：

- `/flag` `/debug` `/metrics` 路径 fuzz（已测 404）
- `X-Forwarded-Host` / `X-Original-Host` 污染
- Web 缓存：`Host: evil.com` + 静态路径

### C. 关闭代理 Fake-IP 后重扫 DNS

在 **无 Clash TUN** 环境重跑：

```bash
dig @8.8.8.8 +short test.baxigpt.com
```

若返回真实 IP 而非 `198.18.x.x`，才说明子域存在。

---

## 复现命令

```bash
# 真实 IP + 任意 Host（均返回主站 healthz）
curl -sk --resolve "baxigpt.com:443:23.148.180.26" \
  -H "Host: flag.baxigpt.com" \
  https://baxigpt.com/healthz

# 查看 TLS 证书 SAN
echo | openssl s_client -connect 23.148.180.26:443 -servername baxigpt.com 2>/dev/null \
  | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"

# 完整子域脚本
python3 exploits/subdomain_probe.py
```

---

## 产物

| 文件 | 内容 |
|------|------|
| `SUBDOMAIN-REPORT.md` | 本报告 |
| `exploits/subdomain_probe.py` | DNS + vhost 扫描脚本 |
| `evidence/probes/recon/subdomain-probe.log` | 扫描日志（含 Fake-IP 列表） |