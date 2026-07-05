// app.jsx — Calculator state machine

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA, useCallback: useCallbackA } = React;

// ── Kapso delivery endpoint ───────────────────────────────────
// Fill these in after Phase 4 deploy
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
// Calculator state machine
// ─────────────────────────────────────────────────────────────
function useCalculator(initial = {}) {
  // Hydrate once from localStorage if no preset state was passed.
  // Step is clamped to 0..5 — restoring straight into the result/report
  // would render with no `lead` payload (lead isn't persisted).
  const hydrated = useMemoA(() => {
    if (Object.keys(initial).length > 0) return initial;
    try {
      const raw = localStorage.getItem('signal.calculator.state');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }, []);

  const [step, setStep] = useStateA(Math.min(hydrated.step ?? 0, 5)); // 0 welcome, 1-5 steps, 6 calculating, 7 result, 8 report
  const [industry, setIndustry] = useStateA(hydrated.industry ?? null);
  const [dealValue, setDealValue] = useStateA(hydrated.dealValue ?? null);
  const [dealPresetId, setDealPresetId] = useStateA(hydrated.dealPresetId ?? null);
  const [weeklyEnquiries, setWeeklyEnquiries] = useStateA(hydrated.weeklyEnquiries ?? 20);
  const [responseTime, setResponseTime] = useStateA(hydrated.responseTime ?? null);
  const [coverage, setCoverage] = useStateA(hydrated.coverage ?? null);
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
    setTimeout(() => setStep(7), 800);
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
// Top-level calculator app — renders correct step
// ─────────────────────────────────────────────────────────────
function CalculatorApp({ presetState }) {
  const c = useCalculator(presetState);

  let body;
  if (c.step === 0) {
    body = <WelcomeScreen onStart={() => c.gotoStep(1)} />;
  } else if (c.step === 1) {
    body = <Step1Industry value={c.industry} onChange={c.setIndustry} onNext={c.next} onBack={() => c.gotoStep(0)} />;
  } else if (c.step === 2) {
    body = <Step2DealValue
      value={c.dealValue} presetId={c.dealPresetId}
      onChange={c.setDealMeta}
      onNext={c.next} onBack={c.back}
    />;
  } else if (c.step === 3) {
    body = <Step3Enquiries value={c.weeklyEnquiries} onChange={c.setWeeklyEnquiries} onNext={c.next} onBack={c.back} />;
  } else if (c.step === 4) {
    body = <Step4Response value={c.responseTime} onChange={c.setResponseTime} onNext={c.next} onBack={c.back} />;
  } else if (c.step === 5) {
    body = <Step5Coverage value={c.coverage} onChange={c.setCoverage} onCalculate={c.calculate} onBack={c.back} />;
  } else if (c.step === 6) {
    body = <CalculatingState />;
  } else if (c.step === 7) {
    body = <ResultScreenAnnual inputs={c.inputs} calc={c.calc} industryObj={c.industryObj} onUnlock={c.unlock} onBack={() => c.gotoStep(5)} />;
  } else if (c.step === 8) {
    body = <ReportSentScreen calc={c.calc} lead={c.lead} onRestart={c.reset} />;
  }

  // Show progress chrome for steps 1–5
  const showChrome = c.step >= 1 && c.step <= 5;
  // Result/report have their own chrome
  const isFullBleed = c.step >= 7;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      {showChrome && <ProgressChrome step={c.step} totalSteps={5} />}
      <div key={c.step} style={{ position: 'absolute', inset: 0, overflowY: 'auto' }} className="step-enter">
        {body}
      </div>
      <EmailGate open={c.gateOpen} onClose={() => c.setGateOpen(false)} onSubmit={c.submitLead} />
    </div>
  );
}

Object.assign(window, { CalculatorApp, useCalculator });
