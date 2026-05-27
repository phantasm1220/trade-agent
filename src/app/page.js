"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useRef, useCallback } from "react";

const INITIAL_CASH = 5_000_000;
const MAX_POS = 3;

// ─── 銘柄マスタ ───────────────────────────────────────────────
const JP_STOCKS = [
  {code:"7203.T",name:"トヨタ自動車",  sector:"自動車",currency:"JPY"},
  {code:"6758.T",name:"ソニーG",        sector:"電機",  currency:"JPY"},
  {code:"9984.T",name:"ソフトバンクG", sector:"通信",  currency:"JPY"},
  {code:"6861.T",name:"キーエンス",     sector:"電機",  currency:"JPY"},
  {code:"4063.T",name:"信越化学",       sector:"化学",  currency:"JPY"},
  {code:"8306.T",name:"三菱UFJ",        sector:"銀行",  currency:"JPY"},
  {code:"7974.T",name:"任天堂",          sector:"ゲーム",currency:"JPY"},
  {code:"6367.T",name:"ダイキン",       sector:"機械",  currency:"JPY"},
  {code:"9432.T",name:"NTT",            sector:"通信",  currency:"JPY"},
  {code:"4568.T",name:"第一三共",        sector:"医薬",  currency:"JPY"},
  {code:"6501.T",name:"日立製作所",      sector:"電機",  currency:"JPY"},
  {code:"6902.T",name:"デンソー",       sector:"自動車",currency:"JPY"},
  {code:"7267.T",name:"ホンダ",          sector:"自動車",currency:"JPY"},
  {code:"7201.T",name:"日産自動車",      sector:"自動車",currency:"JPY"},
  {code:"6702.T",name:"富士通",          sector:"IT",    currency:"JPY"},
  {code:"8316.T",name:"三井住友FG",     sector:"銀行",  currency:"JPY"},
  {code:"8411.T",name:"みずほFG",       sector:"銀行",  currency:"JPY"},
  {code:"9433.T",name:"KDDI",           sector:"通信",  currency:"JPY"},
  {code:"4502.T",name:"武田薬品",        sector:"医薬",  currency:"JPY"},
  {code:"4519.T",name:"中外製薬",        sector:"医薬",  currency:"JPY"},
  {code:"6594.T",name:"日本電産",        sector:"電機",  currency:"JPY"},
  {code:"6645.T",name:"オムロン",       sector:"電機",  currency:"JPY"},
  {code:"6971.T",name:"京セラ",          sector:"電機",  currency:"JPY"},
  {code:"7733.T",name:"オリンパス",     sector:"精機",  currency:"JPY"},
  {code:"8035.T",name:"東京エレク",     sector:"半導体",currency:"JPY"},
  {code:"9020.T",name:"JR東日本",       sector:"鉄道",  currency:"JPY"},
  {code:"9021.T",name:"JR西日本",       sector:"鉄道",  currency:"JPY"},
  {code:"9022.T",name:"JR東海",         sector:"鉄道",  currency:"JPY"},
  {code:"3382.T",name:"セブン&i",       sector:"小売",  currency:"JPY"},
  {code:"2914.T",name:"JT",             sector:"食品",  currency:"JPY"},
];

const US_STOCKS = [
  {code:"NVDA", name:"NVIDIA",        sector:"半導体",  currency:"USD"},
  {code:"AAPL", name:"Apple",         sector:"Tech",    currency:"USD"},
  {code:"MSFT", name:"Microsoft",     sector:"Tech",    currency:"USD"},
  {code:"TSLA", name:"Tesla",         sector:"EV",      currency:"USD"},
  {code:"AMZN", name:"Amazon",        sector:"EC",      currency:"USD"},
  {code:"META", name:"Meta",          sector:"SNS",     currency:"USD"},
  {code:"GOOGL",name:"Alphabet",      sector:"Tech",    currency:"USD"},
  {code:"AMD",  name:"AMD",           sector:"半導体",  currency:"USD"},
  {code:"PLTR", name:"Palantir",      sector:"AI",      currency:"USD"},
  {code:"SMCI", name:"SuperMicro",    sector:"Server",  currency:"USD"},
  {code:"NFLX", name:"Netflix",       sector:"Media",   currency:"USD"},
  {code:"ORCL", name:"Oracle",        sector:"Cloud",   currency:"USD"},
  {code:"CRM",  name:"Salesforce",    sector:"Cloud",   currency:"USD"},
  {code:"INTC", name:"Intel",         sector:"半導体",  currency:"USD"},
  {code:"QCOM", name:"Qualcomm",      sector:"半導体",  currency:"USD"},
  {code:"AVGO", name:"Broadcom",      sector:"半導体",  currency:"USD"},
  {code:"TSM",  name:"TSMC",          sector:"半導体",  currency:"USD"},
  {code:"ASML", name:"ASML",          sector:"半導体",  currency:"USD"},
  {code:"COIN", name:"Coinbase",      sector:"Crypto",  currency:"USD"},
  {code:"HOOD", name:"Robinhood",     sector:"Fintech", currency:"USD"},
  {code:"UBER", name:"Uber",          sector:"Mobility",currency:"USD"},
  {code:"SPOT", name:"Spotify",       sector:"Media",   currency:"USD"},
  {code:"SHOP", name:"Shopify",       sector:"EC",      currency:"USD"},
  {code:"SQ",   name:"Block",         sector:"Fintech", currency:"USD"},
  {code:"PYPL", name:"PayPal",        sector:"Fintech", currency:"USD"},
  {code:"SNOW", name:"Snowflake",     sector:"Cloud",   currency:"USD"},
  {code:"DDOG", name:"Datadog",       sector:"Cloud",   currency:"USD"},
  {code:"CRWD", name:"CrowdStrike",   sector:"Security",currency:"USD"},
  {code:"ARM",  name:"ARM Holdings",  sector:"半導体",  currency:"USD"},
  {code:"MSTR", name:"MicroStrategy", sector:"Crypto",  currency:"USD"},
];

// ─── テクニカル指標 ────────────────────────────────────────────
function sma(a,n){if(!a||a.length<n)return null;return a.slice(-n).reduce((s,v)=>s+v,0)/n;}
function ema(a,n){if(!a||a.length<n)return null;const k=2/(n+1);let e=a.slice(0,n).reduce((s,v)=>s+v,0)/n;for(let i=n;i<a.length;i++)e=a[i]*k+e*(1-k);return e;}
function rsi14(a){
  if(!a||a.length<15)return null;
  const ch=a.slice(-15).map((v,i,x)=>i===0?0:v-x[i-1]).slice(1);
  const g=ch.filter(c=>c>0).reduce((s,v)=>s+v,0)/14;
  const l=Math.abs(ch.filter(c=>c<=0).reduce((s,v)=>s+v,0))/14;
  return l===0?100:100-100/(1+g/l);
}
function bb20(a){
  if(!a||a.length<20)return null;
  const s=a.slice(-20),m=s.reduce((x,v)=>x+v,0)/20;
  const sd=Math.sqrt(s.reduce((x,v)=>x+(v-m)**2,0)/20);
  return{upper:m+2*sd,mid:m,lower:m-2*sd};
}
function atr14(bars){
  if(!bars||bars.length<14)return null;
  const recent=bars.slice(-14);
  const trs=recent.map((b,i,a)=>{
    if(i===0)return b.h-b.l;
    const pc=a[i-1].c;
    return Math.max(b.h-b.l,Math.abs(b.h-pc),Math.abs(b.l-pc));
  });
  return trs.reduce((s,v)=>s+v,0)/14;
}

function calcInds(closes, bars=[]){
  if(!closes||closes.length<3)return{trend:"unknown",pattern:"neutral",rsi:null,s5:null,s20:null,s50:null,macd:null,bb:null,atr:null};
  const s5=sma(closes,5),s20=sma(closes,20),s50=sma(closes,50);
  const e12=ema(closes,12),e26=ema(closes,26);
  const r=rsi14(closes),b=bb20(closes);
  const macd=(e12&&e26)?e12-e26:null;
  const atrVal=atr14(bars);
  // スイング用トレンド: SMA20 vs SMA50
  const trend=s20&&s50?(s20>s50*1.001?"uptrend":s20<s50*0.999?"downtrend":"sideways")
    :s5&&s20?(s5>s20*1.001?"uptrend":s5<s20*0.999?"downtrend":"sideways"):"unknown";
  const last=closes[closes.length-1];
  let pattern="neutral";
  if(closes.length>=5){
    const hi=Math.max(...closes.slice(-5)),lo=Math.min(...closes.slice(-5));
    if(last>=hi*0.998&&r&&r<72)pattern="breakout";
    else if(last<=lo*1.002)pattern="breakdown";
    else if(r&&r<35)pattern="oversold";
    else if(trend==="uptrend"&&r&&r>42&&r<65)pattern="continuation";
  }
  return{s5,s20,s50,e12,e26,rsi:r,bb:b,macd,trend,pattern,atr:atrVal};
}

const fmtJP=(v)=>v==null?"--":`¥${Math.round(v).toLocaleString("ja-JP")}`;
const fmtUS=(v)=>v==null?"--":`$${Number(v).toFixed(2)}`;
const fmt=(v,cur)=>cur==="JPY"?fmtJP(v):fmtUS(v);

// ─── バーチャート（ローソク足）SVG ───────────────────────────
function BarChart({bars=[], width=260, height=90, currency="USD", showMA=true}){
  if(!bars||bars.length<2) return(
    <div style={{width,height,display:"flex",alignItems:"center",justifyContent:"center",color:"#a0b4c8",fontSize:10}}>
      チャートデータ取得中...
    </div>
  );

  const n=bars.length;
  const allH=bars.map(b=>b.h),allL=bars.map(b=>b.l);
  const minP=Math.min(...allL)*0.999,maxP=Math.max(...allH)*1.001;
  const range=maxP-minP||1;
  const pad={l:2,r:2,t:4,b:4};
  const W=width-pad.l-pad.r,H=height-pad.t-pad.b;
  const toY=v=>pad.t+H-((v-minP)/range)*H;
  const barW=Math.max(1,Math.floor(W/n)-1);
  const gap=W/n;

  // SMA5 line on chart
  const closes=bars.map(b=>b.c);
  const sma5=[];
  for(let i=0;i<closes.length;i++){
    if(i>=4) sma5.push({x:pad.l+i*gap+gap/2,y:toY(closes.slice(i-4,i+1).reduce((a,b)=>a+b,0)/5)});
  }

  return(
    <svg width={width} height={height} style={{display:"block"}}>
      {bars.map((b,i)=>{
        const x=pad.l+i*gap;
        const cx=x+gap/2;
        const bull=b.c>=b.o;
        const col=bull?"#22c55e":"#ef4444";
        const bodyTop=toY(Math.max(b.o,b.c));
        const bodyBot=toY(Math.min(b.o,b.c));
        const bodyH=Math.max(1,bodyBot-bodyTop);
        return(
          <g key={i}>
            {/* ひげ */}
            <line x1={cx} y1={toY(b.h)} x2={cx} y2={toY(b.l)} stroke={col} strokeWidth="0.8" opacity="0.8"/>
            {/* 実体 */}
            <rect x={x+1} y={bodyTop} width={Math.max(1,barW-1)} height={bodyH} fill={col} opacity="0.9"/>
          </g>
        );
      })}
      {/* SMA5ライン */}
      {showMA&&sma5.length>1&&(
        <polyline
          points={sma5.map(p=>`${p.x},${p.y}`).join(" ")}
          fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.8"
        />
      )}
    </svg>
  );
}

// ─── 価格レベルチャート（改善版）────────────────────────────────
function LevelChart({buy,sl,t1,t2,cur:curPrice,currency,bars=[],entryType,entryReason}){
  const H=220,W=320,LABEL_W=40,PRICE_W=82;
  const LINE_X1=LABEL_W+10,LINE_X2=W-PRICE_W-6;
  const all=[buy,sl,t1,t2,curPrice].filter(v=>v!=null&&v>0&&isFinite(v));
  if(all.length<2)return(
    <div style={{height:60,display:"flex",alignItems:"center",justifyContent:"center",color:"#a0b4c8",fontSize:10}}>
      価格ライン待機中...
    </div>
  );
  const barPrices=(bars||[]).flatMap(b=>[b?.h,b?.l]).filter(v=>v!=null&&isFinite(v)&&v>0);
  const allPrices=[...all,...barPrices];
  if(allPrices.length<2)return null;
  const mn=Math.min(...allPrices)*0.991,mx=Math.max(...allPrices)*1.009,rng=mx-mn||1;
  const PAD_T=14,PAD_B=14;
  const toY=v=>Math.round(PAD_T+(H-PAD_T-PAD_B)*(1-(v-mn)/rng));

  const levels=[
    {v:sl,  lb:"損切", col:"#ef4444",lw:2,  dash:"5,3"},
    {v:t2,  lb:"目標2",col:"#10b981",lw:1,  dash:"3,4"},
    {v:t1,  lb:"目標1",col:"#22c55e",lw:1.5,dash:"5,3"},
    {v:buy, lb:"買値", col:"#f59e0b",lw:2.5,dash:""},
    {v:curPrice,lb:"現在",col:"#a78bfa",lw:1.5,dash:"2,2"},
  ].filter(l=>l.v!=null&&l.v>0);

  // ラベルのY座標を計算（重なり防止：最低14px間隔）
  const MIN_GAP=14;
  const sortedByY=[...levels].sort((a,b)=>toY(a.v)-toY(b.v)); // 上から順（Y小=上）
  const labelYMap={};
  sortedByY.forEach((l,i)=>{
    let y=toY(l.v);
    if(i>0){
      const prevLb=sortedByY[i-1].lb;
      const prevY=labelYMap[prevLb];
      if(y-prevY<MIN_GAP) y=prevY+MIN_GAP;
    }
    labelYMap[l.lb]=y;
  });

  const barsToShow=bars.slice(-24);
  const n=barsToShow.length;
  const barAreaW=LINE_X2-LINE_X1;

  return(
    <div>
      <svg width={W} height={H} style={{display:"block"}}>
        {/* 背景ローソク足 */}
        {barsToShow.map((b,i)=>{
          const x=LINE_X1+(i/(Math.max(n-1,1)))*barAreaW;
          const bull=b.c>=b.o;
          const bw=Math.max(2,(barAreaW/n)*0.65);
          const bodyTop=toY(Math.max(b.o,b.c));
          const bodyBot=toY(Math.min(b.o,b.c));
          return(
            <g key={i}>
              <line x1={x} y1={toY(b.h)} x2={x} y2={toY(b.l)}
                stroke={bull?"#22c55e44":"#ef444444"} strokeWidth="1"/>
              <rect x={x-bw/2} y={bodyTop} width={bw}
                height={Math.max(1,bodyBot-bodyTop)}
                fill={bull?"#22c55e2a":"#ef44442a"}/>
            </g>
          );
        })}
        {/* 損益帯 */}
        {buy&&curPrice&&(
          <rect x={LINE_X1-3} y={Math.min(toY(buy),toY(curPrice))} width={6}
            height={Math.max(2,Math.abs(toY(buy)-toY(curPrice)))}
            fill={curPrice>=buy?"#22c55e":"#ef4444"} opacity={0.32} rx={2}/>
        )}
        {/* レベルライン + ラベル（背景付き・オフセット対応） */}
        {levels.map((l)=>{
          const lineY=toY(l.v);
          const lbY=labelYMap[l.lb]??lineY;
          return(
            <g key={l.lb}>
              {/* 水平ライン */}
              <line x1={LINE_X1} y1={lineY} x2={LINE_X2} y2={lineY}
                stroke={l.col} strokeWidth={l.lw}
                strokeDasharray={l.dash||undefined} opacity={0.92}/>
              {/* ラベルとラインが離れている場合の縦の結線 */}
              {Math.abs(lbY-lineY)>5&&(
                <line x1={LABEL_W+4} y1={Math.min(lbY,lineY)}
                  x2={LABEL_W+4} y2={Math.max(lbY,lineY)}
                  stroke={l.col} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.35"/>
              )}
              {/* 左ラベル（背景ボックス付き） */}
              <rect x={1} y={lbY-10} width={LABEL_W-2} height={14} fill="#07090f" rx={2}/>
              <text x={3} y={lbY+1} fill={l.col} fontSize={9}
                fontFamily="'JetBrains Mono',monospace" fontWeight="bold">{l.lb}</text>
              {/* 右価格（背景ボックス付き） */}
              <rect x={LINE_X2+4} y={lbY-10} width={PRICE_W-4} height={14} fill="#07090f" rx={2}/>
              <text x={W-4} y={lbY+1} fill={l.col} fontSize={10}
                fontFamily="'JetBrains Mono',monospace" fontWeight="bold" textAnchor="end">
                {fmt(l.v,currency)}
              </text>
            </g>
          );
        })}
      </svg>
      {/* 凡例 + エントリータイプ */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,flexWrap:"wrap",gap:4}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[["損切","#ef4444"],["買値","#f59e0b"],["目標1","#22c55e"],["目標2","#10b981"],["現在","#a78bfa"]].map(([lb,col])=>(
            <span key={lb} style={{fontSize:9,color:col,display:"flex",alignItems:"center",gap:3}}>
              <span style={{display:"inline-block",width:12,height:2,background:col}}/>
              {lb}
            </span>
          ))}
        </div>
        {entryType&&(
          <span style={{fontSize:9,color:"#64748b",background:"#1a2535",padding:"2px 6px",borderRadius:3}}>
            {entryType==="pullback"?"📉 押し目待ち":entryType==="breakout"?"📈 ブレイクアウト待ち":entryType==="limit_above"?"⬆ 上抜け待ち":"⚡ 即エントリー"}
          </span>
        )}
      </div>
      {entryReason&&(
        <div style={{fontSize:9,color:"#7a9ab8",marginTop:3}}>💡 {entryReason}</div>
      )}
    </div>
  );
}


// ─── バッジ ───────────────────────────────────────────────────
function Badge({label,value,type="n"}){
  const cls={b:"badge-b",r:"badge-r",w:"badge-y",y:"badge-y",n:"badge-n",i:"badge-i",p:"badge-p"}[type]||"badge-n";
  return(
    <span className={cls} style={{display:"inline-flex",gap:3,borderRadius:4,padding:"2px 8px",fontSize:10,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>
      {label&&<span style={{opacity:.65,fontWeight:400}}>{label}</span>}
      <span>{value}</span>
    </span>
  );
}

// ─── AI API呼び出し ────────────────────────────────────────────
async function aiJudge(sd,inds,totalAssets,cash,positions,rules,usdJpy=150,tradeType="day",dailyInds={},atrDay=null){
  try{
    const res=await fetch("/api/ai-judge",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({sd,inds,dailyInds,atrDay,tradeType,totalAssets,cash,posCount:positions.length,rules,usdJpy}),
    });
    if(!res.ok)return null;
    return await res.json();
  }catch{return null;}
}

// 10銘柄ずつバッチで並列AI分析
async function aiJudgeBatch(candidates, totalAssets, cash, positions, rules, usdJpy){
  const BATCH_SIZE = 10;
  const results = [];

  for(let i = 0; i < candidates.length; i += BATCH_SIZE){
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (cand) => {
        const dec = await aiJudge(
          cand.sd, cand.ind,
          totalAssets, cash, positions, rules, usdJpy,
          cand.tradeType || "day",    // デイ/スイング
          cand.dailyInds || {},        // 日足テクニカル
          cand.atrDay || null          // 日足ATR
        );
        return { code: cand.code, name: cand.name, sd: cand.sd,
          ind: cand.ind, tradeType: cand.tradeType, decision: dec };
      })
    );
    batchResults.forEach(r => {
      if(r.status === "fulfilled" && r.value?.decision) {
        results.push(r.value);
      }
    });
    if(i + BATCH_SIZE < candidates.length){
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return results;
}

async function aiAnalyzeTrade(pos,exitPrice,pct,rules,isSuccess=false){
  try{
    const res=await fetch("/api/ai-failure",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        pos:{
          ...pos,
          rsi:   pos.indicators?.rsi,
          trend: pos.indicators?.trend,
          pattern: pos.indicators?.pattern,
        },
        exitPrice,pct,rules,isSuccess,
      }),
    });
    if(!res.ok)return null;
    return await res.json();
  }catch{return null;}
}

// ═════════════════════════════════════════════════════════════
//  メイン
// ═════════════════════════════════════════════════════════════
export default function TradingAgent(){
  const [market,   setMarket]   = useState("JP");
  const [cash,     setCash]     = useState(INITIAL_CASH);
  const [positions,setPositions]= useState([]);
  const [orders,   setOrders]   = useState([]);
  const [history,  setHistory]  = useState([]);
  const [rules,    setRules]    = useState([
    // ── リスク管理 ──────────────────────────────────────────
    {id:1, rule:"損切はエントリーの-2%以内に必ず設定。感情・希望で変更絶対禁止",
      cat:"リスク管理", src:"初期",
      basis:"プロは1R(リスク単位)を固定し、全ての判断をRの倍数で考える。損切を動かすことは戦略崩壊を意味する"},
    {id:2, rule:"1ポジションのリスクは総資産の1〜2%以内（10%損切なら投入は総資産の10〜20%まで）",
      cat:"リスク管理", src:"初期",
      basis:"プロップファンド・ヘッジファンドの業界標準。1回の損失で全体に大ダメージを与えない"},
    {id:3, rule:"同時保有は最大3銘柄。同セクター（例:半導体）は1銘柄まで",
      cat:"リスク管理", src:"初期",
      basis:"相関リスク管理。NVDA・AMD・TSMCを同時保有は実質1ポジションと同じリスク"},
    {id:4, rule:"日次損失が総資産の3%に達したらその日の取引を全停止",
      cat:"リスク管理", src:"初期",
      basis:"連敗時の感情トレードを物理的に防ぐサーキットブレーカー。プロの必須ルール"},
    {id:5, rule:"週次損失が総資産の6%に達したらその週の取引を停止し戦略を見直す",
      cat:"リスク管理", src:"初期",
      basis:"日次CBを回避した連日の小損失を防ぐ週次の安全網"},
    // ── エントリー ──────────────────────────────────────────
    {id:6, rule:"RSI 35〜65の範囲のみエントリー可。過熱域(70超)・売られすぎ(30未満)は新規禁止",
      cat:"エントリー", src:"初期",
      basis:"RSIは勢いの過熱を示す。極端な値でのエントリーは逆張りになりトレンドに逆らう"},
    {id:7, rule:"SMA20がSMA50を上回り、かつ価格がSMA20より上のときのみロングを検討",
      cat:"エントリー", src:"初期",
      basis:"2本の移動平均クロスでトレンドの方向性を確認する。短期SMA5だけでは騙しが多い"},
    {id:8, rule:"ブレイクアウトエントリーは出来高が直近5日平均の1.5倍以上を必須条件とする",
      cat:"エントリー", src:"初期",
      basis:"出来高を伴わないブレイクアウトは8割がダマシ。出来高は価格動向の真実性を確認する"},
    {id:9, rule:"決算発表日・FOMCの前後24時間は新規エントリーを禁止",
      cat:"エントリー", src:"初期",
      basis:"イベントリスクは方向性が読めない。プロでさえポジションを縮小するタイミング"},
    // ── エグジット ──────────────────────────────────────────
    {id:10, rule:"+3%到達でSLを買値に移動(ブレイクイーブン化)。+5%でSLを+2%に移動",
      cat:"エグジット", src:"初期",
      basis:"段階的トレーリングストップで利益を守りながら上昇を追う。一度のルール設定で感情を排除"},
    {id:11, rule:"T1(+5%)で保有株の50%を利確。残り50%でT2(+10%)を狙う分割決済",
      cat:"エグジット", src:"初期",
      basis:"全量決済はT1到達後の更なる上昇を逃す。分割決済で確定利益を確保しつつアップサイドを維持"},
    {id:12, rule:"デイトレ銘柄は当日引けまでに利益が出ていない場合は全決済",
      cat:"エグジット", src:"初期",
      basis:"翌日に持ち越すことでギャップリスクが発生する。デイトレのポジションは当日完結が原則"},
    // ── 銘柄選定 ──────────────────────────────────────────
    {id:13, rule:"S&P500またはNASDAQが下落トレンド（SMA20割れ）の日はロング銘柄の新規エントリーを禁止",
      cat:"銘柄選定", src:"初期",
      basis:"個別株の8割はインデックスと同方向に動く。逆風の中でのロングは勝率が著しく低下する"},
    {id:14, rule:"ボリンジャーバンド2σ外への新規エントリーは禁止。ただし強いトレンドでの2σタッチは継続保有OK",
      cat:"銘柄選定", src:"初期",
      basis:"統計的に価格は95%の確率で2σ内に回帰する。逸脱は一時的な過熱/売られすぎのサイン"},
    {id:15, rule:"ニュース・決算でギャップアップした銘柄は当日の押し目(SMA5タッチ)を待ってエントリー",
      cat:"銘柄選定", src:"初期",
      basis:"ギャップアップ直後の追いかけ買いは高値掴みになりやすい。押し目は機関投資家の参入確認になる"},
    {id:16, rule:"ブレイクアウトの確定は、価格がブレイクラインを上回ってから1本以上のローソク足がそのラインを維持することを確認する。または、ブレイクアウト後の明確な押し目（SMA20など）での反発を確認してからエントリーする。",
      cat:"エントリー", src:"🤖 学習",
      basis:"ダマシブレイクアウトを避けるための確認ルール。1本のローソク足確定を待つことで成功率が大幅に向上する",
      confidence:90, addedAt:"2026/5/22"},
    {id:17, rule:"SMA20タッチの押し目買いエントリーは、エントリー直前のローソク足がSMA20に陽線でタッチし、かつその後のローソク足がSMA20を上回って引けることを確認してからエントリーする。",
      cat:"エントリー", src:"失敗学習:Qualcomm",
      basis:"SMA20タッチ確認なしのエントリーは下抜けリスクが高い。陽線確定を待つことで偽シグナルを排除できる",
      confidence:85, addedAt:"2026/5/22"},
  ]);
  const [prices,    setPrices]    = useState({});
  const [bars,      setBars]      = useState({}); // 5分足 code -> bars[]
  const [dailyBars, setDailyBars] = useState({}); // 日足 code -> bars[]
  const [dailyInds, setDailyInds] = useState({}); // 日足テクニカル code -> inds
  const [priceHist, setPriceHist] = useState({});
  const [indsMap,   setIndsMap]   = useState({});
  const [marketTrend, setMarketTrend] = useState("unknown"); // SPY/QQQ全体トレンド
  const [logs,     setLogs]     = useState([]);
  const [isRunning,setIsRunning]= useState(false);
  const [fetching, setFetching] = useState(false);
  const [tab,      setTab]      = useState("dashboard");
  const [total,    setTotal]    = useState(INITIAL_CASH);
  const [equity,   setEquity]   = useState([INITIAL_CASH]);
  const [lastUpdate,setLastUpdate]=useState(null);
  const [dataSource,setDataSource]=useState("--");
  const [usdJpy,   setUsdJpy]   = useState(150.0); // USD/JPY 為替レート
  const [fxUpdated,setFxUpdated]= useState(null);

  const runRef   = useRef(false);
  const cycleRef = useRef(null);
  const autoRef  = useRef(null);
  const fxRef    = useRef(null);

  // stateのRef版（agentCycleで最新stateを参照するため）
  const pricesRef    = useRef({});
  const indsMapRef   = useRef({});
  const priceHistRef = useRef({});
  const barsRef      = useRef({});
  const dailyIndsRef = useRef({});
  const dailyBarsRef = useRef({});
  const marketTrendRef = useRef("unknown");
  const positionsRef = useRef([]);
  const ordersRef    = useRef([]);
  const historyRef   = useRef([]);
  const totalRef     = useRef(INITIAL_CASH);
  const cashRef      = useRef(INITIAL_CASH);
  const rulesRef     = useRef([]);
  const usdJpyRef    = useRef(150.0);

  const universe = market==="JP"?JP_STOCKS:US_STOCKS;

  // ─── addLog（最初に定義・他の全useCallbackより前に置く）
  const addLog=useCallback((msg,type="info")=>{
    setLogs(p=>[{msg,type,time:new Date().toLocaleTimeString("ja-JP"),id:Date.now()+Math.random()},...p.slice(0,299)]);
  },[]);

  // ─── 為替レート取得（30分ごと）─────────────────────────────
  const fetchFx = useCallback(async () => {
    try {
      const res = await fetch("/api/fx");
      if (!res.ok) return;
      const data = await res.json();
      if (data.rate && data.rate > 0) {
        setUsdJpy(data.rate);
        setFxUpdated(new Date().toLocaleTimeString("ja-JP"));
        addLog(`💱 USD/JPY: ${data.rate.toFixed(2)}円 [${data.source}]`, "info");
      }
    } catch (e) {
      addLog(`⚠️ 為替取得エラー: ${e.message}`, "warning");
    }
  }, [addLog]);

  useEffect(() => {
    fetchFx();
    fxRef.current = setInterval(fetchFx, 30 * 60 * 1000); // 30分ごと
    return () => clearInterval(fxRef.current);
  }, []);

  // USD建て金額 → JPY換算
  const toJpy = useCallback((usdAmount) => {
    return usdAmount * usdJpy;
  }, [usdJpy]);

  useEffect(()=>{
    // 総資産 = 現金(JPY) + 保有ポジション評価額(JPY換算)
    // cashは常にJPY建て（USD株購入時はcostJpyを引いている）
    const pv=positions.reduce((s,p)=>{
      const curPrice=prices[p.code]?.price||p.buyPrice;
      const posValNative=curPrice*p.lot;
      const posValJpy=p.currency==="USD"?posValNative*usdJpy:posValNative;
      return s+posValJpy;
    },0);
    const t=Math.max(0, cash+pv); // 負にならないようにguard
    setTotal(t);
    setEquity(e=>[...e.slice(-299),t]);
  },[cash,positions,prices,usdJpy]);

  // ─── 株価取得 ───────────────────────────────────────────────
  const fetchPrices=useCallback(async()=>{
    if(fetching)return;
    setFetching(true);
    try{
      const res=await fetch(`/api/prices?market=${market}`);
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      if(!data.prices||Object.keys(data.prices).length===0)throw new Error("empty");

      let ok=0;
      Object.entries(data.prices).forEach(([code,d])=>{
        if(!d?.price)return;
        const stock=universe.find(s=>s.code===code);
        if(!stock)return;
        ok++;
        setPrices(prev=>({...prev,[code]:{...d,name:stock.name,sector:stock.sector}}));
        // バーデータ保存
        if(d.bars&&d.bars.length>0){
          setBars(prev=>({...prev,[code]:d.bars}));
        }
        // 価格履歴更新（barsの終値から即時構築してテクニカル指標を早期計算）
        setPriceHist(prev=>{
          const barCloses=(d.bars||[]).map(b=>b.c).filter(Boolean);
          const existing=prev[code]||[];
          // range=5d取得により barClosesは100本以上来る。60本に絞ってRSI・BB全て計算可能
          const merged=barCloses.length>=25
            ?[...barCloses,d.price].slice(-60)
            :[...existing,d.price].slice(-60);
          setIndsMap(m=>({...m,[code]:calcInds(merged)}));
          return{...prev,[code]:merged};
        });
      });  // forEach end

      setLastUpdate(new Date().toLocaleTimeString("ja-JP"));
      setDataSource(data.dataSource||"yahoo");

      // ログは1行にまとめて出力（銘柄ごとに出さない）
      if(data.moomooCount>0){
        const liveLabel = data.dataSource==="kabu_realtime" ? "🏯 kabu" : "⚡ moomoo";
        const sample=Object.entries(data.prices||{}).slice(0,3)
          .map(([c,d])=>{const s=universe.find(x=>x.code===c);return `${s?.name||c}:${d.currency==="JPY"?fmtJP(d.price):fmtUS(d.price)}(${d.changePct>=0?"+":""}${d.changePct?.toFixed(1)}%)`;}).join(" / ");
        addLog(`${liveLabel} LIVE ${data.moomooCount}銘柄更新 | ${sample}`,"success");
      } else {
        // Yahoo: 変動上位3銘柄だけ表示
        const sorted=Object.entries(data.prices||{})
          .filter(([,d])=>d?.changePct!=null)
          .sort(([,a],[,b])=>Math.abs(b.changePct)-Math.abs(a.changePct))
          .slice(0,3);
        const sample=sorted.map(([c,d])=>{
          const s=universe.find(x=>x.code===c);
          const up=d.changePct>=0;
          return `${up?"▲":"▼"}${s?.name||c}:${d.currency==="JPY"?fmtJP(d.price):fmtUS(d.price)}`;
        }).join("  ");
        addLog(`📊 ${ok}/${universe.length}銘柄更新 | ${sample}`,"info");
      }
    }catch(e){
      addLog(`❌ 取得エラー: ${e.message}`,"danger");
    }finally{
      setFetching(false);
    }
  },[market,universe,fetching,addLog]);

  // ─── 自動更新タイマー（15秒） ─────────────────────────────
  useEffect(()=>{
    if(!isRunning){
      clearInterval(autoRef.current);
      return;
    }
    autoRef.current=setInterval(fetchPrices,15000);
    return()=>clearInterval(autoRef.current);
  },[isRunning,fetchPrices]);

  // 損切チェック用Ref

  // ─── 損切・指値チェック（Refベース）────────────────────────
  useEffect(()=>{
    const doSellFn  = doSellRef.current;
    const execBuyFn = execBuyRef.current;
    if(!doSellFn||!execBuyFn) return;
    positionsRef.current.forEach(pos=>{
      const p=prices[pos.code]?.price;
      if(!p)return;
      if(pos.stopLoss&&p<=pos.stopLoss) doSellFn(pos,p,"🛑 損切ライン到達(自動)");
      else if(pos.target1&&p>=pos.target1) doSellFn(pos,p,"✅ 利益目標T1達成(自動)");
      else if(p>=pos.buyPrice*1.03&&pos.stopLoss<pos.buyPrice){
        setPositions(prev=>prev.map(x=>x.id===pos.id?{...x,stopLoss:pos.buyPrice,trailing:true}:x));
        addLog(`🔒 ${pos.name} トレーリングSL発動`,"success");
      }
    });
    ordersRef.current.forEach(ord=>{
      const p=prices[ord.code]?.price;
      if(!p)return;
      if(ord.type==="buy_limit"&&p<=ord.limitPrice) execBuyFn(ord,p);
      if(ord.type==="buy_stop"&&p>=ord.limitPrice)  execBuyFn(ord,p);
    });
  },[prices]);


  const doSell=useCallback((pos,price,reason)=>{
    const fx=usdJpyRef.current; // 常に最新レートを参照
    setPositions(prev=>prev.filter(x=>x.id!==pos.id));
    const cur=pos.currency||"JPY";
    const pnlNative=(price-pos.buyPrice)*pos.lot;
    const pct=((price-pos.buyPrice)/pos.buyPrice)*100;
    const proceedsJpy=cur==="USD"?price*pos.lot*fx:price*pos.lot;
    setCash(c=>c+proceedsJpy);
    const pnlJpy=cur==="USD"?pnlNative*fx:pnlNative;
    setHistory(h=>[{id:Date.now(),type:"sell",code:pos.code,name:pos.name,price,lot:pos.lot,
      pnlNative,pnlJpy,pct,reason,
      time:new Date().toLocaleTimeString("ja-JP"),currency:cur,
      fxRate:cur==="USD"?fx:null},...h]);
    const pnlDisp=cur==="USD"
      ?`$${pnlNative>=0?"+":""}${pnlNative.toFixed(2)} (¥${Math.round(Math.abs(pnlJpy)).toLocaleString()}換算)`
      :`${pnlJpy>=0?"+":""}¥${Math.round(Math.abs(pnlJpy)).toLocaleString()}`;
    addLog(`📤 ${pos.name} @${fmt(price,cur)} | ${pnlDisp} (${pct.toFixed(2)}%) | ${reason}`,pnlJpy>=0?"success":"danger");
    if(pnlJpy < 0) {
      setTimeout(()=>runTradeAnalysis(pos,price,pct,false),500);
    } else if(pct >= 5) {
      setTimeout(()=>runTradeAnalysis(pos,price,pct,true),500);
    }
  },[addLog]); // usdJpyRef.currentを使うのでusdJpyを依存配列から除去

  const execBuy=useCallback((ord,price)=>{
    const fx=usdJpyRef.current;
    const cur=ord.currency||"JPY";
    const costNative=price*ord.lot;
    const costJpy=cur==="USD"?costNative*fx:costNative;
    // cashを先に確認してから全stateを独立して更新（setCash内でsetPositions等を呼ばない）
    setCash(prev=>{
      if(prev<costJpy) return prev;
      return prev-costJpy;
    });
    // cashの更新とは独立してpositions/orders/historyを更新
    // （cashが不足していても呼ばれるリスクを避けるためcashRefで確認）
    if(cashRef.current < costJpy) return;
    setPositions(p=>{
      // MAX_POS超えガード
      if(p.length>=MAX_POS) return p;
      return [...p,{id:Date.now(),...ord,buyPrice:price,
        buyTime:new Date().toLocaleTimeString("ja-JP"),
        fxRateAtBuy:cur==="USD"?usdJpy:null}];
    });
    setOrders(o=>o.filter(x=>x.id!==ord.id));
    setHistory(h=>[{id:Date.now(),type:"buy",code:ord.code,name:ord.name,
      price,lot:ord.lot,reason:ord.reason,
      time:new Date().toLocaleTimeString("ja-JP"),
      currency:cur,costJpy,fxRate:cur==="USD"?fx:null},...h]);
    addLog(`📥 指値執行: ${ord.name} @${fmt(price,cur)} ${ord.lot}株 (¥${Math.round(costJpy).toLocaleString()})`,"success");
  },[addLog]); // usdJpyRef.currentを使うので依存不要

  // doSell/execBuyの定義後にRefを同期（TDZ対策）
  const doSellRef  = useRef(null);
  const execBuyRef = useRef(null);
  useEffect(()=>{doSellRef.current=doSell;},[doSell]);
  useEffect(()=>{execBuyRef.current=execBuy;},[execBuy]);


  const addRuleIfUnique = useCallback((newRule, category, source, confidence) => {
    setRules(prev => {
      // 既存ルールとの類似チェック（キーワード重複を簡易判定）
      const keywords = newRule.split(/[。、\s]+/).filter(w => w.length >= 3);
      const isDuplicate = prev.some(r => {
        const matchCount = keywords.filter(k => r.rule.includes(k)).length;
        return matchCount >= 2; // 2キーワード以上一致は重複とみなす
      });
      if (isDuplicate) {
  
        return prev;
      }
      const entry = {
        id: Date.now(),
        rule: newRule,
        cat: category,
        src: source,
        confidence: confidence || 0,
        addedAt: new Date().toLocaleDateString("ja-JP"),
      };
      addLog(`📜 新ルール追加[信頼度${confidence||"?"}%]: ${newRule}`, "success");
      return [...prev, entry];
    });
  }, [addLog]);

  const runTradeAnalysis = async (pos, exitPrice, pct, isSuccess) => {
    const label = isSuccess ? "成功" : "失敗";
    const icon  = isSuccess ? "🏆" : "🔍";
    addLog(`${icon} ${label}分析: ${pos.name} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)...`, isSuccess ? "success" : "warning");
    const r = await aiAnalyzeTrade(pos, exitPrice, pct, rules, isSuccess);
    if (!r) return;
    if (isSuccess) {
      addLog(`✨ 成功要因: ${r.whatWorked}`, "success");
      addLog(`🔁 再現条件: ${r.replicable}`, "info");
    } else {
      addLog(`❌ 失敗原因: ${r.cause}`, "danger");
      addLog(`💡 教訓: ${r.lesson}`, "warning");
      if (r.prevention) addLog(`🛡 再発防止: ${r.prevention}`, "info");
    }
    if (r.newRule) {
      addRuleIfUnique(r.newRule, r.category, `${label}学習:${pos.name}`, r.confidence);
    }
  };

  // ─── 同一銘柄の再エントリー禁止タイマー ─────────────────
  const lastBuyTimeRef = useRef({}); // {code: timestamp}

  // ─── エージェントサイクル（Refベース・重複買い防止付き）──
  const agentCycleCount=useRef(0);

  const agentCycle=useCallback(async()=>{
    if(!runRef.current)return;
    // Refから最新のstateを取得（クロージャ問題を完全回避）
    const prices    = pricesRef.current;
    const indsMap   = effectiveInds;  // priceHistから直接再計算した最新値を使用
    const positions = positionsRef.current;
    const orders    = ordersRef.current;
    const history   = historyRef.current;
    const total     = totalRef.current;
    const cash      = cashRef.current;
    const rules     = rulesRef.current;
    const usdJpy    = usdJpyRef.current;
    const universe  = market==="JP"?JP_STOCKS:US_STOCKS;
    const now       = Date.now();

    // 最新テクニカル指標を再計算（5分足）
    const freshInds = {};
    Object.entries(priceHistRef.current).forEach(([code, hist]) => {
      if(hist && hist.length >= 3){
        const barData = barsRef?.current?.[code] || [];
        freshInds[code] = calcInds(hist, barData);
      }
    });
    const effectiveInds = {...indsMapRef.current, ...freshInds};
    // 日足テクニカル（スイング判断用）
    const dailyInds   = dailyIndsRef.current;
    const dailyBarsD  = dailyBarsRef.current;
    const mktTrend    = marketTrendRef.current;

    // サイクル開始ログは省略（STATバーで確認可能）

    // 日次損失チェック
    const dayPnL=history.filter(t=>t.type==="sell").reduce((s,t)=>s+(t.pnlJpy||t.pnl||0),0);
    if(dayPnL<-(total*0.03)){addLog("🚨 日次損失3%超→取引停止","danger");return;}

    if(positions.length<MAX_POS){
      // 市場全体チェック（ルール13: 下落トレンド時はロング禁止）
      if(mktTrend === "downtrend"){
        addLog(`⛔ 市場(SPY/QQQ)が下落トレンド: 新規ロングを停止`, "warning");
        // スイングは完全停止、デイトレは継続
      }

      // 全銘柄スクリーニング（デイ/スイング分類付き）
      const baseCands = universe.filter(s=>{
        if(!prices[s.code]) return false;
        if(positions.find(p=>p.code===s.code)) return false;
        if(orders.find(o=>o.code===s.code)) return false;
        const lastBuy = lastBuyTimeRef.current[s.code] || 0;
        if(now - lastBuy < 10 * 60 * 1000) return false;
        return true;
      });

      // デイ候補: 5分足でモメンタムあり + 出来高増加
      const dayCands = baseCands.map(s=>{
        const ind = effectiveInds[s.code] || {};
        const d   = prices[s.code] || {};
        const vol5avg = dailyInds[s.code]?.vol5avg || 0;
        const volRatio = vol5avg > 0 ? (d.volume||0) / vol5avg : null;
        let score = 0;
        if(ind.trend==="uptrend")       score += 30;
        if(ind.pattern==="breakout")    score += 25;
        if(ind.pattern==="continuation")score += 15;
        if(ind.rsi&&ind.rsi>35&&ind.rsi<65) score += 20;
        if(ind.macd&&ind.macd>0)        score += 10;
        if(volRatio&&volRatio>=1.5)     score += 15; // 出来高増加ボーナス
        return {...s, score, ind, volRatio, tradeType:"day"};
      }).filter(s=>s.score>3&&(!s.ind.rsi||(s.ind.rsi>30&&s.ind.rsi<70)));

      // スイング候補: 日足でトレンド確認（市場下落時は追加）
      const swingCands = mktTrend !== "downtrend" ? baseCands.map(s=>{
        const dInd = dailyInds[s.code] || {};
        const d    = prices[s.code] || {};
        let score = 0;
        if(dInd.trend==="uptrend")       score += 40; // 日足uptrend優先
        if(dInd.s20&&dInd.s50&&dInd.s20>dInd.s50) score += 20; // SMA20>SMA50
        if(dInd.pattern==="breakout")    score += 20;
        if(dInd.pattern==="continuation")score += 15;
        if(dInd.rsi&&dInd.rsi>40&&dInd.rsi<65) score += 15;
        if(dInd.macd&&dInd.macd>0)       score += 10;
        return {...s, score, ind:effectiveInds[s.code]||{}, dInd, tradeType:"swing"};
      }).filter(s=>s.score>15&&s.dInd.trend&&s.dInd.trend!=="unknown") : [];

      // デイ上位5 + スイング上位5を合算してAI分析
      const topDay   = dayCands.sort((a,b)=>b.score-a.score).slice(0,5);
      const topSwing = swingCands.sort((a,b)=>b.score-a.score).slice(0,5);
      const allCands = [...topDay, ...topSwing];

      if(allCands.length===0){
        addLog("⏳ テクニカル指標構築中... しばらくお待ちください","warning");
        return;
      }

      const dayCount   = topDay.length;
      const swingCount = topSwing.length;
      addLog(`🔍 デイ候補:${dayCount}件 スイング候補:${swingCount}件`, "info");

      // 全候補を10銘柄ずつバッチでAI分析
      const batchInput = allCands.map(s=>({
        code: s.code, name: s.name, sd: {...prices[s.code], volRatio:s.volRatio},
        ind: s.ind||{trend:"unknown",pattern:"neutral"},
        dailyInds: s.dInd || dailyInds[s.code] || {},
        atrDay: dailyInds[s.code]?.atr,
        score: s.score,
        tradeType: s.tradeType,
      }));
        addLog(`🤖 AI分析: ${batchInput.length}銘柄を分析中...`,"info");
        const allResults = await aiJudgeBatch(batchInput, total, cash, positions, rules, usdJpy);

        // 結果をログ表示
        const buySignals = allResults.filter(r=>
          (r.decision?.action==="buy_now"||r.decision?.action==="buy_limit"||r.decision?.action==="buy")
          &&r.decision?.confidence>=58
        );
        const holdSignals= allResults.filter(r=>r.decision?.action==="hold"||r.decision?.action==="skip");
        if(buySignals.length > 0) addLog(`📊 分析完了: 買いシグナル${buySignals.length}件`,"success");

        // 買いシグナルをconfidence順にソートして上位から実行
        buySignals.sort((a,b)=>(b.decision.confidence||0)-(a.decision.confidence||0));

        for(const result of buySignals){
          // 毎回Refから最新のpositions数を確認（バッチ処理中に変わっている）
          if(positionsRef.current.length >= MAX_POS){
            addLog(`⛔ 最大保有数(${MAX_POS})に達したためエントリー停止`,"warning");
            break;
          }
          // 現在のpositions/ordersを再チェック（バッチ処理中に変わっている場合）
          if(positionsRef.current.find(p=>p.code===result.code)){

            continue;
          }
          if(ordersRef.current.find(o=>o.code===result.code)){

            continue;
          }

          const dec = result.decision;
          const cur = result.sd.currency || (market==="JP"?"JPY":"USD");
          const price = result.sd.price;
          addLog(`✅ 買いシグナル: ${result.name} confidence:${dec.confidence}% | ${dec.reason}`,"success");

          const budgetJpy = total * 0.12;
          const budgetInCur = cur==="USD" ? budgetJpy/usdJpy : budgetJpy;
          const lot = cur==="JPY"
            ? Math.max(100, Math.floor(budgetInCur/price/100)*100)
            : Math.max(1, Math.floor(budgetInCur/price));
          const costNative = price * lot;
          const costJpy = cur==="USD" ? costNative*usdJpy : costNative;

          if(costNative>0 && costJpy<=cashRef.current){
            const entryTarget = dec.entryPrice || price;
            // buy_limitまたは現値と乖離がある場合は指値注文
            const useLimitOrder = dec.action==="buy_limit" || Math.abs(entryTarget-price)/price > 0.005;
            if(useLimitOrder){
              const orderType = dec.action==="buy_limit"?"buy_limit"
                : entryTarget>price?"buy_stop":"buy_limit"; // 上抜け待ちはstop、押し目待ちはlimit
              setOrders(prev=>[...prev,{
                id:Date.now(), type:orderType, code:result.code, name:result.name,
                limitPrice:entryTarget, stopLoss:dec.stopLoss, target1:dec.target1, target2:dec.target2,
                lot, reason:dec.reason, confidence:dec.confidence, currency:cur,
                riskReward:dec.riskReward, fxRate:cur==="USD"?usdJpy:null,
                entryType:dec.entryType, entryReason:dec.entryReason,
              }]);
              lastBuyTimeRef.current[result.code] = Date.now();
              const typeLabel = entryTarget>price?"⬆ 上抜け待ち":"📉 押し目待ち";
              addLog(`📋 ${typeLabel}: ${result.name} @${fmt(entryTarget,cur)} | 損切:${fmt(dec.stopLoss,cur)} | T1:${fmt(dec.target1,cur)} | RR:${dec.riskReward?.toFixed(2)??"?"} | ${dec.entryReason||dec.reason}`,"info");
            } else {
              // setCashとsetPositionsを独立して更新（setCash内でsetPositions呼ばない）
              setCash(c=>c-costJpy);
              setPositions(p=>{
                if(p.length>=MAX_POS) return p; // MAX_POSガード
                return [...p,{
                  id:Date.now(), code:result.code, name:result.name,
                  buyPrice:price, lot, stopLoss:dec.stopLoss,
                  target1:dec.target1, target2:dec.target2,
                  buyTime:new Date().toLocaleTimeString("ja-JP"),
                  reason:dec.reason, confidence:dec.confidence,
                  currency:cur, riskReward:dec.riskReward,
                  fxRateAtBuy:cur==="USD"?usdJpy:null,
                  tradeType:result.tradeType||dec.tradeType||"day",
                }];
              });
              setHistory(h=>[{
                id:Date.now(), type:"buy", code:result.code, name:result.name,
                price, lot, reason:dec.reason,
                time:new Date().toLocaleTimeString("ja-JP"),
                currency:cur, costJpy, fxRate:cur==="USD"?usdJpy:null,
              },...h]);
              lastBuyTimeRef.current[result.code] = Date.now();
              const costDisp = cur==="USD"
                ? `$${costNative.toFixed(0)} (¥${Math.round(costJpy).toLocaleString()}換算)`
                : `¥${Math.round(costJpy).toLocaleString()}`;
              addLog(`🟢 買い: ${result.name} @${fmt(price,cur)} ${lot}株 | ${costDisp} | ${dec.confidence}%`,"success");
            }
          }
        }

        // 見送りシグナルもサマリー表示
        if(holdSignals.length>0 && buySignals.length===0){
          // 全て見送りの時だけ表示
          addLog(`⏸ 全銘柄見送り (${holdSignals.length}件)`, "info");
        }
      }
    // 保有ポジション評価（全ポジションを同時チェック）
    const posToCheck = positions.filter(pos => {
      const sd  = prices[pos.code];
      const ind = effectiveInds[pos.code] || {}; // effectiveIndsを使用
      if(!sd?.price) return false;
      const pct = ((sd.price - pos.buyPrice) / pos.buyPrice) * 100;
      return Math.abs(pct) >= 2.5 || (ind.rsi && (ind.rsi > 75 || ind.rsi < 25)) || ind.pattern === "breakdown";
    });

    if(posToCheck.length > 0){
      await Promise.allSettled(
        posToCheck.map(async pos => {
          const sd  = prices[pos.code];
          const ind = effectiveInds[pos.code] || {};
          const dec = await aiJudge(sd, ind, total, cash, positions, rules, usdJpy);
          if(dec?.action === "sell") doSell(pos, sd.price, dec.reason || "AI売り判断");
        })
      );
    }
  // refから最新stateを参照するため依存配列は空でOK
  },[market,addLog,doSell]); // eslint-disable-line

  // 全stateをrefに同期（agentCycleのクロージャ問題を解決）
  useEffect(()=>{runRef.current=isRunning;},[isRunning]);
  useEffect(()=>{pricesRef.current=prices;},[prices]);
  useEffect(()=>{indsMapRef.current=indsMap;},[indsMap]);
  useEffect(()=>{priceHistRef.current=priceHist;},[priceHist]);
  useEffect(()=>{barsRef.current=bars;},[bars]);
  useEffect(()=>{dailyIndsRef.current=dailyInds;},[dailyInds]);
  useEffect(()=>{dailyBarsRef.current=dailyBars;},[dailyBars]);
  useEffect(()=>{marketTrendRef.current=marketTrend;},[marketTrend]);
  useEffect(()=>{positionsRef.current=positions;},[positions]);
  useEffect(()=>{ordersRef.current=orders;},[orders]);
  useEffect(()=>{historyRef.current=history;},[history]);
  useEffect(()=>{totalRef.current=total;},[total]);
  useEffect(()=>{cashRef.current=cash;},[cash]);
  useEffect(()=>{rulesRef.current=rules;},[rules]);
  useEffect(()=>{usdJpyRef.current=usdJpy;},[usdJpy]);

  // ウォームアップ: barsデータをYahooから取得してテクニカル指標を事前構築
  const warmupDone = useRef(false);
  const doWarmup = useCallback(async () => {
    if(warmupDone.current) return;
    addLog("🔥 ウォームアップ中... (5分足 + 日足データを取得)", "info");
    try {
      // 5分足（テクニカル指標構築）と日足（スイング判断用）を並列取得
      const [res5m, resDay] = await Promise.all([
        fetch(`/api/bars?market=${market}`),
        fetch(`/api/daily-bars?market=${market}`),
      ]);

      // 5分足処理
      let built5m = 0;
      if(res5m.ok){
        const data5m = await res5m.json();
        Object.entries(data5m.bars || {}).forEach(([code, d]) => {
          const closes = d.closes?.length > 0 ? d.closes : (d.bars||[]).map(b=>b.c).filter(Boolean);
          if(closes.length < 20) return;
          const hist = closes.slice(-60);
          const barData = d.bars || [];
          setPriceHist(prev=>({...prev,[code]:hist}));
          setIndsMap(m=>({...m,[code]:calcInds(hist, barData)}));
          if(barData.length > 0) setBars(prev=>({...prev,[code]:barData}));
          built5m++;
        });
      }

      // 日足処理
      let builtDay = 0;
      if(resDay.ok){
        const dataDay = await resDay.json();
        Object.entries(dataDay.daily || {}).forEach(([code, d]) => {
          const closes = d.closes || (d.bars||[]).map(b=>b.c).filter(Boolean);
          if(closes.length < 20) return;
          const barData = d.bars || [];
          const inds = calcInds(closes.slice(-60), barData);
          setDailyBars(prev=>({...prev,[code]:barData}));
          setDailyInds(prev=>({...prev,[code]:{...inds, atr:d.atr, vol5avg:d.vol5avg}}));
          // SPY/QQQで市場全体トレンドを判定
          if(code === "SPY" || code === "QQQ"){
            if(inds.trend === "uptrend") setMarketTrend("uptrend");
            else if(inds.trend === "downtrend") setMarketTrend("downtrend");
          }
          builtDay++;
        });
      }

      warmupDone.current = true;
      addLog(`✅ ウォームアップ完了: 5分足${built5m}銘柄 / 日足${builtDay}銘柄`, "success");
    } catch(e) {
      addLog(`⚠️ ウォームアップエラー: ${e.message}`, "warning");
    }
  }, [market, addLog]);

  // 自動売買開始/停止
  useEffect(()=>{
    clearInterval(cycleRef.current);
    clearInterval(autoRef.current);
    if(!isRunning) return;
    // 初回: ウォームアップ → 価格取得
    warmupDone.current = false;
    doWarmup().then(() => fetchPrices());
    // 15秒ごとに価格更新
    autoRef.current=setInterval(fetchPrices, 15000);
    return()=>{
      clearInterval(cycleRef.current);
      clearInterval(autoRef.current);
    };
  },[isRunning]); // eslint-disable-line

  // 価格が更新されるたびにAI判断（60秒スロットリング）
  const lastAgentRunRef = useRef(0);
  useEffect(()=>{
    if(!isRunning) return;
    if(Object.keys(prices).length === 0) return;
    const now = Date.now();
    if(now - lastAgentRunRef.current < 85000) return; // 85秒未満はスキップ（実質90秒サイクル）
    lastAgentRunRef.current = now;
    agentCycle();
  },[prices, isRunning]); // pricesが更新されるたびに最新stateで判断

  const sells  =history.filter(t=>t.type==="sell");
  // 勝率: pnlJpyを優先、なければpnlNative、なければpnlで判定
  const wins   =sells.filter(t=>(t.pnlJpy??t.pnlNative??t.pnl??0)>0).length;
  const losses =sells.filter(t=>(t.pnlJpy??t.pnlNative??t.pnl??0)<=0).length;
  const winRate=wins+losses>0?((wins/(wins+losses))*100).toFixed(0):"--";
  // 実現損益: historyのpnlJpy合計（cashとの整合性チェック用）
  const realizedPnL=sells.reduce((s,t)=>s+(t.pnlJpy??((t.pnlNative||t.pnl||0)*(t.currency==="USD"?usdJpy:1))),0);
  // 含み損益: 現在保有ポジションの評価額 - 取得コスト
  const unrealizedPnL=positions.reduce((s,p)=>{
    const curP=prices[p.code]?.price||p.buyPrice;
    const native=(curP-p.buyPrice)*p.lot;
    return s+(p.currency==="USD"?native*usdJpy:native);
  },0);
  // 総損益 = 実現損益 + 含み損益
  const totalPnL=realizedPnL+unrealizedPnL;
  const pnlPct=(totalPnL/INITIAL_CASH)*100;
  let maxDD=0;{let pk=equity[0]||INITIAL_CASH;for(const v of equity){if(v>pk)pk=v;const d=(v-pk)/pk*100;if(d<maxDD)maxDD=d;}}

  const S={card:{background:"#0c1320",border:"1px solid #1a2840",borderRadius:10}};

  return(
    <div style={{fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif",background:"#060a10",color:"#c8d6e5",minHeight:"100vh",fontSize:"12px"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box}
        body{font-family:'Noto Sans JP','Hiragino Sans',sans-serif}
        .mono{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}

        /* ─── アニメーション ─── */
        .pulse{animation:pulse 1.6s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
        .fade{animation:fd .18s ease}
        @keyframes fd{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}

        /* ─── タブ ─── */
        .tab{background:none;border:none;cursor:pointer;padding:10px 18px;
          font-family:inherit;font-size:12px;font-weight:500;
          color:#8aa0b8;border-bottom:2px solid transparent;
          transition:color .15s,border-color .15s;white-space:nowrap}
        .tab:hover{color:#c0d4e8}
        .tab.on{color:#5bc8f5;border-bottom-color:#38bdf8;font-weight:700}

        /* ─── ボタン ─── */
        .btn{border:none;cursor:pointer;font-family:inherit;border-radius:7px;
          font-weight:700;transition:all .12s;letter-spacing:.3px}
        .btn:hover:not(:disabled){filter:brightness(1.15);transform:translateY(-1px)}
        .btn:active:not(:disabled){transform:none}
        .btn:disabled{opacity:.45;cursor:not-allowed}

        /* ─── テーブル ─── */
        table{width:100%;border-collapse:collapse}
        th{padding:7px 12px;text-align:left;color:#8aa0b8;font-size:10px;
          text-transform:uppercase;letter-spacing:.6px;
          border-bottom:1px solid #1e2d3d;font-weight:600}
        td{padding:9px 12px;border-bottom:1px solid #0f1922;font-size:12px;color:#c8d8e8;vertical-align:middle}
        tbody tr:hover td{background:#0d1828}
        tbody tr:last-child td{border-bottom:none}

        /* ─── ログ ─── */
        .log-success{color:#4ade80}
        .log-danger{color:#f87171}
        .log-warning{color:#fbbf24}
        .log-info{color:#8aa0b8}

        /* ─── スクロールバー ─── */
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#07090e}
        ::-webkit-scrollbar-thumb{background:#253545;border-radius:2px}
        ::-webkit-scrollbar-thumb:hover{background:#354a60}

        /* ─── カード ─── */
        .card{background:#0c1320;border:1px solid #1a2840;border-radius:10px;transition:border-color .15s}
        .card:hover{border-color:#253a54}
        .pos-up{border-color:#0d3d28!important}
        .pos-dn{border-color:#3d1010!important}

        /* ─── バッジ ─── */
        .badge-b{background:#052e16;color:#4ade80;border:1px solid #166534}
        .badge-r{background:#2d0f0f;color:#f87171;border:1px solid #7f1d1d}
        .badge-y{background:#2a1a06;color:#fbbf24;border:1px solid #78350f}
        .badge-p{background:#1e1540;color:#c4b5fd;border:1px solid #4c1d95}
        .badge-n{background:#0f1e30;color:#94a3b8;border:1px solid #1e3550}
        .badge-i{background:#061828;color:#38bdf8;border:1px solid #0c4a6e}
      `}</style>

      {/* HEADER */}
      <header style={{background:"#05080f",borderBottom:"1px solid #111d2e",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:isRunning?"#22c55e":"#2a3f55",boxShadow:isRunning?"0 0 10px #22c55e80":undefined}} className={isRunning?"pulse":undefined}/>
          <span style={{fontWeight:700,fontSize:14,letterSpacing:2,color:"#e2e8f0"}}>AI TRADE AGENT</span>
          <span style={{fontSize:10,color:"#64748b",background:"#0a1520",padding:"2px 8px",borderRadius:4}}>
            {dataSource==="kabu_realtime"?"🟢 kabu LIVE":dataSource==="moomoo_realtime"?"🟢 moomoo LIVE":"📊 Yahoo Finance"}
          </span>
          {fetching&&<span className="pulse" style={{fontSize:10,color:"#38bdf8"}}>⬇ 取得中...</span>}
          {isRunning&&<span style={{fontSize:10,color:"#22c55e"}}>⏱ 15秒自動更新</span>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {["JP","US"].map(m=>(
            <button key={m} className="btn" onClick={()=>{setMarket(m);setPrices({});setBars({});}}
              style={{padding:"5px 14px",fontSize:11,background:market===m?"#0f2040":"transparent",border:`1px solid ${market===m?"#1e4080":"#1e2d3d"}`,color:market===m?"#7dd3fc":"#3a5068"}}>
              {m==="JP"?"🇯🇵 日本株 (30)":"🇺🇸 米国株 (30)"}
            </button>
          ))}
          <button className="btn" onClick={fetchPrices} disabled={fetching}
            style={{background:"#0a1828",border:"1px solid #1e3a5f",color:"#38bdf8",padding:"5px 14px",fontSize:11}}>
            {fetching?"⟳ 取得中...":"↻ 今すぐ更新"}
          </button>
          <button className="btn" onClick={()=>setIsRunning(r=>!r)}
            style={{background:isRunning?"#2d0f0f":"#0a2412",border:`1px solid ${isRunning?"#ef4444":"#22c55e"}`,color:isRunning?"#ef4444":"#22c55e",padding:"5px 18px",fontSize:11}}>
            {isRunning?"⏸ 停止":"▶ 自動売買開始"}
          </button>
        </div>
      </header>

      {/* STAT BAR */}
      <div style={{background:"#07101a",borderBottom:"1px solid #152030",padding:"8px 20px",display:"flex",gap:0,overflowX:"auto"}}>
        {[
          {l:"総資産",    v:`¥${total.toLocaleString("ja-JP",{maximumFractionDigits:0})}`,c:"#e8f0f8",bold:true},
          {l:"損益(合計)",v:`${totalPnL>=0?"+":""}¥${Math.round(totalPnL).toLocaleString()}`,c:totalPnL>=0?"#4ade80":"#f87171",bold:true},
          {l:"損益率",    v:`${pnlPct>=0?"+":""}${pnlPct.toFixed(2)}%`,c:pnlPct>=0?"#4ade80":"#f87171"},
          {l:"含み損益",  v:`${unrealizedPnL>=0?"+":""}¥${Math.round(unrealizedPnL).toLocaleString()}`,c:unrealizedPnL>=0?"#86efac":"#fca5a5"},
          {l:"実現損益",  v:`${realizedPnL>=0?"+":""}¥${Math.round(realizedPnL).toLocaleString()}`,c:realizedPnL>=0?"#4ade80":"#f87171"},
          {l:"勝率",      v:`${winRate}% (${wins}勝${losses}敗)`,c:"#c4b5fd"},
          {l:"最大DD",    v:`${maxDD.toFixed(2)}%`,c:"#fbbf24"},
          {l:"保有",      v:`${positions.length}/${MAX_POS}`,c:positions.length>=MAX_POS?"#fbbf24":"#a0b4c8"},
          {l:"指値注文",  v:`${orders.length}件`,c:orders.length>0?"#fbbf24":"#a0b4c8"},
          {l:"USD/JPY",  v:fxUpdated?`${usdJpy.toFixed(2)}円`:"--",c:"#fbbf24"},
          {l:"更新",      v:lastUpdate||"--",c:"#607080"},
        ].map((s,i)=>(
          <div key={s.l} style={{display:"flex",flexDirection:"column",gap:2,whiteSpace:"nowrap",
            padding:"0 16px",borderRight:i<10?"1px solid #152030":"none"}}>
            <span style={{color:"#8096b0",fontSize:9,textTransform:"uppercase",letterSpacing:.6,fontWeight:600}}>{s.l}</span>
            <span className="mono" style={{color:s.c,fontWeight:s.bold?700:600,fontSize:s.bold?13:12}}>{s.v}</span>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{background:"#08111a",borderBottom:"1px solid #111d2e",padding:"0 20px"}}>
        {[["dashboard","📊 ダッシュボード"],["market","📈 マーケット(30銘柄)"],["orders","📝 注文・指値"],["history","📜 履歴"],["rules","⚖️ ルール"]].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {/* CONTENT */}
      <main style={{padding:"12px 16px",maxWidth:1800,margin:"0 auto"}}>

        {/* ━━ DASHBOARD ━━ */}
        {tab==="dashboard"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:12}}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>

              {/* ポジション */}
              <div style={{...S.card,padding:14}}>
                <div style={{fontSize:10,color:"#a0b4c8",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>保有ポジション ({positions.length}/{MAX_POS})</div>
                {positions.length===0?(
                  <div style={{textAlign:"center",padding:"24px 0",color:"#64748b"}}>
                    ポジションなし — ▶ 自動売買開始 でAIが分析・買い注文を出します
                  </div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
                    {positions.map(pos=>{
                      const d=prices[pos.code];const px=d?.price||pos.buyPrice;
                      const pnl=(px-pos.buyPrice)*pos.lot;const pct=((px-pos.buyPrice)/pos.buyPrice)*100;
                      const cur=pos.currency||"JPY";const ind=indsMap[pos.code]||{};
                      const posBars=bars[pos.code]||[];
                      return(
                        <div key={pos.id} className="fade" style={{...S.card,padding:14,border:`1px solid ${pct>=0?"#0d3322":"#3d0f0f"}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                            <div>
                              <div style={{fontWeight:700,fontSize:14,color:"#e2e8f0"}}>{pos.name}
                                {pos.tradeType&&<span style={{marginLeft:6,fontSize:10,background:pos.tradeType==="day"?"#0a1828":"#0a1828",color:pos.tradeType==="day"?"#38bdf8":"#a78bfa",border:`1px solid ${pos.tradeType==="day"?"#1e4080":"#4c1d95"}`,padding:"0 5px",borderRadius:3}}>
                                  {pos.tradeType==="day"?"⚡ デイ":"📈 スイング"}
                                </span>}
                              </div>
                              <div style={{color:"#a0b4c8",fontSize:10,marginTop:2}}>{pos.code} · {pos.lot}株 · 取得:{pos.buyTime}{pos.trailing?" 🔒":""}</div>
                            </div>
                            <span style={{background:pct>=0?"#052e16":"#2d0f0f",color:pct>=0?"#22c55e":"#ef4444",padding:"2px 10px",borderRadius:4,fontSize:12,fontWeight:700}}>
                              {pct>=0?"+":""}{pct.toFixed(2)}%
                            </span>
                          </div>
                          <LevelChart buy={pos.buyPrice} sl={pos.stopLoss} t1={pos.target1} t2={pos.target2} cur={px} currency={cur} bars={posBars}/>
                          {/* 評価額表示 */}
                          {(()=>{
                            const evalVal=cur==="USD"?px*pos.lot*usdJpy:px*pos.lot;
                            const costVal=cur==="USD"?pos.buyPrice*pos.lot*usdJpy:pos.buyPrice*pos.lot;
                            return(
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:6}}>
                                <div style={{background:"#0a1520",padding:"4px 8px",borderRadius:4}}>
                                  <div style={{color:"#a0b4c8",fontSize:9}}>評価額</div>
                                  <div className="mono" style={{color:"#e2e8f0",fontWeight:700,fontSize:11}}>¥{Math.round(evalVal).toLocaleString()}</div>
                                </div>
                                <div style={{background:"#0a1520",padding:"4px 8px",borderRadius:4}}>
                                  <div style={{color:"#a0b4c8",fontSize:9}}>取得コスト</div>
                                  <div className="mono" style={{color:"#94a3b8",fontWeight:700,fontSize:11}}>¥{Math.round(costVal).toLocaleString()}</div>
                                </div>
                              </div>
                            );
                          })()}
                          <div style={{display:"flex",gap:3,flexWrap:"wrap",margin:"8px 0"}}>
                            {ind.rsi   &&<Badge label="RSI"  value={ind.rsi.toFixed(0)} type={ind.rsi>70?"w":ind.rsi<30?"b":"n"}/>}
                            {ind.trend &&<Badge value={ind.trend} type={ind.trend==="uptrend"?"b":ind.trend==="downtrend"?"r":"n"}/>}
                            {ind.pattern&&<Badge value={ind.pattern} type={ind.pattern==="breakout"||ind.pattern==="continuation"?"b":ind.pattern==="breakdown"?"r":"n"}/>}
                            {ind.macd!=null&&<Badge label="MACD" value={ind.macd>=0?"▲":"▼"} type={ind.macd>=0?"b":"r"}/>}
                            {pos.confidence&&<Badge label="AI" value={`${pos.confidence}%`} type="n"/>}
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6}}>
                            {(()=>{
                              const pnlJpy=cur==="USD"?pnl*usdJpy:pnl;
                              const pnlDisp=cur==="USD"
                                ?`$${pnl>=0?"+":""}${pnl.toFixed(2)} (¥${Math.round(Math.abs(pnlJpy)).toLocaleString()})`
                                :`${pnlJpy>=0?"+":""}¥${Math.round(Math.abs(pnlJpy)).toLocaleString()}`;
                              const evalJpy=cur==="USD"?px*pos.lot*usdJpy:px*pos.lot;
                              return [
                                ["現値",fmt(px,cur),"#e8f0f8"],
                                ["評価額",`¥${Math.round(evalJpy).toLocaleString()}`,"#a0b4c8"],
                                ["損益",pnlDisp,pnlJpy>=0?"#4ade80":"#f87171"],
                                ["RR比",pos.riskReward?.toFixed(2)||"--","#c4b5fd"],
                              ];
                            })().map(([l,v,c])=>(
                              <div key={l} style={{background:"#081018",padding:"6px 8px",borderRadius:5,border:"1px solid #152030"}}>
                                <div style={{color:"#9ab0c8",fontSize:9,marginBottom:2}}>{l}</div>
                                <div className="mono" style={{color:c,fontWeight:700,fontSize:11}}>{v}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{fontSize:10,color:"#a0b4c8",lineHeight:1.5}}>{pos.reason}</div>
                          <button className="btn" onClick={()=>doSell(pos,px,"手動売却")}
                            style={{marginTop:8,width:"100%",background:"#2d0f0f",border:"1px solid #ef4444",color:"#ef4444",padding:"5px 0",fontSize:11}}>
                            手動売却
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 指値注文 */}
              {orders.length>0&&(
                <div style={{...S.card,padding:14}}>
                  <div style={{fontSize:10,color:"#a0b4c8",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>
                    指値注文待機中 ({orders.length}件)
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:10}}>
                    {orders.map(o=>{
                      const d=prices[o.code];const diff=d?.price?((o.limitPrice-d.price)/d.price*100):null;
                      const cur=o.currency||"JPY";const oBars=bars[o.code]||[];
                      return(
                        <div key={o.id} style={{background:"#0a1520",border:"1px solid #1e3a5f",borderRadius:8,padding:12}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                            <span style={{fontWeight:700,color:"#e2e8f0"}}>{o.name}</span>
                            <button className="btn" onClick={()=>setOrders(p=>p.filter(x=>x.id!==o.id))}
                              style={{background:"#1a2535",border:"1px solid #2a3f55",color:"#475569",padding:"2px 8px",fontSize:10}}>取消</button>
                          </div>
                          <LevelChart buy={null} sl={o.stopLoss} t1={o.target1} t2={o.target2} cur={d?.price} currency={cur} bars={oBars||bars[o.code]||[]} entryType={o.entryType} entryReason={o.entryReason}/>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,marginTop:8}}>
                            {[["指値",fmt(o.limitPrice,cur),"#f59e0b"],["現値",d?.price?fmt(d.price,cur):"--","#e2e8f0"],["乖離",diff!=null?`${diff.toFixed(2)}%`:"--",diff!=null&&diff<=0?"#22c55e":"#94a3b8"],["損切",fmt(o.stopLoss,cur),"#ef4444"],["目標1",fmt(o.target1,cur),"#22c55e"],["RR",o.riskReward?.toFixed(2)||"--","#a78bfa"]].map(([l,v,c])=>(
                              <div key={l} style={{background:"#060a10",padding:"4px 7px",borderRadius:4}}>
                                <div style={{color:"#64748b",fontSize:9}}>{l}</div>
                                <div className="mono" style={{color:c,fontWeight:700,fontSize:10}}>{v}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{fontSize:10,color:"#7a8fa8",marginTop:6}}>{o.reason}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ログ */}
            <div style={{...S.card,padding:0,display:"flex",flexDirection:"column",position:"sticky",top:100,maxHeight:"calc(100vh - 160px)"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #152030",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:"#a0b4c8",fontWeight:600}}>AIエージェントログ</span>
                <button className="btn" onClick={()=>setLogs([])}
                  style={{fontSize:9,color:"#8aa0b8",background:"#0a1520",border:"1px solid #1a2840",padding:"2px 8px"}}>
                  クリア
                </button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"8px 12px",display:"flex",flexDirection:"column",gap:3}}>
                {logs.length===0
                  ?<div style={{color:"#8096b0",textAlign:"center",padding:"24px 0",fontSize:12}}>
                    ↻ 株価更新 か ▶ 自動売買開始 を押してください
                  </div>
                  :logs.map(l=>(
                    <div key={l.id} className="fade" style={{display:"flex",gap:7,lineHeight:1.4}}>
                      <span className="mono" style={{color:"#607888",fontSize:9,whiteSpace:"nowrap",paddingTop:2,flexShrink:0}}>{l.time}</span>
                      <span className={`log-${l.type}`} style={{fontSize:11,wordBreak:"break-word"}}>{l.msg}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* ━━ MARKET ━━ */}
        {tab==="market"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:10,color:"#a0b4c8",textTransform:"uppercase",letterSpacing:1}}>
                {market==="JP"?"🇯🇵 日本株 30銘柄":"🇺🇸 米国株 30銘柄 (moomoo LIVE対応)"}
                {dataSource==="moomoo_realtime"&&<span style={{marginLeft:10,color:"#22c55e"}}>● moomoo リアルタイム</span>}
              </span>
              <button className="btn" onClick={fetchPrices} disabled={fetching}
                style={{background:"#0a1828",border:"1px solid #1e3a5f",color:"#38bdf8",padding:"5px 14px",fontSize:11}}>
                {fetching?"取得中...":"↻ 全銘柄更新"}
              </button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
              {universe.map(stock=>{
                const d=prices[stock.code];const ind=indsMap[stock.code]||{};
                const stockBars=bars[stock.code]||[];
                const held=positions.find(p=>p.code===stock.code);
                const up=(d?.changePct||0)>=0;
                const isLive=d?.source==="moomoo_live"||d?.source==="kabu_live";
                return(
                  <div key={stock.code} style={{...S.card,padding:12,border:`1px solid ${held?"#0d3322":"#162030"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <div>
                        <div style={{fontWeight:700,color:"#e2e8f0",fontSize:12}}>{stock.name}</div>
                        <div style={{color:"#a0b4c8",fontSize:9}}>
                          {stock.code} · {stock.sector}
                          {held&&<span style={{color:"#22c55e",marginLeft:4}}>●保有</span>}
                          {isLive&&<span style={{color:"#22c55e",marginLeft:4}}>{d?.source==="kabu_live"?"🏯 kabu":"⚡moomoo"}</span>}
                        </div>
                      </div>
                      {d&&<span style={{background:up?"#052e16":"#2d0f0f",color:up?"#22c55e":"#ef4444",padding:"1px 6px",borderRadius:3,fontSize:10,fontWeight:700}}>
                        {up?"+":""}{d.changePct?.toFixed(2)||"0.00"}%
                      </span>}
                    </div>
                    {d?(
                      <>
                        <div className="mono" style={{fontWeight:700,fontSize:14,color:up?"#22c55e":"#ef4444",marginBottom:4}}>
                          {stock.currency==="JPY"?fmtJP(d.price):fmtUS(d.price)}
                        </div>
                        {/* バーチャート */}
                        <BarChart bars={stockBars} width={196} height={60} currency={stock.currency}/>
                        <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:4}}>
                          {ind.rsi   &&<Badge label="RSI" value={ind.rsi.toFixed(0)} type={ind.rsi>70?"w":ind.rsi<30?"b":"n"}/>}
                          {ind.trend &&<Badge value={ind.trend} type={ind.trend==="uptrend"?"b":ind.trend==="downtrend"?"r":"n"}/>}
                          {ind.pattern&&<Badge value={ind.pattern} type={ind.pattern==="breakout"?"b":ind.pattern==="breakdown"?"r":"n"}/>}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,marginTop:4}}>
                          {[["H",stock.currency==="JPY"?fmtJP(d.high):fmtUS(d.high),"#22c55e"],["L",stock.currency==="JPY"?fmtJP(d.low):fmtUS(d.low),"#ef4444"]].map(([l,v,c])=>(
                            <div key={l} style={{background:"#08111a",padding:"2px 5px",borderRadius:3}}>
                              <span style={{color:"#64748b",fontSize:8}}>{l} </span>
                              <span className="mono" style={{color:c,fontSize:9,fontWeight:700}}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ):(
                      <div style={{color:"#8aa0b8",fontSize:11,padding:"8px 0"}}>↻ 更新ボタンで取得</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ━━ ORDERS ━━ */}
        {tab==="orders"&&(
          <div>
            <div style={{fontSize:10,color:"#a0b4c8",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>指値注文・価格ライン一覧</div>
            {orders.length===0?(
              <div style={{...S.card,padding:32,textAlign:"center",color:"#64748b"}}>
                指値注文なし — ▶ 自動売買開始 でAIが自動作成します
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
                {orders.map(o=>{
                  const d=prices[o.code];const cur=o.currency||"JPY";
                  const diff=d?.price?((o.limitPrice-d.price)/d.price*100):null;
                  const oBars=bars[o.code]||[];
                  return(
                    <div key={o.id} style={{...S.card,padding:16,border:"1px solid #1e3a5f"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                        <div>
                          <span style={{fontWeight:700,color:"#e2e8f0",fontSize:14}}>{o.name}</span>
                          <span style={{marginLeft:8,background:"#0a1828",color:"#38bdf8",padding:"1px 7px",borderRadius:3,fontSize:10}}>指値買</span>
                        </div>
                        <button className="btn" onClick={()=>setOrders(p=>p.filter(x=>x.id!==o.id))}
                          style={{background:"#1a2535",border:"1px solid #2a3f55",color:"#475569",padding:"2px 8px",fontSize:10}}>取消</button>
                      </div>
                      <LevelChart buy={null} sl={o.stopLoss} t1={o.target1} t2={o.target2} cur={d?.price} currency={cur} bars={oBars||bars[o.code]||[]} entryType={o.entryType} entryReason={o.entryReason}/>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:10}}>
                        {[["指値",fmt(o.limitPrice,cur),"#f59e0b"],["現値",d?.price?fmt(d.price,cur):"--","#e2e8f0"],["乖離",diff!=null?`${diff.toFixed(2)}%`:"--",diff!=null&&diff<=0?"#22c55e":"#94a3b8"],["損切",fmt(o.stopLoss,cur),"#ef4444"],["目標1",fmt(o.target1,cur),"#22c55e"],["目標2",fmt(o.target2,cur),"#10b981"]].map(([l,v,c])=>(
                          <div key={l} style={{background:"#08111a",padding:"6px 8px",borderRadius:5}}>
                            <div style={{color:"#64748b",fontSize:9}}>{l}</div>
                            <div className="mono" style={{color:c,fontWeight:700}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{fontSize:10,color:"#7a8fa8",marginTop:8}}>{o.lot}株 · 信頼度{o.confidence}% · RR{o.riskReward?.toFixed(2)||"--"} · {o.reason}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ━━ HISTORY ━━ */}
        {tab==="history"&&(
          <div style={{...S.card,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:10,color:"#a0b4c8",textTransform:"uppercase",letterSpacing:1}}>取引履歴</span>
              <div className="mono" style={{display:"flex",gap:14,fontSize:11}}>
                <span>勝: <span style={{color:"#22c55e"}}>{wins}</span></span>
                <span>負: <span style={{color:"#ef4444"}}>{losses}</span></span>
                <span style={{color:"#a78bfa"}}>勝率: {winRate}%</span>
              </div>
            </div>
            <table>
              <thead><tr>{["時刻","種別","銘柄","価格","数量","損益","損益%","根拠"].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {history.length===0
                  ?<tr><td colSpan={8} style={{textAlign:"center",color:"#64748b",padding:20}}>取引履歴なし</td></tr>
                  :history.map(t=>(
                    <tr key={t.id} className="fade">
                      <td className="mono" style={{color:"#a0b4c8",fontSize:10}}>{t.time}</td>
                      <td><span style={{background:t.type==="buy"?"#0a1828":t.pnl>=0?"#052e16":"#2d0f0f",color:t.type==="buy"?"#38bdf8":t.pnl>=0?"#22c55e":"#ef4444",padding:"1px 7px",borderRadius:3,fontSize:10,fontWeight:700}}>{t.type==="buy"?"買":"売"}</span></td>
                      <td style={{fontWeight:600,color:"#e2e8f0"}}>{t.name}</td>
                      <td className="mono">{fmt(t.price,t.currency)}</td>
                      <td className="mono">{t.lot}株</td>
                      <td className="mono" style={{color:(t.pnlJpy??t.pnlNative??t.pnl??0)>=0?"#22c55e":"#ef4444"}}>
                        {t.type==="sell"?(()=>{
                          const jpyPnl=t.pnlJpy??((t.pnlNative||t.pnl||0)*(t.currency==="USD"?usdJpy:1));
                          return `${jpyPnl>=0?"+":""}¥${Math.round(jpyPnl).toLocaleString()}`;
                        })():"--"}
                      </td>
                      <td className="mono" style={{color:(t.pct||0)>=0?"#22c55e":"#ef4444"}}>{t.type==="sell"?`${(t.pct||0)>=0?"+":""}${(t.pct||0).toFixed(2)}%`:"--"}</td>
                      <td style={{color:"#7a9ab8",maxWidth:200}}>{t.reason}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}

        {/* ━━ RULES ━━ */}
        {tab==="rules"&&(()=>{
          const catColor={"リスク管理":"#ef4444","エントリー":"#22c55e","エグジット":"#f59e0b","銘柄選定":"#38bdf8"};
          const initial=rules.filter(r=>r.src.includes("初期"));
          const learned=rules.filter(r=>!r.src.includes("初期"));

          const handleExport=()=>{
            const exportData={
              exportedAt: new Date().toISOString(),
              version: "1.0",
              summary:{
                total: rules.length,
                initial: initial.length,
                learned: learned.length,
                wins: history.filter(t=>t.type==="sell"&&(t.pnlJpy||t.pnl||0)>0).length,
                losses: history.filter(t=>t.type==="sell"&&(t.pnlJpy||t.pnl||0)<=0).length,
              },
              rules: rules.map((r,i)=>({
                no: i+1,
                category: r.cat,
                rule: r.rule,
                source: r.src,
                basis: r.basis||null,
                confidence: r.confidence||null,
                addedAt: r.addedAt||null,
              })),
              instruction:"以下のルールセットは AI Trade Agent が自動売買と失敗・成功学習を通じて構築したトレードルールです。次回セッション開始時にこのJSONをClaudeに貼り付けて「このルールをトレードエージェントに読み込ませてください」と伝えてください。",
            };
            const json=JSON.stringify(exportData,null,2);
            const blob=new Blob([json],{type:"application/json"});
            const url=URL.createObjectURL(blob);
            const a=document.createElement("a");
            a.href=url;
            a.download=`trade-rules-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            addLog(`📤 ルールをエクスポートしました (${rules.length}件)`, "success");
          };

          return(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {/* ヘッダー */}
              <div style={{...S.card,padding:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,color:"#e2e8f0",fontSize:14}}>トレードルール管理</div>
                  <div style={{fontSize:11,color:"#7a9ab8",marginTop:2}}>
                    初期ルール: {initial.length}件 / AI学習ルール: {learned.length}件 / 合計: {rules.length}件
                  </div>
                </div>
                <button className="btn" onClick={handleExport}
                  style={{background:"#0a2412",border:"1px solid #22c55e",color:"#22c55e",
                    padding:"8px 20px",fontSize:12,display:"flex",alignItems:"center",gap:6}}>
                  📥 ルールをエクスポート (.json)
                </button>
              </div>

              {/* 統計 */}
              {learned.length>0&&(
                <div style={{...S.card,padding:14,borderLeft:"3px solid #22c55e"}}>
                  <div style={{fontSize:10,color:"#a0b4c8",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>
                    🤖 AI学習済みルール ({learned.length}件)
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {learned.map((r,i)=>{
                      const cc=catColor[r.cat]||"#64748b";
                      return(
                        <div key={r.id} className="fade" style={{background:"#08111a",borderRadius:7,padding:"10px 14px",borderLeft:`3px solid #22c55e`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <div style={{flex:1,color:"#e2e8f0",fontSize:12}}>{r.rule}</div>
                            <div style={{display:"flex",gap:4,marginLeft:10,flexShrink:0}}>
                              {r.cat&&<span style={{background:cc+"22",color:cc,padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:700}}>{r.cat}</span>}
                              {r.confidence&&<span style={{background:"#1a2535",color:"#94a3b8",padding:"1px 6px",borderRadius:3,fontSize:9}}>信頼度{r.confidence}%</span>}
                              <span style={{background:"#052e16",color:"#22c55e",padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:700}}>🤖 学習</span>
                            </div>
                          </div>
                          <div style={{fontSize:10,color:"#a0b4c8",marginTop:4}}>
                            学習元: {r.src}{r.addedAt?` | ${r.addedAt}`:""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 初期ルール */}
              <div style={{...S.card,padding:14,borderLeft:"3px solid #1e4080"}}>
                <div style={{fontSize:10,color:"#a0b4c8",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>
                  📋 初期ルール ({initial.length}件)
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {initial.map((r,i)=>{
                    const cc=catColor[r.cat]||"#64748b";
                    return(
                      <div key={r.id} style={{background:"#08111a",borderRadius:7,padding:"10px 14px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                          <div style={{flex:1}}>
                            <span style={{color:"#7a8fa8",fontSize:10,marginRight:6}}>#{i+1}</span>
                            <span style={{color:"#e2e8f0",fontSize:12}}>{r.rule}</span>
                          </div>
                          {r.cat&&<span style={{background:cc+"22",color:cc,padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:700,marginLeft:8,flexShrink:0}}>{r.cat}</span>}
                        </div>
                        {r.basis&&(
                          <div style={{fontSize:10,color:"#7a8fa8",marginTop:5,paddingTop:5,borderTop:"1px solid #162030",lineHeight:1.5}}>
                            💡 根拠: {r.basis}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
