# -*- coding: utf-8 -*-
"""
activate_plus.py — 用 baxigpt.com 卡密给已注册的 ChatGPT 账号开通 Plus。

access_token 来源(优先级):--at > --session 文件 > 已存的 tokens/chatgpt/<email>.session.json。
卡密来源:--code 指定，或从 .env 的 BAXI_CARDS 卡密池自动取一个未用过的。

用法:
    python activate_plus.py --email crpxk5nua25u@outlook.com      # 用卡密池 + 已存 session
    python activate_plus.py --email <email> --code BX-XXXXXXXX    # 指定卡密
    python activate_plus.py --at eyJ... --code BX-XXXXXXXX        # 直接给 access_token
    python activate_plus.py --session tokens/chatgpt/<email>.session.json

开通成功(paid)后会把 email 记到 tokens/chatgpt/plus_activated.txt，并提示重传上传。
"""

import argparse
import json
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from config import TOKEN_OUTPUT_DIR
from common import plus_baxi


def _load_at_from_session(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    return str(d.get("accessToken") or d.get("access_token") or "").strip(), d.get("user", {}).get("email", "")


def _resolve_access_token(args):
    if args.at:
        return args.at.strip(), args.email or ""
    if args.session:
        return _load_at_from_session(args.session)
    if args.email:
        path = os.path.join(TOKEN_OUTPUT_DIR, "chatgpt", f"{args.email}.session.json")
        if os.path.isfile(path):
            return _load_at_from_session(path)
        print(f"  找不到 {path}，请用 --at 或 --session 指定 access_token")
        return "", args.email
    return "", ""


def _mark_activated(email):
    if not email:
        return
    path = os.path.join(TOKEN_OUTPUT_DIR, "chatgpt", "plus_activated.txt")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(f"{email}\n")


def main():
    parser = argparse.ArgumentParser(description="baxigpt.com 卡密开通 ChatGPT Plus")
    parser.add_argument("--email", help="账号邮箱(用于定位已存 session 和标记)")
    parser.add_argument("--at", help="直接指定 access_token")
    parser.add_argument("--session", help="指定 session.json 路径")
    parser.add_argument("--code", help="指定卡密 BX-XXXXXXXX(默认从 BAXI_CARDS 池取)")
    parser.add_argument("--timeout", type=int, default=180, help="轮询超时秒(默认180)")
    args = parser.parse_args()

    access_token, email = _resolve_access_token(args)
    if not access_token:
        print("  [FAIL] 没拿到 access_token")
        sys.exit(1)
    print(f"  access_token: {access_token[:18]}... (len={len(access_token)}) email={email or '?'}")

    if args.code:
        # 显式指定卡密：验一次
        code = plus_baxi._norm_code(args.code)
        ok, remaining, msg = plus_baxi.verify_card(code)
        print(f"  [baxi] 卡密 {code}: ok={ok} remaining={remaining} ({msg})")
        if not ok or remaining <= 0:
            print("  [FAIL] 卡密不可用")
            sys.exit(1)
    else:
        # 从卡密池取：next_card(verify=True) 已验过，不重复验
        code = plus_baxi.next_card(verify=True)
        if not code:
            print("  [FAIL] 没有可用卡密(BAXI_CARDS 池为空/已用尽)")
            sys.exit(1)
        print(f"  [baxi] 卡密 {code}: 取自卡密池(已验)")

    print(f"  [baxi] 提交开通 Plus（轮询上限 {args.timeout}s）...")
    status, detail = plus_baxi.activate(code, access_token, timeout=args.timeout)
    print(f"  [baxi] 最终状态: {status}  email={detail.get('email') or email or '?'}  order={detail.get('display_id') or detail.get('order_id') or '-'}")

    if status == plus_baxi.PAID:
        plus_baxi.mark_card_used(code)
        _mark_activated(email or detail.get("email", ""))
        print("  [OK] Plus 已开通 ✅")
        print("  → 现在重跑上传让 token 生效:")
        print("      (先删 tokens/chatgpt/uploaded_sub2api.txt 里对应行以重传)")
        print("      python upload_tokens.py chatgpt")
        sys.exit(0)
    else:
        print(f"  [FAIL] 未开通成功: {status} — {detail.get('msg') or ''}")
        sys.exit(2)


if __name__ == "__main__":
    main()
