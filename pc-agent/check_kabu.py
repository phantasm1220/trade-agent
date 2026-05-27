# -*- coding: utf-8 -*-
"""
kabuStation API 接続確認ツール
==============================
kabuステーションが正しく動作しているか段階的に確認する。
"""

import json
import sys
import os

def load_env():
    env = {}
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip()
    return env

env = load_env()
KABU_HOST     = env.get("KABU_HOST", "localhost")
KABU_PORT     = int(env.get("KABU_PORT", "18080"))
KABU_PASSWORD = env.get("KABU_PASSWORD", "")
KABU_BASE     = "http://{}:{}/kabusapi".format(KABU_HOST, KABU_PORT)

def step(n, title):
    print()
    print("=" * 50)
    print("  STEP {} : {}".format(n, title))
    print("=" * 50)

def ok(msg):   print("  [OK]  " + msg)
def err(msg):  print("  [NG]  " + msg)
def info(msg): print("  [--]  " + msg)

# ─── STEP 1: kabuステーション接続確認 ──────────────────────────
step(1, "kabuStation connection check")
info("Target: {}".format(KABU_BASE))

import urllib.request
import urllib.error

try:
    req = urllib.request.Request(KABU_BASE + "/token",
        data=json.dumps({"APIPassword": "dummy"}).encode(),
        method="POST")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=5) as res:
        ok("kabuStation is running (HTTP {})".format(res.status))
except urllib.error.HTTPError as e:
    if e.code in [400, 401]:
        ok("kabuStation is running (HTTP {} = password error, which is expected)".format(e.code))
    else:
        err("kabuStation returned HTTP {}".format(e.code))
        print()
        print("  -> kabuステーションが起動していない可能性があります")
        print("     kabuステーションを起動してログインしてください")
        input("\nEnter to exit...")
        sys.exit(1)
except Exception as e:
    err("Cannot connect: {}".format(e))
    print()
    print("  -> kabuステーションが起動していない可能性があります")
    print("     kabuステーションを起動してログインしてください")
    input("\nEnter to exit...")
    sys.exit(1)

# ─── STEP 2: トークン取得 ────────────────────────────────────────
step(2, "Get API token")

if not KABU_PASSWORD or KABU_PASSWORD == "your-kabu-api-password":
    err("KABU_PASSWORD is not set in .env")
    print("  -> .env を開いて KABU_PASSWORD を設定してください")
    input("\nEnter to exit...")
    sys.exit(1)

info("Password: {}****".format(KABU_PASSWORD[:2]))

token = None
try:
    req = urllib.request.Request(KABU_BASE + "/token",
        data=json.dumps({"APIPassword": KABU_PASSWORD}).encode(),
        method="POST")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=10) as res:
        data = json.loads(res.read())
        token = data.get("Token")
        if token:
            ok("Token acquired: {}...".format(token[:12]))
        else:
            err("Token not found in response: {}".format(data))
            input("\nEnter to exit...")
            sys.exit(1)
except urllib.error.HTTPError as e:
    body = e.read().decode() if e.fp else ""
    err("HTTP {}: {} / {}".format(e.code, e.reason, body))
    if e.code == 400:
        print("  -> APIパスワードが間違っています")
        print("     kabuステーション内の設定を確認してください")
    input("\nEnter to exit...")
    sys.exit(1)
except Exception as e:
    err("Exception: {}".format(e))
    input("\nEnter to exit...")
    sys.exit(1)

# ─── STEP 3: 銘柄情報取得テスト（トヨタ）──────────────────────
step(3, "Symbol info test (Toyota 7203)")

try:
    req = urllib.request.Request(KABU_BASE + "/symbol/7203@1", method="GET")
    req.add_header("X-API-KEY", token)
    with urllib.request.urlopen(req, timeout=10) as res:
        data = json.loads(res.read())
        name = data.get("DisplayName") or data.get("Symbol", "?")
        ok("Symbol info OK: {}".format(name))
        info("Exchange: {}  Unit: {}株".format(
            data.get("Exchange", "?"),
            data.get("TradingUnit", "?")))
except Exception as e:
    err("Symbol info failed: {}".format(e))

# ─── STEP 4: 板情報（リアルタイム価格）取得テスト ───────────────
step(4, "Board (realtime price) test")

test_stocks = [
    ("7203@1", "Toyota"),
    ("6758@1", "Sony"),
    ("9984@1", "SoftBank"),
]

for kabu_code, name in test_stocks:
    try:
        req = urllib.request.Request(
            KABU_BASE + "/board/{}".format(kabu_code), method="GET")
        req.add_header("X-API-KEY", token)
        with urllib.request.urlopen(req, timeout=5) as res:
            data = json.loads(res.read())

        cur_price  = data.get("CurrentPrice")
        prev_close = data.get("PreviousClose")
        open_p     = data.get("OpeningPrice")
        high_p     = data.get("HighPrice")
        low_p      = data.get("LowPrice")
        volume     = data.get("Volume")
        status     = data.get("CurrentPriceStatus")  # 1=リアルタイム, 2=前日終値等

        status_str = {
            1: "リアルタイム",
            2: "前日終値",
            3: "特別買気配",
            4: "特別売気配",
        }.get(status, "不明({})".format(status))

        if cur_price and cur_price > 0:
            ok("{} ({}@{}): ¥{:,.0f} [{}]".format(
                name, kabu_code, "東証",
                cur_price, status_str))
        else:
            info("{}: CurrentPrice={}  PreviousClose={}  [{}]".format(
                name, cur_price, prev_close, status_str))
            print("        市場時間外のため現在値なし（前日終値を使用）")

        info("  Open:{} High:{} Low:{} Vol:{}".format(
            open_p, high_p, low_p, volume))

    except urllib.error.HTTPError as e:
        err("{}: HTTP {} {}".format(name, e.code, e.reason))
    except Exception as e:
        err("{}: {}".format(name, e))

# ─── STEP 5: Vercel push テスト ─────────────────────────────────
step(5, "Vercel push test")

VERCEL_URL   = env.get("VERCEL_URL", "").rstrip("/")
PUSH_SECRET  = env.get("PUSH_SECRET", "")

if not VERCEL_URL or not PUSH_SECRET or PUSH_SECRET == "your-secret-key":
    info("VERCEL_URL or PUSH_SECRET not set, skipping Vercel test")
else:
    test_payload = {
        "secret": PUSH_SECRET,
        "prices": {
            "7203.T": {
                "price": 2960, "changePct": 0.5,
                "currency": "JPY", "source": "kabu_test"
            }
        }
    }
    try:
        req = urllib.request.Request(
            VERCEL_URL + "/api/push-prices",
            data=json.dumps(test_payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST")
        with urllib.request.urlopen(req, timeout=10) as res:
            resp = json.loads(res.read())
            ok("Vercel push OK: {}".format(resp))
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        err("Vercel push HTTP {}: {} / {}".format(e.code, e.reason, body[:100]))
        if e.code == 401:
            print("  -> PUSH_SECRET が Vercel の環境変数と一致していません")
    except Exception as e:
        err("Vercel push failed: {}".format(e))

# ─── 結果サマリー ───────────────────────────────────────────────
print()
print("=" * 50)
print("  診断完了")
print("=" * 50)
print()
print("  全てのSTEPが [OK] なら kabu_agent.py が正常に動作します")
print("  [NG] がある場合は上記のメッセージを確認してください")
print()

input("Press Enter to exit...")
