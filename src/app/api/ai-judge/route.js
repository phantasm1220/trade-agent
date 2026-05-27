// /src/app/api/ai-judge/route.js
// デイトレ・スイング両対応。tradeTypeで分岐。
export const dynamic = "force-dynamic";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

function buildPrompt({ sd, inds, dailyInds, totalAssets, cash, posCount, rules, usdJpy, tradeType, atrDay }) {
  const cur  = sd.currency || "JPY";
  const fp   = (v) => v == null ? "--" : cur === "JPY" ? `¥${Math.round(v).toLocaleString()}` : `$${Number(v).toFixed(2)}`;
  const p    = sd.price;
  const ruleText = (rules||[]).slice(0,8).map((r,i)=>`${i+1}.${r.rule}`).join("\n");

  if (tradeType === "day") {
    // ATRベースの損切幅（5分足ATR × 1.5 または -1.5%の大きい方）
    const atr5m = inds.atr || (p * 0.008); // ATRなければ0.8%で代替
    const slDelta = Math.max(atr5m * 1.5, p * 0.008); // 最低0.8%
    const slMax   = p * 0.018; // 最大1.8%
    const suggestSL = p - Math.min(slDelta, slMax);
    const suggestT1 = p + slDelta * 2; // RR2:1
    const suggestT2 = p + slDelta * 3; // RR3:1

    return `あなたはプロの株式デイトレーダーAIです。
本日中に決済するデイトレードとして判断してください。

【銘柄】${sd.name}(${sd.code}) ${cur} USD/JPY:${usdJpy}
【5分足データ】
- 現値:${fp(p)} 変動:${(sd.changePct||0).toFixed(2)}% 高値:${fp(sd.high)} 安値:${fp(sd.low)}
- 出来高:${sd.volume?.toLocaleString()||"--"} (5日平均比:${sd.volRatio!=null?sd.volRatio.toFixed(2)+"x":"--"})
- RSI(14): ${inds.rsi?.toFixed(1)??"--"}
- トレンド: ${inds.trend} (SMA5:${fp(inds.s5)} SMA20:${fp(inds.s20)})
- パターン: ${inds.pattern}
- MACD: ${inds.macd?.toFixed(2)??"--"}
- BB: 上${fp(inds.bb?.upper)} 下${fp(inds.bb?.lower)}
- ATR(5分足): ${fp(atr5m)}
【資金】¥${totalAssets?.toLocaleString()} 現金:¥${cash?.toLocaleString()} 保有:${posCount}/3

【デイトレ損切・目標の目安（参考）】
- 推奨損切: ${fp(suggestSL)} (ATR×1.5 = ${fp(slDelta)}幅)
- 推奨T1: ${fp(suggestT1)} (RR 2:1)
- 推奨T2: ${fp(suggestT2)} (RR 3:1)
- ※損切幅は最大1.8%まで。それ以上ならskipを推奨

【ルール】
${ruleText}

【デイトレ判断基準】
- 当日出来高が5日平均の1.5倍以上 → ブレイクアウト有効
- RSI 35〜65 のみエントリー可
- SMA20なし・trend=unknown → skip必須
- 損切幅が現値の1.8%超になる場合はskipを返す
- buy_now = 今すぐ成行エントリー
- buy_limit = 指値待ち（押し目・上抜け）
- skip = 見送り
- sell = 売り判断（保有ポジション評価時）

以下JSONのみ（コードブロック不要）:
{"action":"buy_now|buy_limit|skip|sell","tradeType":"day","entryType":"breakout|pullback|limit_above|market","confidence":<0-100>,"entryPrice":<数値>,"entryReason":"<理由>","stopLoss":<数値>,"target1":<数値>,"target2":<数値>,"riskReward":<RR比>,"reason":"<60文字>"}`;
  }

  // スイングトレード
  const atrD    = atrDay || (p * 0.025);
  const slSwing = p - Math.min(atrD * 2, p * 0.07); // ATR×2 または -7%の小さい方
  const t1Swing = p + atrD * 3;
  const t2Swing = p + atrD * 5;

  return `あなたはプロの株式スイングトレーダーAIです。
数日〜2週間保有を前提としたスイングトレードとして判断してください。

【銘柄】${sd.name}(${sd.code}) ${cur} USD/JPY:${usdJpy}
【日足データ】
- 現値:${fp(p)} 変動:${(sd.changePct||0).toFixed(2)}%
- 日足RSI(14): ${dailyInds.rsi?.toFixed(1)??"--"}
- 日足トレンド: ${dailyInds.trend} (SMA20:${fp(dailyInds.s20)} SMA50:${fp(dailyInds.s50)})
- 日足パターン: ${dailyInds.pattern}
- 日足MACD: ${dailyInds.macd?.toFixed(2)??"--"}
- 日足BB: 上${fp(dailyInds.bb?.upper)} 中${fp(dailyInds.bb?.mid)} 下${fp(dailyInds.bb?.lower)}
- 日足ATR: ${fp(atrD)}
【5分足補助】RSI:${inds.rsi?.toFixed(1)??"--"} トレンド:${inds.trend} パターン:${inds.pattern}
【資金】¥${totalAssets?.toLocaleString()} 現金:¥${cash?.toLocaleString()} 保有:${posCount}/3

【スイング損切・目標の目安（参考）】
- 推奨損切: ${fp(slSwing)} (日足ATR×2 = ${fp(atrD*2)}幅、最大-7%)
- 推奨T1: ${fp(t1Swing)} (ATR×3)
- 推奨T2: ${fp(t2Swing)} (ATR×5)

【ルール】
${ruleText}

【スイング判断基準】
- 日足トレンドがuptrend必須（日足SMA20 > SMA50）
- 日足RSI 40〜65 のみエントリー可
- 損切幅は3〜7%が適切。2%未満はノイズで刈られるためskip
- 損切幅が7%超になる場合もskip
- 日足でエントリーシナリオが描けない場合はskip
- buy_now = 今の価格が良いエントリーポイント
- buy_limit = 押し目待ち・ブレイクアウト確定待ち（スイングでは重要）
- skip = 見送り
- sell = 売り判断

以下JSONのみ（コードブロック不要）:
{"action":"buy_now|buy_limit|skip|sell","tradeType":"swing","entryType":"breakout|pullback|limit_above|market","confidence":<0-100>,"entryPrice":<数値>,"entryReason":"<理由>","stopLoss":<数値>,"target1":<数値>,"target2":<数値>,"riskReward":<RR比>,"reason":"<60文字>"}`;
}

export async function POST(request) {
  const body = await request.json();
  const { inds, usdJpy=150 } = body;

  // SMA20なし・trend不明の場合は強制skip
  if (body.action !== "sell" && (!inds.s20 || inds.trend === "unknown")) {
    return Response.json({ action: "skip", confidence: 0, reason: "テクニカル指標構築中" });
  }

  const prompt = buildPrompt(body);

  try {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 300,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) {
      console.error("Gemini error:", res.status);
      return Response.json({ action: "skip", confidence: 0 });
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const m = text.replace(/```json\n?|```\n?/g,"").trim().match(/\{[\s\S]*\}/);
    if (!m) return Response.json({ action: "skip", confidence: 0 });
    const parsed = JSON.parse(m[0]);

    // スイング: 損切幅が2%未満 or 7%超はskip
    if (parsed.action !== "skip" && parsed.action !== "sell" && parsed.tradeType === "swing") {
      const slPct = Math.abs((body.sd.price - parsed.stopLoss) / body.sd.price * 100);
      if (slPct < 2 || slPct > 7) {
        return Response.json({ action: "skip", confidence: 0,
          reason: `スイング損切幅${slPct.toFixed(1)}%が不適切(2〜7%必要)` });
      }
    }
    // デイ: 損切幅が1.8%超はskip
    if (parsed.action !== "skip" && parsed.action !== "sell" && parsed.tradeType === "day") {
      const slPct = Math.abs((body.sd.price - parsed.stopLoss) / body.sd.price * 100);
      if (slPct > 1.8) {
        return Response.json({ action: "skip", confidence: 0,
          reason: `デイ損切幅${slPct.toFixed(1)}%が広すぎ(最大1.8%)` });
      }
    }

    return Response.json(parsed);
  } catch (e) {
    console.error("ai-judge exception:", e.message);
    return Response.json({ action: "skip", confidence: 0 });
  }
}
