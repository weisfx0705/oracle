import React, { useState, useRef, useEffect } from 'react';

interface CenteringGateProps {
  /** 達到安定後解鎖，進入選牌 PICKER */
  onComplete: () => void;
  /** 低調返回，切回 QUESTION（保留已輸入的問題文字） */
  onBack: () => void;
}

// ── 可微調參數 ───────────────────────────────────────────────
const HOLD_DURATION_MS = 4500;   // 持續靜止填滿「澄澈度」所需時間（約 1-2 個呼吸週期）
const DECAY_MS = 6000;           // 受擾／放開時，澄澈度回落到 0 所需時間（比累積慢很多，柔性不懲罰）
const TOLERANCE_PX = 70;         // 容差半徑（寬鬆，容許行動裝置上自然的手指偏移）
const SETTLE_DELAY_MS = 120;     // 超出容差後，需重新安定多久才再次視為「靜止」
const BREATH_PERIOD_S = 3.5;     // 呼吸光環週期（秒）
// ─────────────────────────────────────────────────────────────

/**
 * 心湖映月 — 靜心準備關卡。
 * 不驗證籤的對錯，只引導使用者讓心安定；單向閘門，安定後才解鎖進入選牌。
 * 純 React state + CSS/Tailwind，無新增相依套件。
 */
export const CenteringGate: React.FC<CenteringGateProps> = ({ onComplete, onBack }) => {
  const [clarity, setClarity] = useState(0);        // 0~1 澄澈度（驅動進度條、月影、漣漪）
  const [holding, setHolding] = useState(false);    // 指標是否按住
  const [disturbed, setDisturbed] = useState(false);// 是否剛被打擾（移動／太早放開）
  const [completed, setCompleted] = useState(false);// 是否已達安定

  // refs（供 rAF loop 取得最新值，不觸發 re-render）
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  const holdingRef = useRef(false);
  const lastDisturbTsRef = useRef(0);
  const clarityRef = useRef(0);
  const completedRef = useRef(false);
  const disturbedRef = useRef(false);
  const rafRef = useRef<number | undefined>(undefined);
  const lastTsRef = useRef<number | null>(null);

  // 動畫主迴圈：依「是否靜止」累積或回落澄澈度
  useEffect(() => {
    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      if (!completedRef.current) {
        const still = holdingRef.current && (ts - lastDisturbTsRef.current >= SETTLE_DELAY_MS);

        if (still) {
          clarityRef.current = Math.min(1, clarityRef.current + dt / HOLD_DURATION_MS);
          if (disturbedRef.current) { disturbedRef.current = false; setDisturbed(false); }
        } else {
          clarityRef.current = Math.max(0, clarityRef.current - dt / DECAY_MS);
        }
        setClarity(clarityRef.current);

        if (clarityRef.current >= 1) {
          completedRef.current = true;
          setCompleted(true);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // 達到安定後，稍作停留顯示「心已澄明」，再自動進入選牌
  useEffect(() => {
    if (!completed) return;
    const t = setTimeout(onComplete, 1800);
    return () => clearTimeout(t);
  }, [completed, onComplete]);

  const markDisturbed = () => {
    lastDisturbTsRef.current = performance.now();
    if (!disturbedRef.current && clarityRef.current > 0.02) {
      disturbedRef.current = true;
      setDisturbed(true);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (completedRef.current) return;
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* noop */ }
    anchorRef.current = { x: e.clientX, y: e.clientY };
    lastDisturbTsRef.current = performance.now(); // 先安定片刻才開始累積
    holdingRef.current = true;
    setHolding(true);
    if (disturbedRef.current) { disturbedRef.current = false; setDisturbed(false); }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!holdingRef.current || completedRef.current || !anchorRef.current) return;
    const dist = Math.hypot(e.clientX - anchorRef.current.x, e.clientY - anchorRef.current.y);
    if (dist > TOLERANCE_PX) {
      // 超出容差：視為打擾，重新錨定讓使用者可從目前位置重新安定
      anchorRef.current = { x: e.clientX, y: e.clientY };
      markDisturbed();
    }
  };

  const endHold = () => {
    if (completedRef.current || !holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    // 太早放開：柔性提示，進度自然回落（rAF 處理）
    if (clarityRef.current > 0.02 && clarityRef.current < 1) markDisturbed();
  };

  // 手動完成備援（無障礙退路）
  const handleManualComplete = () => {
    if (completedRef.current) return;
    holdingRef.current = false;
    clarityRef.current = 1;
    completedRef.current = true;
    setClarity(1);
    setHolding(false);
    setCompleted(true);
  };

  // 視覺衍生值
  const moonBlur = (1 - clarity) * 14 + 2;          // 月影：越澄澈越清晰
  const moonOpacity = 0.35 + clarity * 0.65;
  const rippleOpacity = completed ? 0 : (1 - clarity) * (holding ? 0.55 : 0.85);
  const breathScale = 1 + clarity * 0.04;

  let statusText: string;
  if (completed) statusText = '心已澄明，可以求籤了';
  else if (disturbed) statusText = '再靜一次，讓心湖平息';
  else if (holding) statusText = '心湖漸靜，保持凝神…';
  else statusText = '將指尖（滑鼠）按住湖面中心';

  return (
    <div className="relative space-y-8 animate-in fade-in duration-1000 text-center select-none">
      {/* 低調返回（層級低於主要互動） */}
      <button
        onClick={onBack}
        className="absolute -top-2 left-0 z-20 text-xs text-slate-500 hover:text-amber-300/80 transition-colors tracking-wide"
        title="返回，臨時改問別的問題"
      >
        ← 重新提問
      </button>

      <div className="pt-6">
        <h2 className="text-3xl font-bold text-amber-400 mb-3">心湖映月 🌙</h2>
        <p className="text-slate-400 leading-relaxed max-w-md mx-auto">
          求籤之前，先讓心靜下來。將指尖（或滑鼠）輕輕按住水面中心，停駐片刻，靜心凝神，讓心湖恢復平靜。
        </p>
      </div>

      {/* 水面互動區（精簡、不佔太多空間） */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onPointerLeave={endHold}
        style={{ touchAction: 'none' }}
        className="relative mx-auto w-44 h-44 rounded-full overflow-hidden cursor-pointer
                   bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-slate-700/50 sacred-glow"
      >
        {/* 水面光暈 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.6),transparent_70%)]" />

        {/* 漣漪（澄澈度越高越淡，單圈即可） */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500"
          style={{ opacity: rippleOpacity }}
        >
          <div className="absolute w-16 h-16 rounded-full border border-amber-200/30 animate-ripple" />
          <div className="absolute w-16 h-16 rounded-full border border-amber-200/30 animate-ripple" style={{ animationDelay: '2s' }} />
        </div>

        {/* 月影（模糊倒影 → 漸清） */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-50 to-amber-200/70 transition-all duration-300"
            style={{
              filter: `blur(${moonBlur}px)`,
              opacity: moonOpacity,
              boxShadow: `0 0 ${20 + clarity * 30}px rgba(251,191,36,${0.2 + clarity * 0.4})`,
            }}
          />
        </div>

        {/* 緩慢脹縮的呼吸光環（keyframe 控制脹縮，外層依澄澈度微幅放大） */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-300"
          style={{ transform: `scale(${breathScale})` }}
        >
          <div className="w-24 h-24 rounded-full border-2 border-amber-300/40 animate-breathe" />
        </div>

        {/* 達成提示 */}
        {completed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in fade-in duration-700">
            <span className="text-amber-200/90 text-base font-serif tracking-widest drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
              ❀ 澄明 ❀
            </span>
          </div>
        )}
      </div>

      {/* 狀態文案 */}
      <p className={`text-sm tracking-wide transition-colors duration-300 ${completed ? 'text-amber-300' : disturbed ? 'text-amber-200/70 italic' : 'text-slate-400'}`}>
        {statusText}
      </p>

      {/* 澄澈度進度條（明確顯示百分比，一眼看見進度） */}
      <div className="max-w-xs mx-auto">
        <div className="flex items-center justify-between mb-1.5 text-[11px] tracking-[0.2em] text-slate-500">
          <span className="uppercase">Clarity 澄澈度</span>
          <span className={`font-bold tabular-nums ${completed ? 'text-amber-300' : 'text-amber-400/80'}`}>
            {Math.round(clarity * 100)}%
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-800/80 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
            style={{ width: `${Math.round(clarity * 100)}%`, transition: 'width 120ms linear' }}
          />
        </div>
      </div>

      {/* 無障礙備援：手動完成 */}
      {!completed && (
        <div className="pt-2">
          <button
            onClick={handleManualComplete}
            className="text-xs text-slate-500 hover:text-amber-400 transition-colors italic border-b border-transparent hover:border-amber-400/50"
          >
            我已靜心
          </button>
        </div>
      )}
    </div>
  );
};
