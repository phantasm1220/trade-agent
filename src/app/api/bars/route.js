// /api/bars — ウォームアップ専用: 必ずYahoo Finance から5日分barsを取得
// moomooキャッシュに関係なく常にYahooから取得する
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

async function fetchBars(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=5d`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      // キャッシュなし: 常に最新を取得
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta       = result.meta;
    const quote      = result.indicators?.quote?.[0] || {};
    const timestamps = result.timestamp || [];
    const opens  = quote.open   || [];
    const highs  = quote.high   || [];
    const lows   = quote.low    || [];
    const closes = quote.close  || [];
    const vols   = quote.volume || [];

    // 直近60本
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
    return {
      code:     symbol,
      bars,
      closes:   validCloses.slice(-60),
      currency: meta.currency || (symbol.endsWith(".T") ? "JPY" : "USD"),
    };
  } catch (e) {
    console.error(`fetchBars(${symbol}):`, e.message);
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const market  = searchParams.get("market") || "JP";
  const symbols = market === "JP" ? JP_SYMBOLS : US_SYMBOLS;

  const results = await Promise.allSettled(
    symbols.map(s => fetchBars(s))
  );

  const barsData = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value?.bars?.length >= 25) {
      barsData[symbols[i]] = r.value;
    }
  });

  return Response.json({
    success: true,
    market,
    count:  Object.keys(barsData).length,
    total:  symbols.length,
    bars:   barsData,
    fetchedAt: new Date().toISOString(),
  });
}
