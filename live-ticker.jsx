// live-ticker.jsx — Live recalibrating loss estimate (the centrepiece),
// rolling-digit odometer, scramble digits, haptics + reduced-motion helpers.

const { useState: useStateT, useEffect: useEffectT, useRef: useRefT, useMemo: useMemoT } = React;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
window.IDS_haptic = function (ms = 6) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
};
window.IDS_reducedMotion = function () {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
};

// Typical deal value per industry — used to seed the estimate
// before the lead has entered their own number.
window.IDS_INDUSTRY_AVG_DEAL = {
  real_estate: 40000,
  hvac: 900,
  automotive: 9000,
  wellness: 450,
  logistics: 15000,
  education: 7000,
};

// ─────────────────────────────────────────────────────────────
// Rolling-digit odometer. Inherits font styles from parent.
// Columns are keyed from the RIGHT so the ones digit stays put.
// ─────────────────────────────────────────────────────────────
function RollingNumber({ value, style }) {
  const str = Math.max(0, Math.round(value)).toLocaleString('en-US');
  const chars = str.split('');
  const n = chars.length;
  return (
    <span className="rn" style={style} aria-label={str}>
      {chars.map((ch, i) => {
        const key = n - i;
        if (ch === ',') return <span key={'c' + key} className="rn-comma">,</span>;
        const d = parseInt(ch, 10);
        return (
          <span key={key} className="rn-digit">
            <span className="rn-col" style={{ transform: `translateY(-${d}em)` }}>
              {[0,1,2,3,4,5,6,7,8,9].map(x => <span key={x}>{x}</span>)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Scrambling digits — used on the calculating screen
// ─────────────────────────────────────────────────────────────
function ScrambleAED({ target = '34,200', fontSize = 40 }) {
  const [txt, setTxt] = useStateT(target.replace(/\d/g, '0'));
  useEffectT(() => {
    if (window.IDS_reducedMotion()) { setTxt(target.replace(/\d/g, '8')); return; }
    const iv = setInterval(() => {
      setTxt(target.replace(/\d/g, () => String(Math.floor(Math.random() * 10))));
    }, 64);
    return () => clearInterval(iv);
  }, [target]);
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
      AED {txt}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Live estimate — recalculates from partial answers.
// Unanswered inputs fall back to conservative defaults.
// ─────────────────────────────────────────────────────────────
function useLiveEstimate({ step, industry, dealValue, weeklyEnquiries, responseTime, coverage }) {
  return useMemoT(() => {
    if (!industry) return { ready: false, value: 0, answered: 0 };
    let answered = 1;
    if (dealValue > 0) answered++;
    if (step >= 3) answered++;
    if (responseTime) answered++;
    if (coverage) answered++;
    const inputs = {
      industry,
      dealValue: dealValue > 0 ? dealValue : (window.IDS_INDUSTRY_AVG_DEAL[industry] || 5000),
      weeklyEnquiries: weeklyEnquiries || 20,
      responseTime: responseTime || '1_4hrs',
      coverage: coverage || 'weekdays_only',
    };
    const calc = window.IDS_calculate(inputs);
    return { ready: true, value: calc.monthlyLoss, answered };
  }, [step, industry, dealValue, weeklyEnquiries, responseTime, coverage]);
}

// ─────────────────────────────────────────────────────────────
// The ticker — fixed forest strip at the bottom of steps 1–5.
// Digits sharpen (deblur) as more questions are answered.
// ─────────────────────────────────────────────────────────────
const TICKER_BLUR = { 1: 4.5, 2: 3.25, 3: 2.25, 4: 1.5, 5: 1 };

function LiveTicker({ step, industry, dealValue, weeklyEnquiries, responseTime, coverage }) {
  const est = useLiveEstimate({ step, industry, dealValue, weeklyEnquiries, responseTime, coverage });
  const [flash, setFlash] = useStateT(0);
  const first = useRefT(true);

  useEffectT(() => {
    if (first.current) { first.current = false; return; }
    if (!est.ready) return;
    setFlash(f => f + 1);
    window.IDS_haptic(4);
  }, [est.value]);

  const blur = est.ready ? (TICKER_BLUR[Math.min(5, Math.max(1, est.answered))] ?? 3) : 0;

  return (
    <div className="ticker ticker-enter">
      <span className="ticker-left">
        <span className="ticker-dot" />
        <span className="eyebrow" style={{ fontSize: 8.5, color: 'rgba(247,243,237,0.55)' }}>
          {est.answered >= 5 ? 'Estimate ready' : 'Live estimate'}
        </span>
      </span>

      {est.ready ? (
        <span className="ticker-num">
          <span className="ticker-blur" style={{ '--tblur': blur + 'px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(247,243,237,0.55)' }}>AED</span>
            <RollingNumber value={est.value} style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--paper)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(247,243,237,0.55)' }}>/MO</span>
          </span>
          {flash > 0 && <span key={flash} className="ticker-sweep" />}
        </span>
      ) : (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(247,243,237,0.45)' }}>
          Answer to begin
        </span>
      )}
    </div>
  );
}

Object.assign(window, { RollingNumber, ScrambleAED, useLiveEstimate, LiveTicker });
