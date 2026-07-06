// app.jsx — Calculator state machine, direction-aware pane transitions,
// live ticker mount, localStorage restore + iOS frame wrapper.
// Backend re-injected: Kapso delivery via same-origin proxy, UTM capture,
// delivery-gated Meta Pixel Lead. Report is delivered via WhatsApp only.

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useCallback: useCallbackA, useRef: useRefA } = React;

// ── Kapso delivery endpoint ───────────────────────────────────
const KAPSO_API_BASE    = 'https://api.kapso.ai/platform/v1';
const KAPSO_WORKFLOW_ID = '59e4a70f-cf3b-4b3a-9ee3-31fbf319d803';
const KAPSO_PUBLIC_KEY  = '58f988d84e4310ceb5eb3202457289824e662cc40a03f37d0a913de290982c5b';

// ── UTM attribution ───────────────────────────────────────────
// Captured once at page load — this is a single-page app, so the landing
// URL's query string is the ad/creative that drove the visit.
const IDS_UTMS = (() => {
  try {
    const p = new URLSearchParams(window.location.search);
    const out = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach((k) => {
      const v = p.get(k);
      if (v) out[k] = v;
    });
    return out;
  } catch (e) { return {}; }
})();

// ─────────────────────────────────────────────────────────────
// Restore a saved session (namespace: signal.calculator.state)
// ─────────────────────────────────────────────────────────────
function loadSavedState() {
  try {
    const raw = localStorage.getItem('signal.calculator.state');
    if (!raw) return {};
    const s = JSON.parse(raw) || {};
    let step = typeof s.step === 'number' ? s.step : 0;
    if (step === 6) step = 5;          // never restore mid-calculation
    if (step >= 8) step = 7;           // report needs a lead — land on result
    const complete = s.industry && s.dealValue && s.responseTime && s.coverage;
    if (step >= 6 && !complete) step = Math.min(step, 5);
    if (step === 7 && !complete) step = 0;
    return { ...s, step };
  } catch (e) { return {}; }
}

// ─────────────────────────────────────────────────────────────
// Calculator state machine
// ─────────────────────────────────────────────────────────────
function useCalculator(initial = {}) {
  const [step, setStep] = useStateA(initial.step ?? 0); // 0 welcome, 1-5 steps, 6 calculating, 7 result, 8 report
  const [industry, setIndustry] = useStateA(initial.industry ?? null);
  const [dealValue, setDealValue] = useStateA(initial.dealValue ?? null);
  const [dealPresetId, setDealPresetId] = useStateA(initial.dealPresetId ?? null);
  const [weeklyEnquiries, setWeeklyEnquiries] = useStateA(initial.weeklyEnquiries ?? 20);
  const [responseTime, setResponseTime] = useStateA(initial.responseTime ?? null);
  const [coverage, setCoverage] = useStateA(initial.coverage ?? null);
  const [gateOpen, setGateOpen] = useStateA(false);
  const [lead, setLead] = useStateA(null);

  const inputs = useMemoA(() => ({
    industry, dealValue: dealValue || 0, weeklyEnquiries, responseTime, coverage,
  }), [industry, dealValue, weeklyEnquiries, responseTime, coverage]);

  const calc = useMemoA(() => {
    if (!industry || !dealValue || !responseTime || !coverage) return null;
    return window.IDS_calculate(inputs);
  }, [inputs]);

  const industryObj = useMemoA(() => window.IDS_INDUSTRIES.find(i => i.id === industry), [industry]);

  // ── Persist to localStorage
  useEffectA(() => {
    try {
      const ns = 'signal.calculator';
      localStorage.setItem(`${ns}.state`, JSON.stringify({
        step, industry, dealValue, dealPresetId, weeklyEnquiries, responseTime, coverage,
      }));
    } catch (e) {}
  }, [step, industry, dealValue, dealPresetId, weeklyEnquiries, responseTime, coverage]);

  function gotoStep(n) { setStep(n); }
  function next() { setStep(s => Math.min(s + 1, 8)); }
  function back() { setStep(s => Math.max(s - 1, 0)); }

  function calculate() {
    setStep(6);
    setTimeout(() => setStep(7), 2400);
  }

  function unlock() { setGateOpen(true); }
  async function submitLead(data) {
    const { name, whatsapp } = data;

    // Generate the full report Markdown client-side — all data is in memory
    const markdown = window.generateReportMD(inputs, calc, industryObj, name);

    // Build the Kapso workflow execution payload
    const kapsoPayload = {
      workflow_execution: {
        phone_number: whatsapp,
        variables: {
          lead_name:         name,
          phone_number:      whatsapp,
          monthly_loss:      window.IDS_fmtAED(calc.monthlyLoss),
          weekly_loss:       window.IDS_fmtAED(calc.weeklyLoss),
          annual_loss:       window.IDS_fmtAED(calc.monthlyLoss * 12),
          markdown,
          // Structured fields for pdf-builder in the Kapso Function
          industry:          inputs.industry,
          industry_name:     industryObj.name,
          deal_label:        industryObj.dealLabel,
          deal_value:        inputs.dealValue,
          weekly_enquiries:  inputs.weeklyEnquiries,
          response_time_id:  inputs.responseTime,
          coverage_id:       inputs.coverage,
          loss_rate_pct:     calc.lossRatePercent,
          coverage_mult_pct: calc.coverageMultiplierPercent,
          // Ad attribution — which creative/campaign drove this audit (empty if organic)
          ...IDS_UTMS,
        },
      },
    };

    try {
      // Same-origin proxy (api/submit-audit.js) → Kapso. Direct browser calls
      // to api.kapso.ai are CORS-blocked, which would send us into catch and
      // skip both delivery and the Lead conversion below.
      const res = await fetch('/api/submit-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kapsoPayload),
      });
      // Fire the Meta conversion ONLY on a genuinely successful submission
      // (delivery accepted) — not on click, not on a failed request.
      if (res && res.ok && typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'Lead', {
          content_name: 'whatsapp_audit',
          content_category: 'audit',
        });
      }
    } catch (err) {
      // Log but don't block — user still sees success screen
      console.error('[Kapso] delivery failed:', err);
    }

    // Advance to ReportSentScreen
    setLead({
      name, whatsapp,
      industry:    inputs.industry,
      monthlyLoss: calc?.monthlyLoss,
      weeklyLoss:  calc?.weeklyLoss,
      submittedAt: new Date().toISOString(),
    });
    setGateOpen(false);
    setStep(8);
  }

  function reset() {
    setStep(0); setIndustry(null); setDealValue(null); setDealPresetId(null);
    setWeeklyEnquiries(20); setResponseTime(null); setCoverage(null); setLead(null);
    try { localStorage.removeItem('signal.calculator.state'); } catch(e) {}
  }

  return {
    step, gotoStep, next, back, calculate, unlock, submitLead, reset,
    industry, setIndustry,
    dealValue, dealPresetId, setDealMeta: ({ value, presetId }) => { setDealValue(value); setDealPresetId(presetId); },
    weeklyEnquiries, setWeeklyEnquiries,
    responseTime, setResponseTime,
    coverage, setCoverage,
    inputs, calc, industryObj,
    gateOpen, setGateOpen, lead,
  };
}

// ─────────────────────────────────────────────────────────────
// Top-level calculator app — direction-aware pane transitions
// ─────────────────────────────────────────────────────────────
function CalculatorApp({ presetState }) {
  const c = useCalculator(presetState || loadSavedState());

  // Track step changes for enter/exit direction
  const [trans, setTrans] = useStateA({ prev: null, dir: 1 });
  const prevRef = useRefA(c.step);
  useEffectA(() => {
    if (prevRef.current === c.step) return;
    const dir = c.step > prevRef.current ? 1 : -1;
    setTrans({ prev: prevRef.current, dir });
    prevRef.current = c.step;
    const t = setTimeout(() => setTrans(tr => ({ ...tr, prev: null })), 360);
    return () => clearTimeout(t);
  }, [c.step]);

  function renderStep(s) {
    if (s === 0) return <WelcomeScreen onStart={() => c.gotoStep(1)} />;
    if (s === 1) return <Step1Industry value={c.industry} onChange={c.setIndustry} onNext={c.next} onBack={() => c.gotoStep(0)} />;
    if (s === 2) return <Step2DealValue value={c.dealValue} presetId={c.dealPresetId} onChange={c.setDealMeta} onNext={c.next} onBack={c.back} />;
    if (s === 3) return <Step3Enquiries value={c.weeklyEnquiries} onChange={c.setWeeklyEnquiries} onNext={c.next} onBack={c.back} />;
    if (s === 4) return <Step4Response value={c.responseTime} onChange={c.setResponseTime} onNext={c.next} onBack={c.back} />;
    if (s === 5) return <Step5Coverage value={c.coverage} onChange={c.setCoverage} onCalculate={c.calculate} onBack={c.back} />;
    if (s === 6) return <CalculatingState inputs={c.inputs} industryObj={c.industryObj} />;
    if (s === 7) return <ResultScreenAnnual inputs={c.inputs} calc={c.calc} industryObj={c.industryObj} onUnlock={c.unlock} onBack={() => c.gotoStep(5)} />;
    if (s === 8) return <ReportSentScreen calc={c.calc} lead={c.lead} onRestart={c.reset} />;
    return null;
  }

  const showChrome = c.step >= 1 && c.step <= 5;
  const showTicker = c.step >= 1 && c.step <= 5;

  // Leak-field loss rate reacts to the answers so far
  const respObj = window.IDS_RESPONSE.find(r => r.id === c.responseTime);
  const covObj = window.IDS_COVERAGE.find(x => x.id === c.coverage);
  const fieldRate = Math.min(0.85, (respObj ? respObj.lossRate : 0.12) * (covObj ? covObj.multiplier : 1));
  const showField = c.step <= 6;

  return (
    <div className={showTicker ? 'has-ticker' : ''} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      {showField && <LeakField mode="drift" lossRate={fieldRate} parallax />}
      {showChrome && <ProgressChrome step={c.step} totalSteps={5} />}

      {trans.prev !== null && (
        <div key={'prev-' + trans.prev} className={`pane no-anim ${trans.dir > 0 ? 'pane-out-fwd' : 'pane-out-back'}`}>
          {renderStep(trans.prev)}
        </div>
      )}
      <div key={'cur-' + c.step} className={`pane ${trans.dir > 0 ? 'pane-in-fwd' : 'pane-in-back'}`}>
        {renderStep(c.step)}
      </div>

      {showTicker && (
        <LiveTicker
          step={c.step}
          industry={c.industry}
          dealValue={c.dealValue}
          weeklyEnquiries={c.weeklyEnquiries}
          responseTime={c.responseTime}
          coverage={c.coverage}
        />
      )}
      <EmailGate open={c.gateOpen} onClose={() => c.setGateOpen(false)} onSubmit={c.submitLead} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// iOS frame wrapper — fixed mobile preview shell (unused in production
// mount; kept for the design-canvas preview)
// ─────────────────────────────────────────────────────────────
function PhoneFrame({ children, width = 390, height = 800, label, sublabel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {label && (
        <div style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ fontSize: 9, color: 'var(--fg-3)' }}>{label}</div>
          {sublabel && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>{sublabel}</div>}
        </div>
      )}
      <div style={{
        width, height, borderRadius: 44, overflow: 'hidden', position: 'relative',
        background: '#000',
        boxShadow: '0 30px 60px rgba(15,30,22,0.18), 0 0 0 11px #0a1410, 0 0 0 12px rgba(0,0,0,0.35)',
        fontFamily: 'var(--font-body)',
      }}>
        {/* Dynamic island */}
        <div style={{
          position: 'absolute', top: 9, left: '50%', transform: 'translateX(-50%)',
          width: 110, height: 32, borderRadius: 24, background: '#000', zIndex: 50,
        }} />
        {/* Status bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: '14px 26px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 44,
          color: 'var(--fg)', pointerEvents: 'none',
        }}>
          <span style={{ fontFamily: '-apple-system, system-ui', fontWeight: 600, fontSize: 14 }}>9:41</span>
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><rect x="0" y="6" width="3" height="4" rx="0.5"/><rect x="4" y="4" width="3" height="6" rx="0.5"/><rect x="8" y="2" width="3" height="8" rx="0.5"/><rect x="12" y="0" width="3" height="10" rx="0.5"/></svg>
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="18" height="9" rx="2.5"/><rect x="2" y="2" width="15" height="6" rx="1" fill="currentColor"/><path d="M20 3v4c0.6-0.2 1-0.8 1-2s-0.4-1.8-1-2z" fill="currentColor"/></svg>
          </span>
        </div>
        {/* Screen content */}
        <div style={{ position: 'absolute', inset: 0, paddingTop: 44, paddingBottom: 8, background: 'var(--bg)', overflow: 'hidden' }}>
          <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
            {children}
          </div>
        </div>
        {/* Home indicator */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 24,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 7, zIndex: 60, pointerEvents: 'none',
        }}>
          <div style={{ width: 130, height: 4.5, borderRadius: 100, background: 'rgba(0,0,0,0.32)' }} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CalculatorApp, useCalculator, PhoneFrame, loadSavedState });
