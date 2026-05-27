# -*- coding: utf-8 -*-
"""
kabuStation API -> Vercel JP Realtime Agent
シリアル取得方式（全30銘柄を順番に確実に取得）
"""

import sys
import time
import json
import os
import signal
from datetime import datetime


def load_env():
    env = {}
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(env_path):
        print("ERROR: .env file not found", flush=True)
        return env
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


env = load_env()

VERCEL_URL    = env.get("VERCEL_URL", "").rstrip("/")
PUSH_SECRET   = env.get("PUSH_SECRET", "")
KABU_PASSWORD = env.get("KABU_PASSWORD", "")
KABU_HOST     = env.get("KABU_HOST", "localhost")
KABU_PORT     = int(env.get("KABU_PORT", "18080"))
INTERVAL_SEC  = int(env.get("INTERVAL_SEC", "15"))

KABU_BASE = "http://{}:{}/kabusapi".format(KABU_HOST, KABU_PORT)

JP_STOCKS = [
    ("7203@1",  "7203.T",  "Toyota"),
    ("6758@1",  "6758.T",  "Sony"),
    ("9984@1",  "9984.T",  "SoftBank"),
    ("6861@1",  "6861.T",  "Keyence"),
    ("4063@1",  "4063.T",  "ShinEtsu"),
    ("8306@1",  "8306.T",  "MUFG"),
    ("7974@1",  "7974.T",  "Nintendo"),
    ("6367@1",  "6367.T",  "Daikin"),
    ("9432@1",  "9432.T",  "NTT"),
    ("4568@1",  "4568.T",  "Daiichi"),
    ("6501@1",  "6501.T",  "Hitachi"),
    ("6902@1",  "6902.T",  "Denso"),
    ("7267@1",  "7267.T",  "Honda"),
    ("7201@1",  "7201.T",  "Nissan"),
    ("6702@1",  "6702.T",  "Fujitsu"),
    ("8316@1",  "8316.T",  "SMFG"),
    ("8411@1",  "8411.T",  "Mizuho"),
    ("9433@1",  "9433.T",  "KDDI"),
    ("4502@1",  "4502.T",  "Takeda"),
    ("4519@1",  "4519.T",  "Chugai"),
    ("6594@1",  "6594.T",  "Nidec"),
    ("6645@1",  "6645.T",  "Omron"),
    ("6971@1",  "6971.T",  "Kyocera"),
    ("7733@1",  "7733.T",  "Olympus"),
    ("8035@1",  "8035.T",  "TEL"),
    ("9020@1",  "9020.T",  "JR-East"),
    ("9021@1",  "9021.T",  "JR-West"),
    ("9022@1",  "9022.T",  "JR-Central"),
    ("3382@1",  "3382.T",  "7-Eleven"),
    ("2914@1",  "2914.T",  "JT"),
]


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print("[{}] {}".format(ts, msg), flush=True)


def http_get(url, token, timeout=5, retry=2):
    import urllib.request
    import urllib.error
    for attempt in range(retry + 1):
        req = urllib.request.Request(url, method="GET")
        req.add_header("X-API-KEY", token)
        req.add_header("Connection", "close")  # 接続を使い回さない
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return json.loads(res.read())
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retry:
                time.sleep(1.0)  # 429発生時は1秒待ってリトライ
                continue
            raise
        except Exception:
            raise
    return None


def http_post(url, body_dict, timeout=10):
    import urllib.request
    body = json.dumps(body_dict).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read())


def http_put(url, body_dict, token, timeout=10):
    import urllib.request
    body = json.dumps(body_dict).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="PUT")
    req.add_header("Content-Type", "application/json")
    req.add_header("X-API-KEY", token)
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read())


def get_token():
    try:
        data = http_post(KABU_BASE + "/token", {"APIPassword": KABU_PASSWORD})
        return data.get("Token")
    except Exception as e:
        log("ERROR get_token: {}".format(e))
        return None


def register_symbols(token):
    symbols = [{"Symbol": c.split("@")[0], "Exchange": int(c.split("@")[1])}
               for c, _, _ in JP_STOCKS]
    try:
        data = http_put(KABU_BASE + "/register", {"Symbols": symbols}, token)
        count = len(data.get("RegistList", []))
        log("OK  Registered {} symbols".format(count))
    except Exception as e:
        log("WARN register: {}".format(e))


def fetch_all_boards_serial(token):
    """
    全銘柄をシリアルに取得する
    kabu API制限: 情報系は秒間10件まで
    → 1件あたり120ms待機で秒間8件（安全マージン確保）
    → 30件 × 120ms = 3.6秒で全件取得
    """
    results = {}
    failed = 0

    for kabu_code, yahoo_code, name in JP_STOCKS:
        try:
            data = http_get(
                "{}/board/{}".format(KABU_BASE, kabu_code),
                token, timeout=5
            )
            time.sleep(0.12)  # 120ms待機 = 秒間8件（上限10件に対して安全マージン）

            price      = float(data.get("CurrentPrice") or 0)
            open_p     = float(data.get("OpeningPrice")  or 0)
            high_p     = float(data.get("HighPrice")     or 0)
            low_p      = float(data.get("LowPrice")      or 0)
            prev_close = float(data.get("PreviousClose") or 0)
            volume     = int(data.get("Volume")          or 0)

            # 市場時間外はCurrentPriceが0になる → PreviousCloseで代替
            if price <= 0:
                price = prev_close
            if price <= 0:
                failed += 1
                continue

            if open_p  <= 0: open_p  = price
            if high_p  <= 0: high_p  = price
            if low_p   <= 0: low_p   = price
            if prev_close <= 0: prev_close = price

            change     = price - prev_close
            change_pct = (change / prev_close * 100) if prev_close else 0.0

            results[yahoo_code] = {
                "price":     round(price, 0),
                "open":      round(open_p, 0),
                "high":      round(high_p, 0),
                "low":       round(low_p, 0),
                "prevClose": round(prev_close, 0),
                "change":    round(change, 0),
                "changePct": round(change_pct, 3),
                "volume":    volume,
                "currency":  "JPY",
                "timestamp": int(time.time() * 1000),
                "source":    "kabu_live",
            }

        except Exception as e:
            failed += 1
            # エラーが多い場合のみ表示
            if failed <= 3:
                log("  WARN {} ({}): {}".format(kabu_code, name, e))

    if failed > 5:
        log("  WARN {} symbols failed (token expired?)".format(failed))

    return results


def push_to_vercel(prices):
    import urllib.request, urllib.error
    url     = "{}/api/push-prices".format(VERCEL_URL)
    payload = json.dumps({"secret": PUSH_SECRET, "prices": prices}).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return True, json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        return False, "HTTP {}: {}".format(e.code, e.reason)
    except Exception as e:
        return False, str(e)


def main():
    log("=" * 52)
    log("  kabuStation API -> Vercel JP Realtime Agent")
    log("  (Serial mode: reliable 30-symbol fetch)")
    log("=" * 52)

    log("CONFIG:")
    log("  VERCEL_URL   = {}".format(VERCEL_URL or "(not set)"))
    log("  PUSH_SECRET  = {}".format(PUSH_SECRET[:4]+"****" if PUSH_SECRET else "(not set)"))
    log("  KABU_BASE    = {}".format(KABU_BASE))
    log("  INTERVAL_SEC = {}".format(INTERVAL_SEC))

    if not VERCEL_URL or not VERCEL_URL.startswith("http"):
        log("ERROR: VERCEL_URL not set")
        input("\nPress Enter to exit...")
        sys.exit(1)
    if not PUSH_SECRET or PUSH_SECRET == "your-secret-key":
        log("ERROR: PUSH_SECRET not set")
        input("\nPress Enter to exit...")
        sys.exit(1)
    if not KABU_PASSWORD or KABU_PASSWORD == "your-kabu-api-password":
        log("ERROR: KABU_PASSWORD not set")
        input("\nPress Enter to exit...")
        sys.exit(1)

    log("Getting token...")
    token = get_token()
    if not token:
        log("ERROR: Could not get token. Is kabuStation running?")
        input("\nPress Enter to exit...")
        sys.exit(1)
    log("OK  Token: {}...".format(token[:8]))

    register_symbols(token)

    running = [True]
    def on_exit(sig, frame):
        log("Stopping...")
        running[0] = False
    signal.signal(signal.SIGINT, on_exit)

    log("Watching {} JP symbols (serial mode)".format(len(JP_STOCKS)))
    log("Interval: {} sec".format(INTERVAL_SEC))
    log("-" * 52)

    cycle     = 0
    token_age = 0
    errors    = 0

    while running[0]:
        cycle    += 1
        token_age += 1

        # 25分ごとにトークン更新
        if token_age >= int(1500 / INTERVAL_SEC):
            new_token = get_token()
            if new_token:
                token     = new_token
                token_age = 0
                log("Token refreshed")

        t_start = time.time()
        log("--- Cycle #{} ---".format(cycle))

        prices = fetch_all_boards_serial(token)
        t_fetch = time.time() - t_start

        if prices:
            errors = 0
            count  = len(prices)
            # 上位3銘柄を表示
            for code, d in list(prices.items())[:3]:
                name = next((s[2] for s in JP_STOCKS if s[1]==code), code)
                sign = "+" if d["changePct"] >= 0 else ""
                log("  {} {}: ¥{:,.0f} ({}{:.2f}%)".format(
                    code, name, d["price"], sign, d["changePct"]))
            if count > 3:
                log("  ... and {} more".format(count - 3))

            ok, resp = push_to_vercel(prices)
            t_total = time.time() - t_start
            if ok:
                log("OK  Pushed {}/{} symbols in {:.2f}s (fetch:{:.2f}s)".format(
                    count, len(JP_STOCKS), t_total, t_fetch))
            else:
                log("ERROR push: {}".format(resp))
                errors += 1
        else:
            log("WARN no data (market closed or token issue)")
            errors += 1
            if errors >= 3:
                log("Refreshing token due to errors...")
                new_token = get_token()
                if new_token:
                    token  = new_token
                    token_age = 0
                    errors = 0
                    log("Token refreshed")

        if running[0]:
            elapsed = time.time() - t_start
            wait    = max(0, INTERVAL_SEC - elapsed)
            deadline = time.time() + wait
            while running[0] and time.time() < deadline:
                time.sleep(0.5)

    log("Agent stopped.")


if __name__ == "__main__":
    main()
