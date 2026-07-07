# -*- coding: utf-8 -*-
"""
common/plus_baxi.py — 用 baxigpt.com 卡密给 ChatGPT 账号开通 Plus。

baxigpt.com 提供 JSON API(纯 HTTP，不用浏览器):
  POST /api/code-info  {code}            -> {ok, remaining, msg}        验卡密(剩余次数)
  POST /api/submit     {code, at}        -> {ok, order_id, msg}         提交开通(at=access_token 串)
  POST /api/status     {order_id}|{at}   -> {ok, status, email, ...}    轮询
      status: paid=成功 / expired / failed =终态失败 / 其它=处理中

卡密池走 config.BAXI_CARDS(环境变量 BAXI_CARDS，逗号/换行分隔)，用掉的记到
tokens/chatgpt/baxi_cards_used.txt，避免批量时重复使用。
"""

import json
import os
import sys
import time

import requests

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from config import BAXI_API, BAXI_CARDS, TOKEN_OUTPUT_DIR
except Exception:
    BAXI_API = "https://baxigpt.com"
    BAXI_CARDS = []
    TOKEN_OUTPUT_DIR = "tokens"

DEFAULT_TIMEOUT = 30
PAID = "paid"
TERMINAL_FAIL = ("expired", "failed")
_USED_FILE = os.path.join(TOKEN_OUTPUT_DIR, "chatgpt", "baxi_cards_used.txt")


def _origin(url=None):
    u = (url or BAXI_API or "https://baxigpt.com").strip().rstrip("/")
    return u if "://" in u else f"https://{u}"


def _post(path, body, timeout=DEFAULT_TIMEOUT):
    url = f"{_origin()}{path}"
    resp = requests.post(url, json=body, timeout=timeout,
                         headers={"Content-Type": "application/json", "Accept": "application/json"})
    try:
        return resp.status_code, resp.json()
    except ValueError:
        return resp.status_code, {}


def _norm_code(code):
    return str(code or "").strip().upper()


# ============================================================ API
def verify_card(code):
    """POST /api/code-info。返回 (ok, remaining, msg)。"""
    code = _norm_code(code)
    if not code:
        return False, 0, "空卡密"
    try:
        _, d = _post("/api/code-info", {"code": code})
    except requests.RequestException as e:
        return False, 0, f"请求异常: {e}"
    ok = bool(d.get("ok"))
    return ok, int(d.get("remaining") or 0), str(d.get("msg") or ("ok" if ok else "卡密无效"))


def submit_plus(code, access_token):
    """POST /api/submit。返回 (ok, order_id, msg)。at 传原始 access_token 串。"""
    code = _norm_code(code)
    at = str(access_token or "").strip()
    if not code:
        return False, "", "空卡密"
    if len(at) < 30:
        return False, "", "access_token 无效(过短)"
    try:
        _, d = _post("/api/submit", {"code": code, "at": at})
    except requests.RequestException as e:
        return False, "", f"请求异常: {e}"
    if not d.get("ok"):
        return False, "", str(d.get("msg") or "提交失败")
    return True, str(d.get("order_id") or ""), str(d.get("msg") or "已提交")


def query_status(order_id=None, access_token=None):
    """POST /api/status 单次。返回 dict(含 status/email/...)，失败返回 {}。"""
    body = {"order_id": order_id} if order_id else {"at": str(access_token or "").strip()}
    try:
        _, d = _post("/api/status", body)
    except requests.RequestException:
        return {}
    return d if d.get("ok") else {}


def poll_status(order_id=None, access_token=None, timeout=180, interval=5):
    """轮询 /api/status 直到终态。返回 (status, detail_dict)。
    status: paid / expired / failed / timeout。"""
    deadline = time.time() + timeout
    last = {}
    while time.time() < deadline:
        d = query_status(order_id=order_id, access_token=access_token)
        if d:
            last = d
            st = str(d.get("status") or "").lower()
            if st == PAID:
                return PAID, d
            if st in TERMINAL_FAIL:
                return st, d
        time.sleep(interval)
    return "timeout", last


def activate(code, access_token, timeout=180, interval=5):
    """submit + poll 便捷封装。返回 (status, detail)。
    status: paid / expired / failed / timeout / submit_failed。"""
    ok, order_id, msg = submit_plus(code, access_token)
    if not ok:
        return "submit_failed", {"msg": msg}
    print(f"  [baxi] submitted, order_id={order_id or '(none)'} — {msg}")
    # 有 order_id 用 order_id 轮询，否则退化用 at 轮询
    return poll_status(order_id=order_id or None, access_token=access_token, timeout=timeout, interval=interval)


# ============================================================ 卡密池
def _read_used():
    if not os.path.isfile(_USED_FILE):
        return set()
    with open(_USED_FILE, encoding="utf-8") as f:
        return {line.strip().upper() for line in f if line.strip()}


def mark_card_used(code):
    code = _norm_code(code)
    if not code:
        return
    os.makedirs(os.path.dirname(_USED_FILE), exist_ok=True)
    with open(_USED_FILE, "a", encoding="utf-8") as f:
        f.write(f"{code}\n")


def next_card(verify=True):
    """从 config.BAXI_CARDS 取一个未用过、(可选)验证仍有剩余次数的卡密。无可用返回 None。"""
    used = _read_used()
    for code in BAXI_CARDS:
        c = _norm_code(code)
        if not c or c in used:
            continue
        if verify:
            ok, remaining, msg = verify_card(c)
            if not ok or remaining <= 0:
                print(f"  [baxi] 跳过 {c}: {msg} (remaining={remaining})")
                continue
        return c
    return None
