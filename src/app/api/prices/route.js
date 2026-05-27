// src/app/api/prices/route.js
export const dynamic = "force-dynamic";

const JP_SYMBOLS = [
  "7203.T","6758.T","9984.T","6861.T","4063.T",
  "8306.T","7974.T","6367.T","9432.T","4568.T",
  "6501.T","6902.T","7267.T","7201.T","6702.T",
  "8316.T","8411.T","9433.T","4502.T","4519.T",
  "6594.T","6645.T","6971.T","7733.T","8035.T",
  "9020.T","9021.T","9022.T","3382.T","2914.T",
];

const US_SYMBOLS = [
  "NVDA","AAPL","MSFT","TSLA","AMZN",
  "META","GOOGL","AMD","PLTR","SMCI",
  "NFLX","ORCL","CRM","INTC","QCOM",
  "AVGO","TSM","ASML","COIN","HOOD",
  "UBER","SPOT","SHOP","PYPL","SNOW",
  "DDOG","CRWD","ARM","MSTR","V",
];

// ─── Yahoo Finance v8（バーデータ付き）─────────────────────────
async function fetchYahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=5d`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta       = result.meta;
    const quote      = result.indicators?.quote?.[0] || {};
    const timestamps = result.timestamp || [];
    const opens      = quote.open   || [];
    const highs      = quote.high   || [];
    const lows       = quote.low    || [];
    const closes     = quote.close  || [];
    const vols       = quote.volume || [];

    // バーデータ（最新60本: RSI14・SMA20・BB20・EMA26全て計算可能）
    const bars = [];
    for (let i = Math.max(0, timestamps.length - 60); i < timestamps.length; i++) {
      if (closes[i] == null) continue;
      bars.push({
        t: timestamps[i] * 1000,
        o: opens[i]  || closes[i],
        h: highs[i]  || closes[i],
        l: lows[i]   || closes[i],
        c: closes[i],
        v: vols[i]   || 0,
      });
    }

    const validCloses = closes.filter(Boolean);
    const price     = meta.regularMarketPrice || validCloses[validCloses.length - 1];
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const change    = prevClose ? price - prevClose : 0;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    return {
      code:      symbol,
      price:     Math.round(price * 100) / 100,
      open:      meta.regularMarketOpen || opens.filter(Boolean)[0] || price,
      high:      meta.regularMarketDayHigh || Math.max(...highs.filter(Boolean), price),
      low:       meta.regularMarketDayLow  || Math.min(...lows.filter(Boolean), price),
      prevClose: prevClose || price,
      change:    Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      volume:    vols.filter(Boolean).pop() || 0,
      currency:  meta.currency || (symbol.endsWith(".T") ? "JPY" : "USD"),
      bars,
      timestamp: Date.now(),
      source:    "yahoo_finance",
    };
  } catch (e) {
    console.error(`fetchYahooQuote(${symbol}):`, e.message);
    return null;
  }
}

// ─── Finnhub（US株・バーデータ付き）─────────────────────────────
async function fetchFinnhubQuote(symbol) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  try {
    const [q, c] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`, { next:{ revalidate:15 } }).then(r=>r.json()),
      fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=5&count=30&token=${key}`, { next:{ revalidate:15 } }).then(r=>r.json()),
    ]);
    if (!q.c || q.c === 0) return null;
    const bars = [];
    if (c.s === "ok" && c.t) {
      for (let i = 0; i < c.t.length; i++) {
        bars.push({ t: c.t[i]*1000, o: c.o[i], h: c.h[i], l: c.l[i], c: c.c[i], v: c.v?.[i]||0 });
      }
    }
    return {
      code: symbol, price: q.c, open: q.o, high: q.h, low: q.l,
      prevClose: q.pc, change: q.d, changePct: q.dp,
      volume: 0, currency: "USD", bars,
      timestamp: Date.now(), source: "finnhub",
    };
  } catch { return null; }
}

// ─── Yahooからバーデータだけ取得（moomoo価格と組み合わせる用）──
async function fetchYahooBarsOnly(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=5d`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 300 }, // バーは5分キャッシュでOK
    });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const timestamps = result.timestamp || [];
    const quote      = result.indicators?.quote?.[0] || {};
    const bars = [];
    for (let i = Math.max(0, timestamps.length - 60); i < timestamps.length; i++) {
      if (quote.close?.[i] == null) continue;
      bars.push({
        t: timestamps[i] * 1000,
        o: quote.open?.[i]   || quote.close[i],
        h: quote.high?.[i]   || quote.close[i],
        l: quote.low?.[i]    || quote.close[i],
        c: quote.close[i],
        v: quote.volume?.[i] || 0,
      });
    }
    return bars;
  } catch { return []; }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const market  = searchParams.get("market") || "JP";
  const symbols = market === "JP" ? JP_SYMBOLS : US_SYMBOLS;

  const cache      = globalThis._priceCache || {};
  const cacheAge   = globalThis._priceCacheUpdatedAt
    ? (Date.now() - new Date(globalThis._priceCacheUpdatedAt).getTime()) / 1000
    : null;
  const cacheValid = cacheAge !== null && cacheAge < 60;

  const prices = {};
  let moomooCount = 0, yahooCount = 0;

  await Promise.allSettled(
    symbols.map(async (sym) => {
      if (market === "US") {
        const mKey = `US.${sym}`;

        // moomooキャッシュが有効な場合：価格はmoomoo、バーはYahooから取得
        if (cacheValid && cache[mKey]) {
          const cached = cache[mKey];
          // バーデータをYahooから取得（5分キャッシュなので高速）
          const bars = await fetchYahooBarsOnly(sym);
          prices[sym] = {
            ...cached,
            code:    sym,
            source:  "moomoo_live",
            bars,    // ← ここが重要：バーを必ず付ける
          };
          moomooCount++;
          return;
        }

        // フォールバック: Finnhub → Yahoo
        let d = await fetchFinnhubQuote(sym);
        if (!d) d = await fetchYahooQuote(sym);
        if (d?.price) { prices[sym] = d; yahooCount++; }

      } else {
        // JP株: kabuキャッシュ優先（kabu_agent.pyが7203.T形式で送信）
        if (cacheValid && cache[sym]) {
          const cached = cache[sym];
          const bars = await fetchYahooBarsOnly(sym);
          prices[sym] = {
            ...cached,
            code:   sym,
            source: "kabu_live",
            bars,
          };
          moomooCount++; // kabuもmoomooカウンタで管理（dataSource判定に使用）
          return;
        }
        // フォールバック: Yahoo Finance
        const d = await fetchYahooQuote(sym);
        if (d?.price) { prices[sym] = d; yahooCount++; }
      }
    })
  );

  return Response.json({
    success:    true,
    market,
    count:      Object.keys(prices).length,
    total:      symbols.length,
    moomooCount,
    yahooCount,
    cacheAge:   cacheAge ? Math.round(cacheAge) : null,
    cacheValid,
    prices,
    fetchedAt:  new Date().toISOString(),
    dataSource: moomooCount > 0 ? (market === "JP" ? "kabu_realtime" : "moomoo_realtime") : "yahoo_delayed",
  });
}
