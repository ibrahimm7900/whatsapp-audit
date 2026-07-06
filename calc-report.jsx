// calc-report.jsx — 3-page personalised PDF report

const { useMemo: useMemoRP } = React;

// ─────────────────────────────────────────────────────────────
// Diagnosis paragraph picker
// ─────────────────────────────────────────────────────────────
function getDiagnosis(inputs, calc) {
  const fast = inputs.responseTime === 'under_1hr' || inputs.responseTime === '1_4hrs';
  const cov = inputs.coverage;
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

// ─────────────────────────────────────────────────────────────
// Why these three?
// ─────────────────────────────────────────────────────────────
function getWhyThree(inputs, calc, industryObj) {
  const enq = inputs.weeklyEnquiries >= 200 ? '200+' : inputs.weeklyEnquiries;
  return `You handle ${inputs.dealValue >= 50000 ? 'high-value' : 'time-sensitive'} ${industryObj.name.toLowerCase()} leads in a market where the first reply wins. With ${enq} enquiries per week and ${calc.responseTimeReadable}, your biggest gap is ${calc.coverageMultiplierPercent > 0 ? 'coverage — leads going cold while you\u2019re offline' : 'speed — competitors replying first'}. These three workflows address that gap in order of ROI.`;
}

// ─────────────────────────────────────────────────────────────
// Report header — appears at the top of every page
// ─────────────────────────────────────────────────────────────
function ReportHeader({ pageNumber, totalPages = 3 }) {
  return (
    <div className="report-header">
      <Wordmark size={13} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="eyebrow" style={{ fontSize: 9 }}>WHATSAPP REVENUE REPORT</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', color: 'var(--fg-4)' }}>
          {String(pageNumber).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page 1 — Their situation
// ─────────────────────────────────────────────────────────────
function ReportPage1({ inputs, calc, industryObj, name, dateStr }) {
  const enq = inputs.weeklyEnquiries >= 200 ? '200+' : inputs.weeklyEnquiries;
  const respLabel = window.IDS_RESPONSE.find(r => r.id === inputs.responseTime).label;
  const covLabel = window.IDS_COVERAGE.find(c => c.id === inputs.coverage).label;
  const diagnosis = getDiagnosis(inputs, calc);

  return (
    <div className="report-page">
      <ReportHeader pageNumber={1} />
      <div className="report-body">
        <div className="eyebrow" style={{ marginBottom: 14 }}>
          PREPARED FOR {name?.toUpperCase() || 'YOU'} · {dateStr}
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: 18, textWrap: 'balance' }}>
          Your WhatsApp is losing you {window.IDS_fmtAED(calc.monthlyLoss)} every month.
        </h1>

        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-2)', marginBottom: 22 }}>
          {diagnosis}
        </p>

        {/* Situation block */}
        <div className="situation-block">
          <div className="eyebrow" style={{ marginBottom: 12, color: 'var(--fg-3)' }}>YOUR SITUATION</div>
          <div className="kv-grid">
            <KV label="Industry" value={industryObj.name} />
            <KV label={`Average ${industryObj.dealLabel} value`} value={window.IDS_fmtAED(inputs.dealValue)} />
            <KV label="Weekly enquiries" value={`${enq} messages`} />
            <KV label="Response time" value={respLabel} />
            <KV label="Coverage" value={covLabel} last />
          </div>
        </div>

        {/* Loss summary panel */}
        <div className="forest-panel">
          <div className="eyebrow" style={{ color: 'var(--paper-3)', marginBottom: 8 }}>THE BOTTOM LINE</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginTop: 10 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, lineHeight: 1, letterSpacing: '-0.035em', color: 'var(--accent)' }}>
                {window.IDS_fmtAED(calc.monthlyLoss)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--paper-3)', marginTop: 6 }}>lost monthly</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--paper)' }}>
                {window.IDS_fmtAED(calc.weeklyLoss)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--paper-3)', marginTop: 4 }}>per week</div>
            </div>
          </div>
        </div>
      </div>
      <ReportFooter pageNumber={1} name={name} />
    </div>
  );
}

function KV({ label, value, last }) {
  return (
    <div className="kv-row" style={{ borderBottom: last ? 'none' : '1px solid var(--hairline)' }}>
      <div className="kv-label">{label}</div>
      <div className="kv-value">{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page 2 — Workflow recommendations
// ─────────────────────────────────────────────────────────────
function ReportPage2({ inputs, calc, industryObj, workflows, name }) {
  return (
    <div className="report-page">
      <ReportHeader pageNumber={2} />
      <div className="report-body">
        <div className="eyebrow" style={{ marginBottom: 12 }}>RECOMMENDED FOR {(name || 'you').toUpperCase()}'S BUSINESS</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 8, textWrap: 'balance' }}>
          Three workflows that would fix your specific gap.
        </h2>
        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--fg-3)', marginBottom: 22 }}>
          Based on your {industryObj.name.toLowerCase()} business, {calc.responseTimeReadable.replace(' response times', '')} response, and {calc.coverageReadable}.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {workflows.map((w, i) => (
            <WorkflowCard key={w.id} w={w} index={i} isStartHere={w.isStartHere} />
          ))}
        </div>

        <div className="why-three">
          <div className="eyebrow" style={{ marginBottom: 8, color: 'var(--fg-3)' }}>WHY THESE THREE</div>
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--fg-2)' }}>
            {getWhyThree(inputs, calc, industryObj)}
          </p>
        </div>
      </div>
      <ReportFooter pageNumber={2} name={name} />
    </div>
  );
}

function WorkflowCard({ w, index, isStartHere }) {
  return (
    <div className={`workflow-card ${isStartHere ? 'workflow-start-here' : ''}`}>
      {isStartHere && <div className="start-here-tag">START HERE</div>}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span className="workflow-num">0{index + 1}</span>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--fg)', letterSpacing: '-0.015em' }}>{w.name}</h3>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 8 }}>{w.does}</p>
      <p style={{ fontSize: 12.5, color: 'var(--brand)', lineHeight: 1.5, fontWeight: 500 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)', marginRight: 8 }}>RECOVERS</span>
        {w.recovers}
      </p>
      <div className="workflow-meta">
        <span>{w.complexity?.toUpperCase()} COMPLEXITY</span>
        <span style={{ width: 3, height: 3, background: 'var(--fg-4)', borderRadius: '50%' }} />
        <span>LIVE IN 24 HOURS</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page 3 — Pilot offer
// ─────────────────────────────────────────────────────────────
function ReportPage3({ inputs, calc, name }) {
  const lossWithPilot = Math.round((calc.monthlyLoss * 0.25) / 100) * 100;
  const netWithPilot = calc.monthlyLoss - lossWithPilot - 5000;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="report-page">
      <ReportHeader pageNumber={3} />
      <div className="report-body">
        <div className="eyebrow" style={{ marginBottom: 10 }}>THE COMPARISON</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 18, textWrap: 'balance' }}>
          The numbers, side by side.
        </h2>

        <table className="compare-table">
          <thead>
            <tr><th></th><th>Doing nothing</th><th>Starting the pilot</th></tr>
          </thead>
          <tbody>
            <tr><td>Setup cost</td><td>AED 0</td><td>AED 0</td></tr>
            <tr><td>Monthly cost</td><td>AED 0</td><td>AED 5,000</td></tr>
            <tr><td>Monthly loss</td><td className="loss">{window.IDS_fmtAED(calc.monthlyLoss)}</td><td>{window.IDS_fmtAED(lossWithPilot)}</td></tr>
            <tr className="net-row">
              <td>Net position</td>
              <td className="loss">−{window.IDS_fmtAED(calc.monthlyLoss)}</td>
              <td className="gain">+{window.IDS_fmtAED(netWithPilot)}</td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', color: 'var(--fg-4)', marginTop: 8, textTransform: 'uppercase' }}>
          Loss reduction estimate based on IDS pilot data. Actual results vary.
        </p>

        <div className="forest-panel" style={{ marginTop: 20 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14.5, lineHeight: 1.55, color: 'var(--paper)', textWrap: 'pretty' }}>
            Every month you wait costs you <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>{window.IDS_fmtAED(calc.monthlyLoss)}</strong>.<br />
            Every month with the pilot costs you <strong style={{ fontWeight: 600 }}>AED 5,000</strong>.<br />
            The difference is <strong style={{ fontWeight: 600 }}>{window.IDS_fmtAED(netWithPilot)}</strong> — in your pocket, not your competitors'.
          </p>
        </div>

        <div className="pilot-offer">
          <div className="eyebrow" style={{ marginBottom: 10 }}>YOUR NEXT STEP</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 18, textWrap: 'balance' }}>
            Try it free. See it work. Then decide.
          </h3>
          <div className="offer-cols">
            <div><div className="offer-num">AED 0</div><div className="offer-cap">to start</div></div>
            <div><div className="offer-num">24 hrs</div><div className="offer-cap">to live</div></div>
            <div><div className="offer-num">No</div><div className="offer-cap">contract</div></div>
          </div>

          <div className="contact-block">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, marginBottom: 12 }}>
              DM <strong>PILOT</strong> on Instagram or WhatsApp us directly.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--fg-2)' }}>
              <div><span className="contact-label">WHATSAPP</span> +971 50 000 0000</div>
              <div><span className="contact-label">INSTAGRAM</span> @ibrahimdigital</div>
            </div>
          </div>
        </div>
      </div>
      <ReportFooter pageNumber={3} name={name} dateStr={dateStr} last />
    </div>
  );
}

function ReportFooter({ pageNumber, name, dateStr, last }) {
  return (
    <div className="report-footer">
      <span>Ibrahim Digital · Dubai · ibrahimdigital.com</span>
      <span>{last && dateStr ? `Prepared for ${name || 'you'} · ${dateStr}` : `Page ${pageNumber} of 3`}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Report screen — wraps all 3 pages with mobile preview shell
// ─────────────────────────────────────────────────────────────
function ReportScreen({ inputs, calc, industryObj, name, onPrint, onRestart }) {
  const workflows = useMemoRP(() => window.IDS_scoreWorkflows(inputs), [inputs]);
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ background: 'var(--bg-2)', minHeight: '100%' }}>
      <div className="report-topbar no-print">
        <Wordmark size={13} />
        <div className="eyebrow" style={{ fontSize: 9 }}>YOUR REPORT</div>
      </div>

      <div className="report-stack" id="report-pages">
        <ReportPage1 inputs={inputs} calc={calc} industryObj={industryObj} name={name} dateStr={dateStr} />
        <ReportPage2 inputs={inputs} calc={calc} industryObj={industryObj} workflows={workflows} name={name} />
        <ReportPage3 inputs={inputs} calc={calc} name={name} />
      </div>

      <div className="report-actions no-print">
        <button type="button" onClick={onPrint} className="btn btn-primary">
          Download PDF <span style={{ marginLeft: 4 }}>↓</span>
        </button>
        <button type="button" onClick={onRestart} className="btn btn-ghost">
          Run another audit
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { ReportScreen, ReportPage1, ReportPage2, ReportPage3 });
