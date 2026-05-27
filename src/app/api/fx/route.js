// src/app/api/fx/route.js
// Yahoo Finance から USD/JPY リアルタイム為替レートを取得
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/USDJPY=X?interval=1m&range=1d",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("no result");

    const meta = result.meta;
    const rate = meta.regularMarketPrice || meta.previousClose;
    if (!rate || rate <= 0) throw new Error("invalid rate");

    return Response.json({
      success:   true,
      rate:      Math.round(rate * 100) / 100,
      source:    "yahoo_finance",
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("FX fetch error:", e.message);
    return Response.json({
      success:   false,
      rate:      150.0,
      source:    "fallback",
      error:     e.message,
      fetchedAt: new Date().toISOString(),
    });
  }
}
