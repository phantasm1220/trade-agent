// src/app/api/ai-failure/route.js
// Gemini 2.5 Flash Lite で失敗・成功分析
export const dynamic = "force-dynamic";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

export async function POST(request) {
  const { pos, exitPrice, pct, rules, isSuccess = false, successDetails = null } = await request.json();

  const existingRules = rules.map((r, i) => `${i+1}. [${r.cat}] ${r.rule}`).join("\n");

  const prompt = isSuccess
    ? `あなたはプロのトレードコーチです。以下の【成功トレード】を分析し、何が良かったかを抽出して再現性のあるルールを提案してください。

【成功トレード】
銘柄: ${pos.name}(${pos.code})
買値: ${pos.buyPrice?.toFixed?.(2)}
売値: ${exitPrice?.toFixed?.(2)}
利益: +${pct.toFixed(2)}%
保有時間: ${pos.buyTime || "不明"}
買い根拠: ${pos.reason}
テクニカル: RSI=${pos.rsi || "?"} トレンド=${pos.trend || "?"} パターン=${pos.pattern || "?"}
${successDetails ? `追加情報: ${successDetails}` : ""}

【既存ルール（重複不可）】
${existingRules}

以下のJSONのみ返す（他テキスト不要）:
{"type":"success","whatWorked":"<何が機能したか（日本語）>","replicable":"<再現するための条件（日本語）>","newRule":"<追加すべき具体的ルール（日本語・既存と重複しないこと）>","category":"エントリー|エグジット|銘柄選定|リスク管理","confidence":<このルールの信頼度0-100>}`
    : `あなたはプロのトレードコーチです。以下の【失敗トレード】を徹底分析し、再発防止のための具体的なルールを提案してください。

【失敗トレード】
銘柄: ${pos.name}(${pos.code})
買値: ${pos.buyPrice?.toFixed?.(2)}
売値: ${exitPrice?.toFixed?.(2)}
損失: ${pct.toFixed(2)}%
買い根拠: ${pos.reason}
エントリー時テクニカル: RSI=${pos.rsi || "?"} トレンド=${pos.trend || "?"} パターン=${pos.pattern || "?"}

【既存ルール（重複不可）】
${existingRules}

失敗原因を3つの観点（エントリータイミング・リスク管理・市場環境認識）から分析し、
以下のJSONのみ返す（他テキスト不要）:
{"type":"failure","cause":"<失敗の主因（日本語）>","lesson":"<学んだ教訓（日本語）>","newRule":"<追加すべき具体的なルール（日本語・既存と重複しないこと）>","category":"リスク管理|エントリー|エグジット|銘柄選定","prevention":"<再発防止策（日本語）>","confidence":<このルールの信頼度0-100>}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 400,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) {
      console.error("Gemini ai-failure error:", res.status, await res.text());
      return Response.json({});
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const m = text.replace(/```json\n?|```\n?/g, "").trim().match(/\{[\s\S]*\}/);
    if (!m) return Response.json({});
    return Response.json(JSON.parse(m[0]));
  } catch (e) {
    console.error("ai-failure exception:", e.message);
    return Response.json({});
  }
}
