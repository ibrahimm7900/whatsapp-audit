// calc-shell.jsx — Calculator app shell, progress chrome, step transitions

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─────────────────────────────────────────────────────────────
// Wordmark
// ─────────────────────────────────────────────────────────────
function Wordmark({ size = 16, dot = true, color }) {
  return (
    <span className="wordmark" style={{ fontSize: size, color: color || 'inherit', letterSpacing: '-0.025em' }}>
      Ibrahim Digital{dot ? <span className="wordmark-dot" /> : null}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Progress bar — fixed at top
// ─────────────────────────────────────────────────────────────
function ProgressChrome({ step, totalSteps = 5 }) {
  const pct = step === 0 ? 0 : (step / totalSteps) * 100;
  const visible = step > 0 && step <= totalSteps;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '12px 20px 10px', background: 'var(--bg)', zIndex: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Wordmark size={13} />
        {visible && (
          <span className="eyebrow" style={{ fontSize: 9 }}>STEP {step} OF {totalSteps}</span>
        )}
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Step layout — eyebrow / headline / sub / body / cta
// ─────────────────────────────────────────────────────────────
function StepLayout({ eyebrow, headline, sub, children, cta, onBack, ctaActive, ctaLabel = 'Continue', ctaFinal }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: '78px 22px 22px' }}>
      <div style={{ marginBottom: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</div>
        <h1 className="h-headline" style={{ marginBottom: 8 }}>{headline}</h1>
        {sub && <p className="h-sub">{sub}</p>}
      </div>

      <div style={{ flex: 1 }}>{children}</div>

      <div style={{ marginTop: 24 }}>
        {cta !== false && (
          <button
            type="button"
            onClick={ctaActive ? cta : undefined}
            disabled={!ctaActive}
            className={`btn btn-primary ${ctaFinal ? 'btn-final' : ''}`}
            style={{ opacity: ctaActive ? 1 : 0.32, cursor: ctaActive ? 'pointer' : 'not-allowed' }}
          >
            {ctaLabel} <span style={{ marginLeft: 4 }}>→</span>
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

// ─────────────────────────────────────────────────────────────
// Step 1 — Industry
// ─────────────────────────────────────────────────────────────
function Step1Industry({ value, onChange, onNext, onBack }) {
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
            <button
              type="button" key={ind.id}
              onClick={() => onChange(ind.id)}
              className={`card card-selectable ${selected ? 'card-selected' : ''}`}
              style={{ textAlign: 'left', minHeight: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: selected ? 11 : 12 }}
            >
              <div className="eyebrow" style={{ fontSize: 9, color: selected ? 'var(--brand)' : 'var(--fg-4)' }}>0{i + 1}</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, lineHeight: 1.15, color: 'var(--fg)', marginBottom: 3 }}>{ind.name}</div>
                <div style={{ fontSize: 11, lineHeight: 1.35, color: 'var(--fg-3)' }}>{ind.desc}</div>
              </div>
            </button>
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

  function selectPreset(p) {
    onChange({ presetId: p.id, value: p.value });
    setCustom('');
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
// Step 3 — Weekly enquiries (slider)
// ─────────────────────────────────────────────────────────────
const SNAPS = [5, 10, 20, 30, 50, 75, 100, 150, 200];

function Step3Enquiries({ value, onChange, onNext, onBack }) {
  const idx = SNAPS.indexOf(value);
  const safeIdx = idx === -1 ? 2 : idx;
  const fillPct = (safeIdx / (SNAPS.length - 1)) * 100;
  const display = value >= 200 ? '200+' : String(value);

  return (
    <StepLayout
      eyebrow="YOUR VOLUME"
      headline="How many WhatsApp messages do you get per week?"
      sub="Rough number is fine. Count enquiries, not replies."
      cta={onNext} ctaActive={true}
      onBack={onBack}
    >
      <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--r-lg)', padding: '32px 20px 20px', textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 56, lineHeight: 1, letterSpacing: '-0.04em', color: 'var(--brand)' }}>
          {display}
        </div>
        <div className="eyebrow" style={{ fontSize: 9, marginTop: 8 }}>ENQUIRIES PER WEEK</div>

        <input
          type="range" min={0} max={SNAPS.length - 1} step={1}
          value={safeIdx}
          onChange={(e) => onChange(SNAPS[parseInt(e.target.value, 10)])}
          className="signal-slider"
          style={{ marginTop: 28, '--fill': fillPct + '%' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', color: 'var(--fg-4)', marginTop: 4 }}>
          <span>5</span><span>200+</span>
        </div>
      </div>
    </StepLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// Step 4 — Response time
// ─────────────────────────────────────────────────────────────
function Step4Response({ value, onChange, onNext, onBack }) {
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
              onClick={() => onChange(opt.id)}
              className={`card card-selectable ${selected ? 'card-selected' : ''}`}
              style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, padding: selected ? 15 : 16 }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--fg)' }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{opt.desc}</div>
              </div>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${selected ? 'var(--brand)' : 'var(--border-2)'}`, position: 'relative', flexShrink: 0, marginLeft: 12 }}>
                {selected && <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: 'var(--brand)' }} />}
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
              onClick={() => onChange(opt.id)}
              className={`card card-selectable ${selected ? 'card-selected' : ''}`}
              style={{ textAlign: 'left', padding: selected ? 15 : 16 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--fg)', marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--fg-3)' }}>{opt.desc}</div>
                </div>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${selected ? 'var(--brand)' : 'var(--border-2)'}`, position: 'relative', flexShrink: 0, marginTop: 2 }}>
                  {selected && <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: 'var(--brand)' }} />}
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
// Calculating state
// ─────────────────────────────────────────────────────────────
function CalculatingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 24, textAlign: 'center' }}>
      <div className="eyebrow" style={{ marginBottom: 14 }}>RUNNING THE NUMBERS</div>
      <div className="double-dot" style={{ color: 'var(--brand)' }}><span /><span /></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Welcome / intro screen (step 0)
// ─────────────────────────────────────────────────────────────
function WelcomeScreen({ onStart }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: '78px 22px 22px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>FREE · 60 SECONDS · NO SIGN-UP</div>
        <h1 className="h-display" style={{ fontSize: 38, marginBottom: 14, lineHeight: 1.05 }}>
          How much revenue is your WhatsApp leaking?
        </h1>
        <p style={{ fontSize: 15, color: 'var(--fg-3)', lineHeight: 1.5, marginBottom: 20 }}>
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
          ].map(([n, label]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--hairline)', whiteSpace: 'nowrap' }}>
              <span className="eyebrow" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{n}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: 'var(--fg-2)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <button type="button" onClick={onStart} className="btn btn-primary btn-final">
        Start the audit <span style={{ marginLeft: 4 }}>→</span>
      </button>
      <p style={{ marginTop: 14, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--fg-4)' }}>
        Built for UAE SMEs · By Ibrahim Digital
      </p>
    </div>
  );
}

Object.assign(window, {
  Wordmark, ProgressChrome, StepLayout,
  Step1Industry, Step2DealValue, Step3Enquiries, Step4Response, Step5Coverage,
  CalculatingState, WelcomeScreen,
});
