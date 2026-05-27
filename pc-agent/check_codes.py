# -*- coding: utf-8 -*-
"""
moomoo Japan stock code checker
Run this first to find the correct code format for JP stocks.
"""
import sys

try:
    import moomoo as ft
except ImportError:
    print("ERROR: moomoo-api not installed")
    sys.exit(1)

print("Connecting to OpenD...")
try:
    quote_ctx = ft.OpenQuoteContext(host="127.0.0.1", port=11111)
    print("Connected OK")
except Exception as e:
    print("Connection failed: {}".format(e))
    sys.exit(1)

# Test various code formats for Toyota
test_codes = [
    "JP.7203",
    "JP.07203",
    "JP.7203.T",
    "TSE.7203",
    "SZ.7203",
]

print("\n--- Testing code formats for Toyota ---")
for code in test_codes:
    ret, df = quote_ctx.get_market_snapshot([code])
    if ret == 0 and len(df) > 0:
        price = df.iloc[0].get("last_price", "N/A")
        print("OK  {} -> price: {}".format(code, price))
    else:
        print("NG  {} -> {}".format(code, df if ret != 0 else "no data"))

# Try searching JP stocks via get_stock_basicinfo
print("\n--- Searching JP market stocks ---")
try:
    ret, df = quote_ctx.get_stock_basicinfo(ft.Market.JP, ft.SecurityType.STOCK)
    if ret == 0 and len(df) > 0:
        print("Found {} JP stocks. Sample codes:".format(len(df)))
        print(df[["code","name"]].head(10).to_string())
        
        # Find Toyota
        toyota = df[df["name"].str.contains("TOYOTA|Toyota|7203", case=False, na=False)]
        if len(toyota) > 0:
            print("\nToyota found:")
            print(toyota[["code","name"]].to_string())
    else:
        print("JP market info error: {}".format(df))
except Exception as e:
    print("Exception: {}".format(e))

quote_ctx.close()
print("\nDone. Check results above to find correct code format.")
input("Press Enter to exit...")
