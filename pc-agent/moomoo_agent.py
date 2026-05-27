# -*- coding: utf-8 -*-
"""
moomoo OpenD -> Vercel US Realtime Agent
- Auto-detects and removes invalid symbols on startup
- Splits into batches to avoid single-symbol failures blocking all
"""

import sys
import time
import json
import os
import signal
import traceback
from datetime import datetime


def load_env():
    env = {}
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(env_path):
        print("ERROR: .env file not found at: {}".format(env_path), flush=True)
        return env
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


env = load_env()

VERCEL_URL   = env.get("VERCEL_URL", "").rstrip("/")
PUSH_SECRET  = env.get("PUSH_SECRET", "")
OPEND_HOST   = env.get("OPEND_HOST", "127.0.0.1")
OPEND_PORT   = int(env.get("OPEND_PORT", "11111"))
INTERVAL_SEC = int(env.get("INTERVAL_SEC", "15"))

# 候補銘柄リスト（US.SQ を US.XYZ の代替に差し替え）
US_STOCKS_CANDIDATES = [
    ("US.NVDA",  "NVIDIA"),
    ("US.AAPL",  "Apple"),
    ("US.MSFT",  "Microsoft"),
    ("US.TSLA",  "Tesla"),
    ("US.AMZN",  "Amazon"),
    ("US.META",  "Meta"),
    ("US.GOOGL", "Alphabet"),
    ("US.AMD",   "AMD"),
    ("US.PLTR",  "Palantir"),
    ("US.SMCI",  "SuperMicro"),
    ("US.NFLX",  "Netflix"),
    ("US.ORCL",  "Oracle"),
    ("US.CRM",   "Salesforce"),
    ("US.INTC",  "Intel"),
    ("US.QCOM",  "Qualcomm"),
    ("US.AVGO",  "Broadcom"),
    ("US.TSM",   "TSMC"),
    ("US.ASML",  "ASML"),
    ("US.COIN",  "Coinbase"),
    ("US.HOOD",  "Robinhood"),
    ("US.UBER",  "Uber"),
    ("US.SPOT",  "Spotify"),
    ("US.SHOP",  "Shopify"),
    ("US.PYPL",  "PayPal"),
    ("US.SNOW",  "Snowflake"),
    ("US.DDOG",  "Datadog"),
    ("US.CRWD",  "CrowdStrike"),
    ("US.ARM",   "ARM Holdings"),
    ("US.MSTR",  "MicroStrategy"),
    ("US.V",     "Visa"),
    # SQ は moomoo で認識されないため除外。代替として Visa を追加
]


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print("[{}] {}".format(ts, msg), flush=True)


def validate_symbols(quote_ctx, candidates):
    """
    起動時に全候補銘柄を1件ずつ検証し、有効なものだけを返す
    """
    log("Validating {} candidate symbols one by one...".format(len(candidates)))
    valid = []
    invalid = []

    for code, name in candidates:
        ret, df = quote_ctx.get_market_snapshot([code])
        if ret == 0 and len(df) > 0:
            price = df.iloc[0].get("last_price", 0)
            if float(price) > 0:
                valid.append((code, name))
                log("  OK  {} ({}) price={}".format(code, name, price))
            else:
                # price=0 は市場閉鎖中でも返ることがある → 有効とみなす
                valid.append((code, name))
                log("  OK  {} ({}) price=0 (market may be closed)".format(code, name))
        else:
            invalid.append(code)
            log("  NG  {} ({}) -> {}".format(code, name, df if ret != 0 else "no data"))
        time.sleep(0.1)  # レート制限対策

    log("Validation done: {} valid, {} invalid".format(len(valid), len(invalid)))
    if invalid:
        log("Invalid symbols (will be skipped): {}".format(", ".join(invalid)))
    return valid


def fetch_snapshot_batch(quote_ctx, codes, batch_size=10):
    """
    銘柄をバッチに分けて取得。1バッチが失敗しても他のバッチは継続
    """
    all_results = {}
    batches = [codes[i:i+batch_size] for i in range(0, len(codes), batch_size)]

    for i, batch in enumerate(batches):
        try:
            ret, df = quote_ctx.get_market_snapshot(batch)
            if ret != 0:
                log("  WARN batch {} failed: {}".format(i+1, df))
                continue
            for _, row in df.iterrows():
                code = row.get("code", "")
                try:
                    last_price = float(row["last_price"])
                    open_price = float(row.get("open_price", last_price) or last_price)
                    high_price = float(row.get("high_price", last_price) or last_price)
                    low_price  = float(row.get("low_price",  last_price) or last_price)
                    prev_close = float(row.get("prev_close_price", last_price) or last_price)
                    volume     = int(row.get("volume", 0) or 0)
                    change     = last_price - prev_close
                    change_pct = (change / prev_close * 100) if prev_close else 0.0

                    all_results[code] = {
                        "price":     round(last_price, 2),
                        "open":      round(open_price, 2),
                        "high":      round(high_price, 2),
                        "low":       round(low_price,  2),
                        "prevClose": round(prev_close, 2),
                        "change":    round(change, 2),
                        "changePct": round(change_pct, 3),
                        "volume":    volume,
                        "currency":  "USD",
                        "timestamp": int(time.time() * 1000),
                        "source":    "moomoo_live",
                    }
                except Exception as e:
                    log("  WARN parse error {}: {}".format(code, e))
        except Exception as e:
            log("  ERROR batch {}: {}".format(i+1, e))

    return all_results


def push_to_vercel(prices):
    import urllib.request
    import urllib.error

    url     = "{}/api/push-prices".format(VERCEL_URL)
    payload = json.dumps({
        "secret": PUSH_SECRET,
        "prices": prices,
    }).encode("utf-8")

    req = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            body = json.loads(res.read().decode())
            return True, body
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        return False, "HTTP {}: {} / {}".format(e.code, e.reason, body[:200])
    except Exception as e:
        return False, str(e)


def main():
    log("=" * 52)
    log("  moomoo OpenD -> Vercel US Realtime Agent")
    log("=" * 52)

    log("CONFIG:")
    log("  VERCEL_URL   = {}".format(VERCEL_URL or "(not set)"))
    log("  PUSH_SECRET  = {}".format(PUSH_SECRET[:4] + "****" if PUSH_SECRET else "(not set)"))
    log("  OPEND_HOST   = {}".format(OPEND_HOST))
    log("  OPEND_PORT   = {}".format(OPEND_PORT))
    log("  INTERVAL_SEC = {}".format(INTERVAL_SEC))

    if not VERCEL_URL or not VERCEL_URL.startswith("http"):
        log("ERROR: VERCEL_URL is not set in .env")
        input("\nPress Enter to exit...")
        sys.exit(1)

    if not PUSH_SECRET or PUSH_SECRET == "your-secret-key":
        log("ERROR: PUSH_SECRET is not set in .env")
        input("\nPress Enter to exit...")
        sys.exit(1)

    try:
        import moomoo as ft
        log("OK  moomoo-api loaded: version={}".format(getattr(ft, "__version__", "unknown")))
    except ImportError as e:
        log("ERROR: moomoo-api not installed: {}".format(e))
        input("\nPress Enter to exit...")
        sys.exit(1)

    log("Connecting to moomoo OpenD ({}:{})...".format(OPEND_HOST, OPEND_PORT))
    try:
        quote_ctx = ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)
        log("OK  OpenD connected")
    except Exception as e:
        log("ERROR: OpenD connection failed: {}".format(e))
        input("\nPress Enter to exit...")
        sys.exit(1)

    # 起動時に有効銘柄を検証
    log("")
    log("=== Symbol validation (startup check) ===")
    valid_stocks = validate_symbols(quote_ctx, US_STOCKS_CANDIDATES)

    if not valid_stocks:
        log("ERROR: No valid symbols found. Exiting.")
        input("\nPress Enter to exit...")
        sys.exit(1)

    valid_codes = [s[0] for s in valid_stocks]
    log("")
    log("OK  {} valid symbols ready for monitoring".format(len(valid_codes)))
    log("Interval: {} sec".format(INTERVAL_SEC))
    log("-" * 52)

    running = [True]
    def on_exit(sig, frame):
        log("STOP signal. Exiting...")
        running[0] = False
    signal.signal(signal.SIGINT, on_exit)

    cycle = 0
    consecutive_errors = 0

    while running[0]:
        cycle += 1
        log("--- Cycle #{} ---".format(cycle))

        prices = fetch_snapshot_batch(quote_ctx, valid_codes, batch_size=10)

        if prices:
            consecutive_errors = 0
            log("  Got {}/{} symbols".format(len(prices), len(valid_codes)))
            # Show top 5
            for code, d in list(prices.items())[:5]:
                sym = next((s for s in valid_stocks if s[0] == code), None)
                name = sym[1] if sym else code
                sign = "+" if d["changePct"] >= 0 else ""
                log("  {} {}: ${:.2f} ({}{:.2f}%)".format(
                    code, name, d["price"], sign, d["changePct"]))
            if len(prices) > 5:
                log("  ... and {} more".format(len(prices) - 5))

            log("Pushing to Vercel...")
            ok, resp = push_to_vercel(prices)
            if ok:
                log("OK  Push success: received={} updatedAt={}".format(
                    resp.get("received", "?"), resp.get("updatedAt", "?")))
            else:
                log("ERROR push failed: {}".format(resp))
                consecutive_errors += 1
        else:
            log("WARN no price data (market may be closed)")
            log("  US market hours (JST): 22:30-05:00 weekdays")
            consecutive_errors += 1

        if consecutive_errors >= 5:
            log("WARN 5 consecutive errors. Waiting 60 sec...")
            time.sleep(60)
            consecutive_errors = 0
            continue

        if running[0]:
            log("Sleeping {} sec...".format(INTERVAL_SEC))
            for _ in range(INTERVAL_SEC):
                if not running[0]:
                    break
                time.sleep(1)

    log("Agent stopped.")
    try:
        quote_ctx.close()
    except Exception:
        pass


if __name__ == "__main__":
    main()
