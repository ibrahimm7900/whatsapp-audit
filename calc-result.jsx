// calc-result.jsx — Result screen, email gate modal, calculating, animated count-up

const { useState: useStateR, useEffect: useEffectR, useRef: useRefR } = React;

// ─────────────────────────────────────────────────────────────
// Animated count-up
// ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1400, start = 0) {
  const [val, setVal] = useStateR(start);
  useEffectR(() => {
    if (target == null) return;
    let raf, t0;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function tick(now) {
      if (!t0) t0 = now;
      const p = Math.min((now - t0) / duration, 1);
      const v = Math.round(start + (target - start) * ease(p));
      // Snap to nearest 100 like the real value
      setVal(Math.round(v / 100) * 100);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// ─────────────────────────────────────────────────────────────
// Report Markdown generator
// Mirrors the 3-page content of calc-report.jsx as plain text.
// Called by submitLead in app.jsx before POSTing to Kapso.
// ─────────────────────────────────────────────────────────────

// Ported verbatim from calc-report.jsx getDiagnosis()
function getDiagnosisParagraph(inputs, calc) {
  const fast = inputs.responseTime === 'under_1hr' || inputs.responseTime === '1_4hrs';
  const cov  = inputs.coverage;
  if (cov === 'weekdays_only' && !fast)
    return "You're available roughly 45 hours per week. Your leads come in 168 hours per week. The gap — evenings, Fridays, weekends — is where your revenue is going. Every hour offline is an hour a competitor can reply first.";
  if (cov === 'weekdays_only' && fast)
    return "You reply quickly when you're there. The problem is the hours you're not. Evenings, Fridays, and weekends account for 35–45% of all WhatsApp enquiries in the UAE. Those hours are currently unattended.";
  if (cov === 'weekdays_weekends' && !fast)
    return "You're available most days, but your response time is giving leads enough time to contact a competitor and hear back first. In the UAE, 78% of customers commit to whoever responds first.";
  if (cov === 'weekdays_weekends' && fast)
    return `You're fast and available most of the time. The gap is after-hours — evenings and nights when enquiries come in but nothing goes out. That window is costing you ${window.IDS_fmtAED(calc.monthlyLoss)} per month.`;
  if (cov === 'always' && !fast)
    return "You're always reachable, but the speed of your replies is the leak. UAE buyers contact multiple businesses simultaneously. The first reply wins — at your current response time, you're rarely first.";
  return `You reply quickly and you're always available. Your loss is lower than most — but at ${calc.lossRatePercent}% of enquiries still not converting, there is ${window.IDS_fmtAED(calc.monthlyLoss)} per month in leads that are not being captured, qualified, or followed up.`;
}

// Ported verbatim from calc-report.jsx getWhyThree()
function getWhyThreeParagraph(inputs, calc, industryObj) {
  const enq = inputs.weeklyEnquiries >= 200 ? '200+' : inputs.weeklyEnquiries;
  return `You handle ${inputs.dealValue >= 50000 ? 'high-value' : 'time-sensitive'} ${industryObj.name.toLowerCase()} leads in a market where the first reply wins. With ${enq} enquiries per week and ${calc.responseTimeReadable}, your biggest gap is ${calc.coverageMultiplierPercent > 0 ? "coverage — leads going cold while you're offline" : 'speed — competitors replying first'}. These three workflows address that gap in order of ROI.`;
}

function generateReportMD(inputs, calc, industryObj, name) {
  const workflows     = window.IDS_scoreWorkflows(inputs);
  const dateStr       = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const respObj       = window.IDS_RESPONSE.find(r => r.id === inputs.responseTime);
  const covObj        = window.IDS_COVERAGE.find(c => c.id === inputs.coverage);
  const enq           = inputs.weeklyEnquiries >= 200 ? '200+' : inputs.weeklyEnquiries;
  const annual        = calc.monthlyLoss * 12;
  const lossWithPilot = Math.round((calc.monthlyLoss * 0.25) / 100) * 100;
  const netWithPilot  = calc.monthlyLoss - lossWithPilot - 5000;
  const fmt           = window.IDS_fmtAED;

  const workflowBlocks = workflows.map((w, i) => [
    `### ${w.isStartHere ? '★ ' : ''}${i + 1}. ${w.name}${w.isStartHere ? ' — START HERE' : ''}`,
    '',
    w.does,
    '',
    `**Recovers:** ${w.recovers}`,
    `**Complexity:** ${w.complexity} · Live in 48 hours`,
    '',
  ].join('\n')).join('\n');

  return [
    '# WhatsApp Revenue Report · Ibrahim Digital Solutions',
    '',
    '<!-- PAGE:1 -->',
    '## Your Situation',
    `**Prepared for:** ${name} · ${dateStr}`,
    '',
    '### Diagnosis',
    getDiagnosisParagraph(inputs, calc),
    '',
    '### Your Situation',
    '| | |',
    '|---|---|',
    `| Industry | ${industryObj.name} |`,
    `| Average ${industryObj.dealLabel} value | ${fmt(inputs.dealValue)} |`,
    `| Weekly enquiries | ${enq} messages |`,
    `| Response time | ${respObj.label} |`,
    `| Coverage | ${covObj.label} |`,
    '',
    '### The Bottom Line',
    `**Monthly loss:** ${fmt(calc.monthlyLoss)}`,
    `**Weekly loss:** ${fmt(calc.weeklyLoss)}`,
    `**Annual loss:** ${fmt(annual)}`,
    '',
    '<!-- PAGE:2 -->',
    '## Workflow Recommendations',
    `**Based on:** ${industryObj.name} · ${respObj.label} · ${covObj.label}`,
    '',
    '### Why These Three',
    getWhyThreeParagraph(inputs, calc, industryObj),
    '',
    workflowBlocks,
    '<!-- PAGE:3 -->',
    '## The Numbers, Side by Side',
    '',
    '| | Doing nothing | Starting the pilot |',
    '|---|---|---|',
    '| Setup cost | AED 0 | AED 0 |',
    '| Monthly cost | AED 0 | AED 5,000 |',
    `| Monthly loss | ${fmt(calc.monthlyLoss)} | ${fmt(lossWithPilot)} |`,
    `| Net position | −${fmt(calc.monthlyLoss)} | +${fmt(netWithPilot)} |`,
    '',
    `Every month you wait costs you ${fmt(calc.monthlyLoss)}.`,
    `Every month with the pilot costs you AED 5,000.`,
    `The difference is ${fmt(netWithPilot)} — in your pocket, not your competitors'.`,
    '',
    "### Your Next Step — Try it free. See it work. Then decide.",
    '**AED 0** to start · **48 hrs** to live · **No contract**',
    '',
    '**WhatsApp:** +44 7842 552606',
    '**Instagram:** @ibrahim.prompted',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────
// Loss vs Captured visual breakdown bar
// ─────────────────────────────────────────────────────────────
function LossBar({ lossPct }) {
  const lostPct = Math.round(lossPct);
  const keptPct = 100 - lostPct;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(247,243,237,0.10)' }}>
        <div style={{ width: lostPct + '%', background: 'var(--accent)', transition: 'width 800ms cubic-bezier(0.2,0.6,0.2,1)' }} />
        <div style={{ width: keptPct + '%', background: 'rgba(247,243,237,0.22)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        <span style={{ color: 'var(--accent)' }}>{lostPct}% LEAKING</span>
        <span style={{ color: 'rgba(247,243,237,0.55)' }}>{keptPct}% CAPTURED</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Result screen — forest background, full bleed
// ─────────────────────────────────────────────────────────────
function ResultScreen({ inputs, calc, onUnlock, onBack, industryObj }) {
  const monthly = useCountUp(calc.monthlyLoss);
  const totalLossPct = Math.round(calc.lossRatePercent * (1 + calc.coverageMultiplierPercent / 100));
  const cappedLossPct = Math.min(totalLossPct, 95);

  return (
    <div style={{ background: 'var(--bg-inverse)', color: 'var(--paper)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top chrome */}
      <div style={{ padding: '14px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Wordmark size={13} color="var(--paper)" />
        <span className="eyebrow" style={{ fontSize: 9, color: 'var(--paper-3)' }}>YOUR RESULT</span>
      </div>

      <div style={{ padding: '32px 22px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          {/* Diagnostic */}
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 16, lineHeight: 1.35, color: 'var(--paper-2)', marginBottom: 24, textWrap: 'pretty' }}>
            {calc.diagnostic}
          </p>

          {/* The number */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 52, lineHeight: 1, letterSpacing: '-0.045em', color: 'var(--accent)' }}>
              {window.IDS_fmtAED(monthly)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--paper-3)', marginTop: 8, lineHeight: 1.4 }}>
              lost every month from missed WhatsApp enquiries
            </div>
          </div>

          {/* Visual breakdown bar */}
          <LossBar lossPct={cappedLossPct} />

          <div style={{ borderTop: '1px solid rgba(247,243,237,0.18)', marginTop: 22, paddingTop: 16 }}>
            <Breakdown calc={calc} inputs={inputs} industryObj={industryObj} />
          </div>

          <div style={{ borderTop: '1px solid rgba(247,243,237,0.18)', marginTop: 18, paddingTop: 18 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, lineHeight: 1.35, color: 'var(--paper)', textWrap: 'pretty' }}>
              The fix costs AED 5,000/month.<br />
              You're losing {window.IDS_fmtAED(calc.monthlyLoss)}.
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--paper-3)', marginTop: 10, lineHeight: 1.5 }}>
              Every week you wait costs you another <span style={{ color: 'var(--paper)' }}>{window.IDS_fmtAED(calc.weeklyLoss)}</span>.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <button type="button" onClick={onUnlock} className="btn btn-paper">
            Get my free report <span style={{ marginLeft: 4 }}>→</span>
          </button>
          <p style={{ marginTop: 12, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(247,243,237,0.45)' }}>
            Personalised to your business · Free · AED 0
          </p>
          {onBack && (
            <button type="button" onClick={onBack} style={{ marginTop: 10, color: 'rgba(247,243,237,0.45)', fontSize: 11, fontFamily: 'var(--font-display)', display: 'block' }}>← Edit my answers</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Breakdown({ calc, inputs, industryObj }) {
  const dealLabel = industryObj?.dealLabel || 'sale';
  const lines = [
    `${inputs.weeklyEnquiries >= 200 ? '200+' : inputs.weeklyEnquiries} enquiries/week × ${window.IDS_fmtAED(inputs.dealValue)} per ${dealLabel}`,
    `${calc.lossRatePercent}% lost to ${calc.responseTimeReadable}`,
    calc.coverageMultiplierPercent > 0
      ? `Coverage gap adds ${calc.coverageMultiplierPercent}% to your losses`
      : `Always-on coverage — no multiplier`,
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: 'rgba(247,243,237,0.62)', lineHeight: 1.5 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(247,243,237,0.4)', width: 16, flexShrink: 0, marginTop: 1 }}>0{i + 1}</span>
          <span style={{ flex: 1 }}>{l}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Email / WhatsApp gate modal
// ─────────────────────────────────────────────────────────────
const GCC_DIAL_CODES = [
  { code: '+971', country: 'UAE' },
  { code: '+966', country: 'Saudi' },
  { code: '+974', country: 'Qatar' },
  { code: '+965', country: 'Kuwait' },
  { code: '+968', country: 'Oman' },
  { code: '+973', country: 'Bahrain' },
];

// Normalise typed digits into a local mobile number.
// Strips: non-digits, leading zeros, accidentally re-typed country code.
function cleanLocalNumber(raw, dialCode) {
  let digits = (raw || '').replace(/\D/g, '');
  const codeDigits = dialCode.replace('+', '');
  if (digits.startsWith(codeDigits)) digits = digits.slice(codeDigits.length);
  return digits.replace(/^0+/, '');
}

function EmailGate({ open, onClose, onSubmit }) {
  const [name, setName] = useStateR('');
  const [dialCode, setDialCode] = useStateR('+971');
  const [phone, setPhone] = useStateR('');
  const [submitting, setSubmitting] = useStateR(false);

  if (!open) return null;
  const localDigits = cleanLocalNumber(phone, dialCode);
  const valid = name.trim().length > 0 && localDigits.length >= 7;

  function submit(e) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    // E.164 format for Kapso / WhatsApp APIs: +<country><number>
    const whatsapp = dialCode + localDigits;
    // Call immediately — real async work in submitLead drives the loading state
    onSubmit({ name: name.trim(), whatsapp });
  }

  return (
    <div className="gate-overlay" role="dialog" aria-modal="true">
      <div className="gate-card">
        {!submitting ? (
          <form onSubmit={submit}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>UNLOCK YOUR REPORT</div>
            <h2 className="h-headline" style={{ fontSize: 22, marginBottom: 8, textWrap: 'balance' }}>
              Where should we send your report?
            </h2>
            <p style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.5, marginBottom: 20 }}>
              Your personalised report includes workflow recommendations built for your business. It's free.
            </p>

            <label className="form-label">YOUR NAME</label>
            <input
              type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              className="form-input" style={{ marginBottom: 14 }}
            />

            <label className="form-label">YOUR WHATSAPP NUMBER</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <select
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                aria-label="Country code"
                style={{
                  width: 118, height: 48, padding: '0 10px',
                  border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                  background: 'var(--paper)',
                  fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13,
                  color: 'var(--fg)', cursor: 'pointer',
                }}
              >
                {GCC_DIAL_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} {c.country}</option>
                ))}
              </select>
              <input
                type="tel" inputMode="numeric"
                value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="50 123 4567"
                className="form-input"
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>

            <button
              type="submit" disabled={!valid}
              className="btn btn-primary"
              style={{ opacity: valid ? 1 : 0.4, cursor: valid ? 'pointer' : 'not-allowed' }}
            >
              Send my report <span style={{ marginLeft: 4 }}>→</span>
            </button>

            <p style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-4)', textAlign: 'center', lineHeight: 1.5 }}>
              No spam. Your number is used to send the report and nothing else.
            </p>

            <button type="button" onClick={onClose} style={{ marginTop: 14, color: 'var(--fg-4)', fontSize: 11, fontFamily: 'var(--font-display)', display: 'block', margin: '14px auto 0' }}>
              ← Back to result
            </button>
          </form>
        ) : (
          <div style={{ padding: '40px 0 24px', textAlign: 'center' }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>SENDING TO WHATSAPP</div>
            <div className="double-dot" style={{ color: 'var(--brand)' }}><span /><span /></div>
            <p style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 18 }}>
              Your report will arrive in a moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Result screen — 12-month projection variant (chosen design)
// ─────────────────────────────────────────────────────────────
function ResultScreenAnnual({ inputs, calc, industryObj, onUnlock, onBack }) {
  const annual = calc.monthlyLoss * 12;
  const monthly = useCountUp(calc.monthlyLoss);
  return (
    <div style={{ background: 'var(--bg-inverse)', color: 'var(--paper)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', justifyContent: 'space-between' }}>
        <Wordmark size={13} color="var(--paper)" />
        <span className="eyebrow" style={{ fontSize: 9, color: 'var(--paper-3)' }}>YOUR RESULT · 12 MONTH</span>
      </div>
      <div style={{ padding: '36px 22px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, lineHeight: 1.35, color: 'var(--paper-2)', marginBottom: 26 }}>
          {calc.diagnostic}
        </p>
        <div className="eyebrow" style={{ fontSize: 9, color: 'var(--paper-3)', marginBottom: 6 }}>UNCHECKED, OVER 12 MONTHS</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 56, lineHeight: 1, letterSpacing: '-0.045em', color: 'var(--accent)', marginBottom: 22 }}>
          {window.IDS_fmtAED(annual)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid rgba(247,243,237,0.22)' }}>
          <TimeRow label="PER MONTH" value={window.IDS_fmtAED(monthly)} />
          <TimeRow label="PER WEEK" value={window.IDS_fmtAED(calc.weeklyLoss)} />
          <TimeRow label="PER DAY" value={window.IDS_fmtAED(Math.round(calc.weeklyLoss / 7 / 100) * 100)} last />
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 22 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, lineHeight: 1.4, color: 'var(--paper)' }}>
            The fix costs AED 60,000/year. You're losing {window.IDS_fmtAED(annual)}.
          </p>
          <button type="button" onClick={onUnlock} className="btn btn-paper" style={{ marginTop: 18 }}>
            Get my free report <span style={{ marginLeft: 4 }}>→</span>
          </button>
          {onBack && (
            <button type="button" onClick={onBack} style={{ marginTop: 10, color: 'rgba(247,243,237,0.45)', fontSize: 11, fontFamily: 'var(--font-display)', display: 'block', width: '100%', textAlign: 'center' }}>
              ← Edit my answers
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TimeRow({ label, value, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: last ? 'none' : '1px solid rgba(247,243,237,0.14)' }}>
      <span className="eyebrow" style={{ fontSize: 9, color: 'var(--paper-3)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 17, color: 'var(--paper)' }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Success screen — shown after the gate is submitted.
// The report itself is sent via WhatsApp (delivered out-of-band,
// not rendered in the app).
// ─────────────────────────────────────────────────────────────
function ReportSentScreen({ calc, lead, onRestart }) {
  const phone = lead?.whatsapp || 'your WhatsApp';
  const lossLabel = window.IDS_fmtAED(calc.monthlyLoss);
  const waText = encodeURIComponent(`Hi, I just did the WhatsApp revenue audit — looks like I'm losing ${lossLabel} a month. Can you tell me more about the pilot?`);
  const waLink = `https://wa.me/447842552606?text=${waText}`;
  const igLink = 'https://www.instagram.com/ibrahim.prompted/';

  return (
    <div style={{ background: 'var(--bg-inverse)', color: 'var(--paper)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 22px 0', display: 'flex', justifyContent: 'space-between' }}>
        <Wordmark size={13} color="var(--paper)" />
        <span className="eyebrow" style={{ fontSize: 9, color: 'var(--paper-3)' }}>REPORT INCOMING</span>
      </div>

      <div style={{ padding: '36px 22px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="eyebrow" style={{ fontSize: 9, color: 'var(--paper-3)', marginBottom: 14 }}>ON ITS WAY</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, lineHeight: 1.05, letterSpacing: '-0.04em', color: 'var(--paper)', marginBottom: 18, textWrap: 'balance' }}>
          Your report's on the way.
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.55, color: 'var(--paper-2)', marginBottom: 22 }}>
          We'll WhatsApp it to <span style={{ color: 'var(--paper)', fontWeight: 500 }}>{phone}</span> in the next few minutes. It includes the three workflows we'd build first for your business — and a side-by-side of what doing nothing costs.
        </p>

        <div style={{ borderTop: '1px solid rgba(247,243,237,0.18)', borderBottom: '1px solid rgba(247,243,237,0.18)', padding: '16px 0', marginBottom: 22 }}>
          <div className="eyebrow" style={{ fontSize: 9, color: 'var(--paper-3)', marginBottom: 6 }}>YOUR LEAK</div>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, lineHeight: 1.4, color: 'var(--paper)' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{window.IDS_fmtAED(calc.monthlyLoss)}</span> per month, every month, until you fix it.
          </p>
        </div>

        <div className="eyebrow" style={{ fontSize: 9, color: 'var(--paper-3)', marginBottom: 8 }}>WHILE YOU WAIT</div>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 16, lineHeight: 1.4, color: 'var(--paper)', marginBottom: 18, textWrap: 'pretty' }}>
          Want to start the pilot today? Message us — we'll have you live in 48 hours.
        </p>

        <div style={{ marginTop: 'auto', paddingTop: 18 }}>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-paper" style={{ textDecoration: 'none' }}>
            Message us on WhatsApp <span style={{ marginLeft: 4 }}>→</span>
          </a>
          <a href={igLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontFamily: 'var(--font-display)', fontSize: 12, color: 'rgba(247,243,237,0.7)', textDecoration: 'none' }}>
            or DM <span style={{ color: 'var(--paper)', fontWeight: 500 }}>@ibrahim.prompted</span> on Instagram
          </a>
          {onRestart && (
            <button type="button" onClick={onRestart} style={{ marginTop: 18, color: 'rgba(247,243,237,0.45)', fontSize: 11, fontFamily: 'var(--font-display)', display: 'block', width: '100%', textAlign: 'center' }}>
              ← Run another audit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ResultScreen, ResultScreenAnnual, ReportSentScreen, EmailGate, useCountUp, LossBar, generateReportMD });
