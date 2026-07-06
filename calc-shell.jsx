// calc-shell.jsx — Calculator app shell, progress chrome, steps, calculating state.
// Motion layer: staggered reveals (.rv), kinetic welcome, tactile selections,
// odometer slider, forest calculating sequence. Depends on live-ticker.jsx helpers.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─────────────────────────────────────────────────────────────
// Wordmark
// ─────────────────────────────────────────────────────────────
function Wordmark({ size = 16, dot = true, color }) {
  return (
    <span className="wordmark" style={{ fontSize: size, color: color || 'inherit', letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>
      Ibrahim Digital{dot ? <span className="wordmark-dot" /> : null}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Progress bar — fixed at top. Endowed progress: starts at 10%.
// Labels flip to a countdown past the midpoint (goal-gradient).
// ─────────────────────────────────────────────────────────────
function ProgressChrome({ step, totalSteps = 5 }) {
  const visible = step > 0 && step <= totalSteps;
  const pct = visible ? 10 + ((step - 1) / totalSteps) * 90 : 0;
  const label = step >= 5 ? 'LAST QUESTION' : step === 4 ? '2 QUESTIONS LEFT' : `STEP ${step} OF ${totalSteps}`;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 'calc(12px + env(safe-area-inset-top, 0px)) 20px 10px', background: 'var(--bg)', zIndex: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Wordmark size={13} />
        {visible && (
          <span className="eyebrow" style={{ fontSize: 9, color: step >= 4 ? 'var(--brand)' : undefined }}>{label}</span>
        )}
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step layout — eyebrow / headline / sub / body / cta.
// Content staggers in; CTA pops when it becomes active.
// ─────────────────────────────────────────────────────────────
function StepLayout({ eyebrow, headline, sub, children, cta, onBack, ctaActive, ctaLabel = 'Continue', ctaFinal }) {
  const wasActive = useRef(ctaActive);
  const [justOn, setJustOn] = useState(false);
  useEffect(() => {
    if (ctaActive && !wasActive.current) {
      setJustOn(true);
      window.IDS_haptic && window.IDS_haptic(10);
    }
    wasActive.current = ctaActive;
  }, [ctaActive]);

  return (
    <div className="step-pad" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: 'calc(78px + env(safe-area-inset-top, 0px)) 22px 22px' }}>
      <div style={{ marginBottom: 22 }}>
        <div className="eyebrow rv" style={{ marginBottom: 10 }}>{eyebrow}</div>
        <h1 className="h-headline rv" style={{ '--d': '50ms', marginBottom: 8 }}>{headline}</h1>
        {sub && <p className="h-sub rv" style={{ '--d': '100ms' }}>{sub}</p>}
      </div>

      <div className="rv" style={{ '--d': '150ms', flex: 1 }}>{children}</div>

      <div className="rv" style={{ '--d': '210ms', marginTop: 24 }}>
        {cta !== false && (
          <button
            type="button"
            onClick={ctaActive ? cta : undefined}
            disabled={!ctaActive}
            className={`btn btn-primary ${ctaFinal ? 'btn-final' : ''} ${justOn && ctaActive ? 'btn-live' : ''}`}
            style={{ opacity: ctaActive ? 1 : 0.32, cursor: ctaActive ? 'pointer' : 'not-allowed' }}
          >
            {ctaLabel} <span className="btn-arrow" style={{ marginLeft: 4 }}>→</span>
          </button>
        )}
        {onBack && (
          <button type="button" onClick={onBack} style={{ marginTop: 14, color: 'var(--fg-3)', fontSize: 12, fontFamily: 'var(--font-display)', display: 'block' }}>
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}

// Small check tick used on selected cards
function TickDot({ delay = 0, bg = 'var(--brand)' }) {
  return (
    <span className="tick-pop" style={{ animationDelay: delay + 'ms', position: 'absolute', top: 10, right: 10, width: 16, height: 16, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="8" height="8" viewBox="0 0 10 10"><path d="M1.5 5.5l2.4 2.4 4.6-5.4" stroke="#FAFAF7" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"></path></svg>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 1 — Industry
// ─────────────────────────────────────────────────────────────
function Step1Industry({ value, onChange, onNext, onBack }) {
  const pick = (id) => { window.IDS_haptic && window.IDS_haptic(6); onChange(id); };
  return (
    <StepLayout
      eyebrow="YOUR BUSINESS"
      headline="What industry are you in?"
      sub="We'll tailor your results to your market."
      cta={onNext} ctaActive={!!value}
      onBack={onBack}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {window.IDS_INDUSTRIES.map((ind, i) => {
          const selected = value === ind.id;
          return (
            <div key={ind.id} className="rv" style={{ '--d': `${150 + i * 40}ms` }}>
              <button
                type="button"
                onClick={() => pick(ind.id)}
                className={`card card-selectable ${selected ? 'card-selected card-forest' : ''}`}
                style={{ position: 'relative', textAlign: 'left', width: '100%', height: '100%', minHeight: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: selected ? 11 : 12 }}
              >
                <div className="eyebrow" style={{ fontSize: 9, color: selected ? 'var(--clay)' : 'var(--fg-4)', transition: 'color 300ms var(--ease)' }}>0{i + 1}</div>
                {selected && <TickDot bg="var(--clay)" />}
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, lineHeight: 1.15, color: selected ? 'var(--paper)' : 'var(--fg)', transition: 'color 300ms var(--ease)', marginBottom: 3 }}>{ind.name}</div>
                  <div style={{ fontSize: 11, lineHeight: 1.35, color: selected ? 'rgba(247,243,237,0.65)' : 'var(--fg-3)', transition: 'color 300ms var(--ease)' }}>{ind.desc}</div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </StepLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 2 — Deal value
// ─────────────────────────────────────────────────────────────
function Step2DealValue({ value, presetId, onChange, onNext, onBack }) {
  const inputRef = useRef(null);
  const [custom, setCustom] = useState(presetId ? '' : (value ? String(value) : ''));
  const [pulse, setPulse] = useState(0);

  function selectPreset(p) {
    window.IDS_haptic && window.IDS_haptic(6);
    onChange({ presetId: p.id, value: p.value });
    setCustom(String(p.value));
    setPulse(x => x + 1);
  }
  function handleCustom(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setCustom(raw);
    onChange({ presetId: null, value: raw ? parseInt(raw, 10) : 0 });
  }

  const ctaActive = !!value && value > 0;

  return (
    <StepLayout
      eyebrow="YOUR NUMBERS"
      headline="What's your average sale or booking worth?"
      sub="Include your fee, commission, or margin — not the full property or vehicle price."
      cta={onNext} ctaActive={ctaActive}
      onBack={onBack}
    >
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div className={pulse === 0 ? '' : (pulse % 2 ? 'vs-a' : 'vs-b')} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, lineHeight: 1, letterSpacing: '-0.04em', color: value > 0 ? 'var(--brand)' : 'var(--fg-4)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.08em' }}>AED</span>
          <RollingNumber value={value || 0} />
        </div>
        <div className="eyebrow" style={{ fontSize: 9, marginTop: 8 }}>YOUR TAKE, PER DEAL</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
        {window.IDS_DEAL_PRESETS.map(p => (
          <button
            type="button" key={p.id}
            onClick={() => selectPreset(p)}
            className={`pill ${presetId === p.id ? 'pill-selected' : ''}`}
            style={{ width: '100%', height: 48 }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div>
        <div className="eyebrow" style={{ fontSize: 9, marginBottom: 8 }}>OR ENTER THE EXACT AMOUNT</div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-4)', fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '0.05em' }}>AED</span>
          <input
            ref={inputRef}
            type="text" inputMode="numeric" pattern="[0-9]*"
            value={custom ? Number(custom).toLocaleString('en-US') : ''}
            onChange={handleCustom}
            placeholder="0"
            style={{ width: '100%', height: 52, paddingLeft: 56, paddingRight: 16, border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg)', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 17 }}
          />
        </div>
      </div>
    </StepLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 3 — Weekly enquiries (odometer slider)
// ─────────────────────────────────────────────────────────────
const SNAPS = [5, 10, 20, 30, 50, 75, 100, 150, 200];

function Step3Enquiries({ value, onChange, onNext, onBack }) {
  const idx = SNAPS.indexOf(value);
  const safeIdx = idx === -1 ? 2 : idx;
  const fillPct = (safeIdx / (SNAPS.length - 1)) * 100;
  const hint = value <= 10
    ? 'Lower volume — every single enquiry counts.'
    : value <= 75
      ? 'Busy inbox. This is where replies start slipping.'
      : 'High volume — impossible to keep up with manually.';

  return (
    <StepLayout
      eyebrow="YOUR VOLUME"
      headline="How many WhatsApp messages do you get per week?"
      sub="Rough number is fine. Count enquiries, not replies."
      cta={onNext} ctaActive={true}
      onBack={onBack}
    >
      <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--r-lg)', padding: '30px 20px 18px', textAlign: 'center', marginBottom: 10 }}>
        <div className={safeIdx % 2 ? 'np-a' : 'np-b'} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 56, lineHeight: 1, letterSpacing: '-0.04em', color: 'var(--brand)', display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
          <RollingNumber value={Math.min(value, 200)} />
          {value >= 200 && <span>+</span>}
        </div>
        <div className="eyebrow" style={{ fontSize: 9, marginTop: 8 }}>ENQUIRIES PER WEEK</div>

        <input
          type="range" min={0} max={SNAPS.length - 1} step={1}
          value={safeIdx}
          onChange={(e) => {
            const v = SNAPS[parseInt(e.target.value, 10)];
            if (v !== value) { window.IDS_haptic && window.IDS_haptic(3); onChange(v); }
          }}
          className="signal-slider"
          style={{ marginTop: 26, '--fill': fillPct + '%' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, padding: '0 9px' }}>
          {SNAPS.map((s, i) => (
            <span key={s} style={{ width: 3, height: 3, borderRadius: '50%', background: i <= safeIdx ? 'var(--forest)' : 'var(--border-2)', transition: 'background 200ms var(--ease)' }} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', color: 'var(--fg-4)', marginTop: 4 }}>
          <span>5</span><span>200+</span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--fg-3)', textAlign: 'center', minHeight: 18 }}>{hint}</p>
    </StepLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 4 — Response time
// ─────────────────────────────────────────────────────────────
function Step4Response({ value, onChange, onNext, onBack }) {
  const pick = (id) => { window.IDS_haptic && window.IDS_haptic(6); onChange(id); };
  return (
    <StepLayout
      eyebrow="YOUR RESPONSE"
      headline="How quickly do you typically reply?"
      sub="Be honest. The calculation only works if the number is real."
      cta={onNext} ctaActive={!!value}
      onBack={onBack}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {window.IDS_RESPONSE.map(opt => {
          const selected = value === opt.id;
          return (
            <button
              type="button" key={opt.id}
              onClick={() => pick(opt.id)}
              className={`card card-selectable ${selected ? 'card-selected' : ''}`}
              style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, padding: selected ? 15 : 16 }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--fg)' }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{opt.desc}</div>
                <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="decay-track"><div className="decay-fill" style={{ width: selected ? Math.round(opt.lossRate * 100) + '%' : '0%' }}></div></div>
                  <span className="decay-label" style={{ opacity: selected ? 1 : 0 }}>−{Math.round(opt.lossRate * 100)}% LEADS</span>
                </div>
              </div>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${selected ? 'var(--brand)' : 'var(--border-2)'}`, position: 'relative', flexShrink: 0, marginLeft: 12 }}>
                {selected && <div className="tick-pop" style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: 'var(--brand)' }} />}
              </div>
            </button>
          );
        })}
      </div>
    </StepLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 5 — Coverage
// ─────────────────────────────────────────────────────────────
function Step5Coverage({ value, onChange, onCalculate, onBack }) {
  const pick = (id) => { window.IDS_haptic && window.IDS_haptic(6); onChange(id); };
  return (
    <StepLayout
      eyebrow="YOUR AVAILABILITY"
      headline="When are you available to reply?"
      sub="When enquiries come in vs. when you're actually there."
      cta={onCalculate} ctaActive={!!value}
      ctaLabel="Calculate my loss"
      ctaFinal
      onBack={onBack}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {window.IDS_COVERAGE.map(opt => {
          const selected = value === opt.id;
          return (
            <button
              type="button" key={opt.id}
              onClick={() => pick(opt.id)}
              className={`card card-selectable ${selected ? 'card-selected' : ''}`}
              style={{ textAlign: 'left', padding: selected ? 15 : 16 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--fg)', marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--fg-3)' }}>{opt.desc}</div>
                </div>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${selected ? 'var(--brand)' : 'var(--border-2)'}`, position: 'relative', flexShrink: 0, marginTop: 2 }}>
                  {selected && <div className="tick-pop" style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: 'var(--brand)' }} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </StepLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// Calculating state — forest takeover. The five answers lock in
// one by one, then digits scramble while the number is "computed".
// ─────────────────────────────────────────────────────────────
function CalculatingState({ inputs = {}, industryObj }) {
  const resp = window.IDS_RESPONSE.find(r => r.id === inputs.responseTime);
  const cov = window.IDS_COVERAGE.find(x => x.id === inputs.coverage);
  const rows = [
    ['INDUSTRY', industryObj ? industryObj.name.toUpperCase() : '—'],
    ['DEAL VALUE', inputs.dealValue ? window.IDS_fmtAED(inputs.dealValue) : '—'],
    ['VOLUME', (inputs.weeklyEnquiries >= 200 ? '200+' : (inputs.weeklyEnquiries || '—')) + ' / WEEK'],
    ['RESPONSE', resp ? resp.label.toUpperCase() : '—'],
    ['COVERAGE', cov ? cov.label.toUpperCase() : '—'],
  ];

  let sample = '34,200';
  try {
    if (inputs.industry && inputs.dealValue && inputs.responseTime && inputs.coverage) {
      sample = window.IDS_calculate(inputs).monthlyLoss.toLocaleString('en-US');
    }
  } catch (e) {}

  return (
    <div style={{ background: 'var(--forest)', color: 'var(--paper)', minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 26px', position: 'relative', overflow: 'hidden' }}>
      <LeakField mode="converge" dark lossRate={0.6} />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="eyebrow rv" style={{ color: 'rgba(247,243,237,0.55)', marginBottom: 16 }}>RUNNING YOUR NUMBERS</div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map(([k, v], i) => (
          <div key={k} className="rv" style={{ '--d': `${120 + i * 150}ms`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(247,243,237,0.12)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em' }}>
            <span style={{ color: 'rgba(247,243,237,0.45)' }}>{k}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--paper-2)' }}>
              {v}
              <svg className="tick-pop" style={{ animationDelay: `${340 + i * 150}ms` }} width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5.5l2.4 2.4 4.6-5.4" stroke="#D4956B" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"></path></svg>
            </span>
          </div>
        ))}
      </div>

      <div className="rv" style={{ '--d': '1050ms', marginTop: 30, textAlign: 'center' }}>
        <ScrambleAED target={sample} fontSize={38} />
        <div className="eyebrow" style={{ marginTop: 12, fontSize: 8.5, color: 'rgba(247,243,237,0.45)' }}>COMPUTING YOUR LEAK</div>
      </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Welcome / intro screen (step 0) — kinetic type
// ─────────────────────────────────────────────────────────────
function WelcomeScreen({ onStart }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: 'calc(78px + env(safe-area-inset-top, 0px)) 22px calc(22px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="eyebrow rv" style={{ marginBottom: 14 }}>FREE · 40 SECONDS · NO SIGN-UP</div>
        <h1 className="h-display" style={{ fontSize: 38, marginBottom: 14, lineHeight: 1.07 }}>
          <span className="mask-line"><span style={{ '--d': '60ms' }}>How much revenue</span></span>
          <span className="mask-line"><span style={{ '--d': '150ms' }}>is your WhatsApp</span></span>
          <span className="mask-line"><span style={{ '--d': '240ms', color: 'var(--clay-deep)' }}>leaking?</span></span>
        </h1>
        <p className="rv" style={{ '--d': '340ms', fontSize: 15, color: 'var(--fg-3)', lineHeight: 1.5, marginBottom: 20 }}>
          Five questions. One specific AED number.
          A free report on what to fix first — built for your business.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid var(--hairline)' }}>
          {[
            ['01', 'Your business'],
            ['02', 'Your numbers'],
            ['03', 'Your volume'],
            ['04', 'Your response'],
            ['05', 'Your coverage'],
          ].map(([n, label], i) => (
            <div key={n} className="rv" style={{ '--d': `${430 + i * 60}ms`, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--hairline)', whiteSpace: 'nowrap' }}>
              <span className="eyebrow" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{n}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: 'var(--fg-2)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <button type="button" onClick={onStart} className="btn btn-primary btn-final rv" style={{ '--d': '780ms' }}>
        Start the audit <span className="btn-arrow" style={{ marginLeft: 4 }}>→</span>
      </button>
      <p className="rv" style={{ '--d': '860ms', marginTop: 14, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--fg-4)' }}>
        Built for UAE SMEs · By Ibrahim Digital
      </p>
    </div>
  );
}

Object.assign(window, {
  Wordmark, ProgressChrome, StepLayout, TickDot,
  Step1Industry, Step2DealValue, Step3Enquiries, Step4Response, Step5Coverage,
  CalculatingState, WelcomeScreen,
});
