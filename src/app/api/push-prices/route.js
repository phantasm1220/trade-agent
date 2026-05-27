// src/app/api/push-prices/route.js
// PCのPythonスクリプトから送られてくるリアルタイム株価を受信・保存する
// メモリキャッシュ（Vercelは関数間でメモリ共有しないため、globalThisを使用）

export const dynamic = "force-dynamic";

// グローバルキャッシュ（同一インスタンス内で共有）
if (!globalThis._priceCache) {
  globalThis._priceCache = {};
  globalThis._priceCacheUpdatedAt = null;
}

export async function POST(request) {
  try {
    const body = await request.json();

    // シークレットキーで不正送信を防止
    const secret = process.env.PUSH_SECRET;
    if (secret && body.secret !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.prices || typeof body.prices !== "object") {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 受信した価格データをキャッシュに保存
    globalThis._priceCache = {
      ...globalThis._priceCache,
      ...body.prices,
    };
    globalThis._priceCacheUpdatedAt = new Date().toISOString();

    const count = Object.keys(body.prices).length;
    console.log(`[push-prices] Received ${count} symbols at ${globalThis._priceCacheUpdatedAt}`);

    return Response.json({
      success: true,
      received: count,
      updatedAt: globalThis._priceCacheUpdatedAt,
    });
  } catch (e) {
    console.error("[push-prices] Error:", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// GETでキャッシュの状態確認用
export async function GET() {
  return Response.json({
    cached: Object.keys(globalThis._priceCache || {}).length,
    updatedAt: globalThis._priceCacheUpdatedAt,
    symbols: Object.keys(globalThis._priceCache || {}),
  });
}
