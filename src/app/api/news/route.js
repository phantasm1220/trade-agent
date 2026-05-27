// /src/app/api/news/route.js
// サーバーサイドでFinnhubニュースを取得

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const key    = process.env.FINNHUB_API_KEY;

  if (!symbol) return Response.json({ error: "symbol required" }, { status: 400 });
  if (!key)    return Response.json({ news: [], note: "FINNHUB_API_KEY not set" });

  const to   = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${key}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return Response.json({ news: [] });
    const raw = await res.json();
    const news = Array.isArray(raw)
      ? raw.slice(0, 5).map(a => ({
          headline: a.headline || "",
          summary:  a.summary?.slice(0, 100) || "",
          url:      a.url || "",
          datetime: a.datetime || 0,
        }))
      : [];
    return Response.json({ news });
  } catch (e) {
    return Response.json({ news: [], error: e.message });
  }
}
