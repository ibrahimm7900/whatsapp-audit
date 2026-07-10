// calc-result.jsx — Result screen (annual), email/WhatsApp gate modal, count-up,
// report-markdown generator (for the WhatsApp PDF), searchable country picker,
// and the "report on its way via WhatsApp" success screen.
//
// New design base (useCountUp / LossBar / ResultScreen / Breakdown / EmailGate shell)
// with the live funnel re-injected: CountryCombobox + dial codes, generateReportMD,
// ResultScreenAnnual (animated 12-month variant), and ReportSentScreen.

const { useState: useStateR, useEffect: useEffectR, useRef: useRefR } = React;

// ─────────────────────────────────────────────────────────────
// Animated count-up
// ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1400, start = 0) {
  const [val, setVal] = useStateR(start);
  useEffectR(() => {
    if (target == null) return;
    if (window.IDS_reducedMotion && window.IDS_reducedMotion()) { setVal(target); return; }
    let raf, t0;
    // Non-linear pacing: fast start, agonizing slowdown on the last stretch
    const ease = (t) => 1 - Math.pow(1 - t, 5);
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
// Mirrors the 3-page report content as plain text. Called by submitLead
// in app.jsx before POSTing to Kapso — this is what the PDF-builder renders.
// ─────────────────────────────────────────────────────────────

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
  const residualLoss  = Math.round((calc.monthlyLoss * 0.25) / 100) * 100; // ~75% recovered
  const recovered     = calc.monthlyLoss - residualLoss;
  const fmt           = window.IDS_fmtAED;

  const workflowBlocks = workflows.map((w, i) => [
    `### ${w.isStartHere ? '★ ' : ''}${i + 1}. ${w.name}${w.isStartHere ? ' — START HERE' : ''}`,
    '',
    w.does,
    '',
    `**Recovers:** ${w.recovers}`,
    `**Complexity:** ${w.complexity} · Live in 24 hours`,
    '',
  ].join('\n')).join('\n');

  return [
    '# WhatsApp Revenue Report · Ibrahim Digital Solutions',
    '',
    '<!-- PAGE:1 -->',
    '## Your Situation',
    `**Prepared for:** ${name || 'you'} · ${dateStr}`,
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
    '| | Doing nothing | With a custom-built WhatsApp system |',
    '|---|---|---|',
    `| Monthly loss | ${fmt(calc.monthlyLoss)} | ${fmt(residualLoss)} |`,
    `| Recovered each month | AED 0 | +${fmt(recovered)} |`,
    '',
    `Every month you wait costs you ${fmt(calc.monthlyLoss)}.`,
    `A custom-built WhatsApp system recovers most of that — around ${fmt(recovered)} a month back in your pocket.`,
    `The fix costs a fraction of what you're losing. We'll show you exactly — free.`,
    '',
    "### Your Next Step — Try it free. See it work. Then decide.",
    '**AED 0** to start · **24 hrs** to live · **No contract**',
    '',
    '**WhatsApp:** +44 7353 750250',
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
// Result screen — big-number variant (kept for reference; app renders
// ResultScreenAnnual at step 7)
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
              You're losing {window.IDS_fmtAED(calc.monthlyLoss)} a month.<br />
              The fix costs a fraction of that.
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
// Searchable country-code picker (re-injected — the live one)
// ─────────────────────────────────────────────────────────────
// Gulf countries — pinned to the top of the picker (our core audience).
const GCC_DIAL_CODES = [
  { iso: 'AE', code: '+971', country: 'United Arab Emirates' },
  { iso: 'SA', code: '+966', country: 'Saudi Arabia' },
  { iso: 'QA', code: '+974', country: 'Qatar' },
  { iso: 'KW', code: '+965', country: 'Kuwait' },
  { iso: 'OM', code: '+968', country: 'Oman' },
  { iso: 'BH', code: '+973', country: 'Bahrain' },
];

// Everyone else, alphabetical. Value is the dial code (all we need for E.164);
// where a code is shared (+1, +7), the first entry represents it in the closed select.
const WORLD_DIAL_CODES = [
  { iso: 'AF', code: '+93',  country: 'Afghanistan' },
  { iso: 'AL', code: '+355', country: 'Albania' },
  { iso: 'DZ', code: '+213', country: 'Algeria' },
  { iso: 'AD', code: '+376', country: 'Andorra' },
  { iso: 'AO', code: '+244', country: 'Angola' },
  { iso: 'AR', code: '+54',  country: 'Argentina' },
  { iso: 'AM', code: '+374', country: 'Armenia' },
  { iso: 'AU', code: '+61',  country: 'Australia' },
  { iso: 'AT', code: '+43',  country: 'Austria' },
  { iso: 'AZ', code: '+994', country: 'Azerbaijan' },
  { iso: 'BD', code: '+880', country: 'Bangladesh' },
  { iso: 'BB', code: '+1',   country: 'Barbados' },
  { iso: 'BY', code: '+375', country: 'Belarus' },
  { iso: 'BE', code: '+32',  country: 'Belgium' },
  { iso: 'BZ', code: '+501', country: 'Belize' },
  { iso: 'BJ', code: '+229', country: 'Benin' },
  { iso: 'BT', code: '+975', country: 'Bhutan' },
  { iso: 'BO', code: '+591', country: 'Bolivia' },
  { iso: 'BA', code: '+387', country: 'Bosnia and Herzegovina' },
  { iso: 'BW', code: '+267', country: 'Botswana' },
  { iso: 'BR', code: '+55',  country: 'Brazil' },
  { iso: 'BN', code: '+673', country: 'Brunei' },
  { iso: 'BG', code: '+359', country: 'Bulgaria' },
  { iso: 'BF', code: '+226', country: 'Burkina Faso' },
  { iso: 'BI', code: '+257', country: 'Burundi' },
  { iso: 'KH', code: '+855', country: 'Cambodia' },
  { iso: 'CM', code: '+237', country: 'Cameroon' },
  { iso: 'CA', code: '+1',   country: 'Canada' },
  { iso: 'TD', code: '+235', country: 'Chad' },
  { iso: 'CL', code: '+56',  country: 'Chile' },
  { iso: 'CN', code: '+86',  country: 'China' },
  { iso: 'CO', code: '+57',  country: 'Colombia' },
  { iso: 'CD', code: '+243', country: 'Congo (DRC)' },
  { iso: 'CG', code: '+242', country: 'Congo (Republic)' },
  { iso: 'CR', code: '+506', country: 'Costa Rica' },
  { iso: 'HR', code: '+385', country: 'Croatia' },
  { iso: 'CU', code: '+53',  country: 'Cuba' },
  { iso: 'CY', code: '+357', country: 'Cyprus' },
  { iso: 'CZ', code: '+420', country: 'Czechia' },
  { iso: 'DK', code: '+45',  country: 'Denmark' },
  { iso: 'DJ', code: '+253', country: 'Djibouti' },
  { iso: 'DO', code: '+1',   country: 'Dominican Republic' },
  { iso: 'EC', code: '+593', country: 'Ecuador' },
  { iso: 'EG', code: '+20',  country: 'Egypt' },
  { iso: 'SV', code: '+503', country: 'El Salvador' },
  { iso: 'EE', code: '+372', country: 'Estonia' },
  { iso: 'ET', code: '+251', country: 'Ethiopia' },
  { iso: 'FJ', code: '+679', country: 'Fiji' },
  { iso: 'FI', code: '+358', country: 'Finland' },
  { iso: 'FR', code: '+33',  country: 'France' },
  { iso: 'GA', code: '+241', country: 'Gabon' },
  { iso: 'GM', code: '+220', country: 'Gambia' },
  { iso: 'GE', code: '+995', country: 'Georgia' },
  { iso: 'DE', code: '+49',  country: 'Germany' },
  { iso: 'GH', code: '+233', country: 'Ghana' },
  { iso: 'GR', code: '+30',  country: 'Greece' },
  { iso: 'GT', code: '+502', country: 'Guatemala' },
  { iso: 'GN', code: '+224', country: 'Guinea' },
  { iso: 'GY', code: '+592', country: 'Guyana' },
  { iso: 'HT', code: '+509', country: 'Haiti' },
  { iso: 'HN', code: '+504', country: 'Honduras' },
  { iso: 'HK', code: '+852', country: 'Hong Kong' },
  { iso: 'HU', code: '+36',  country: 'Hungary' },
  { iso: 'IS', code: '+354', country: 'Iceland' },
  { iso: 'IN', code: '+91',  country: 'India' },
  { iso: 'ID', code: '+62',  country: 'Indonesia' },
  { iso: 'IR', code: '+98',  country: 'Iran' },
  { iso: 'IQ', code: '+964', country: 'Iraq' },
  { iso: 'IE', code: '+353', country: 'Ireland' },
  { iso: 'IL', code: '+972', country: 'Israel' },
  { iso: 'IT', code: '+39',  country: 'Italy' },
  { iso: 'CI', code: '+225', country: "Côte d'Ivoire" },
  { iso: 'JM', code: '+1',   country: 'Jamaica' },
  { iso: 'JP', code: '+81',  country: 'Japan' },
  { iso: 'JO', code: '+962', country: 'Jordan' },
  { iso: 'KZ', code: '+7',   country: 'Kazakhstan' },
  { iso: 'KE', code: '+254', country: 'Kenya' },
  { iso: 'XK', code: '+383', country: 'Kosovo' },
  { iso: 'KG', code: '+996', country: 'Kyrgyzstan' },
  { iso: 'LA', code: '+856', country: 'Laos' },
  { iso: 'LV', code: '+371', country: 'Latvia' },
  { iso: 'LB', code: '+961', country: 'Lebanon' },
  { iso: 'LS', code: '+266', country: 'Lesotho' },
  { iso: 'LR', code: '+231', country: 'Liberia' },
  { iso: 'LY', code: '+218', country: 'Libya' },
  { iso: 'LI', code: '+423', country: 'Liechtenstein' },
  { iso: 'LT', code: '+370', country: 'Lithuania' },
  { iso: 'LU', code: '+352', country: 'Luxembourg' },
  { iso: 'MO', code: '+853', country: 'Macau' },
  { iso: 'MG', code: '+261', country: 'Madagascar' },
  { iso: 'MW', code: '+265', country: 'Malawi' },
  { iso: 'MY', code: '+60',  country: 'Malaysia' },
  { iso: 'MV', code: '+960', country: 'Maldives' },
  { iso: 'ML', code: '+223', country: 'Mali' },
  { iso: 'MT', code: '+356', country: 'Malta' },
  { iso: 'MR', code: '+222', country: 'Mauritania' },
  { iso: 'MU', code: '+230', country: 'Mauritius' },
  { iso: 'MX', code: '+52',  country: 'Mexico' },
  { iso: 'MD', code: '+373', country: 'Moldova' },
  { iso: 'MC', code: '+377', country: 'Monaco' },
  { iso: 'MN', code: '+976', country: 'Mongolia' },
  { iso: 'ME', code: '+382', country: 'Montenegro' },
  { iso: 'MA', code: '+212', country: 'Morocco' },
  { iso: 'MZ', code: '+258', country: 'Mozambique' },
  { iso: 'MM', code: '+95',  country: 'Myanmar' },
  { iso: 'NA', code: '+264', country: 'Namibia' },
  { iso: 'NP', code: '+977', country: 'Nepal' },
  { iso: 'NL', code: '+31',  country: 'Netherlands' },
  { iso: 'NZ', code: '+64',  country: 'New Zealand' },
  { iso: 'NI', code: '+505', country: 'Nicaragua' },
  { iso: 'NE', code: '+227', country: 'Niger' },
  { iso: 'NG', code: '+234', country: 'Nigeria' },
  { iso: 'MK', code: '+389', country: 'North Macedonia' },
  { iso: 'NO', code: '+47',  country: 'Norway' },
  { iso: 'PK', code: '+92',  country: 'Pakistan' },
  { iso: 'PS', code: '+970', country: 'Palestine' },
  { iso: 'PA', code: '+507', country: 'Panama' },
  { iso: 'PG', code: '+675', country: 'Papua New Guinea' },
  { iso: 'PY', code: '+595', country: 'Paraguay' },
  { iso: 'PE', code: '+51',  country: 'Peru' },
  { iso: 'PH', code: '+63',  country: 'Philippines' },
  { iso: 'PL', code: '+48',  country: 'Poland' },
  { iso: 'PT', code: '+351', country: 'Portugal' },
  { iso: 'PR', code: '+1',   country: 'Puerto Rico' },
  { iso: 'RO', code: '+40',  country: 'Romania' },
  { iso: 'RU', code: '+7',   country: 'Russia' },
  { iso: 'RW', code: '+250', country: 'Rwanda' },
  { iso: 'SN', code: '+221', country: 'Senegal' },
  { iso: 'RS', code: '+381', country: 'Serbia' },
  { iso: 'SL', code: '+232', country: 'Sierra Leone' },
  { iso: 'SG', code: '+65',  country: 'Singapore' },
  { iso: 'SK', code: '+421', country: 'Slovakia' },
  { iso: 'SI', code: '+386', country: 'Slovenia' },
  { iso: 'SO', code: '+252', country: 'Somalia' },
  { iso: 'ZA', code: '+27',  country: 'South Africa' },
  { iso: 'KR', code: '+82',  country: 'South Korea' },
  { iso: 'SS', code: '+211', country: 'South Sudan' },
  { iso: 'ES', code: '+34',  country: 'Spain' },
  { iso: 'LK', code: '+94',  country: 'Sri Lanka' },
  { iso: 'SD', code: '+249', country: 'Sudan' },
  { iso: 'SR', code: '+597', country: 'Suriname' },
  { iso: 'SE', code: '+46',  country: 'Sweden' },
  { iso: 'CH', code: '+41',  country: 'Switzerland' },
  { iso: 'SY', code: '+963', country: 'Syria' },
  { iso: 'TW', code: '+886', country: 'Taiwan' },
  { iso: 'TJ', code: '+992', country: 'Tajikistan' },
  { iso: 'TZ', code: '+255', country: 'Tanzania' },
  { iso: 'TH', code: '+66',  country: 'Thailand' },
  { iso: 'TG', code: '+228', country: 'Togo' },
  { iso: 'TT', code: '+1',   country: 'Trinidad and Tobago' },
  { iso: 'TN', code: '+216', country: 'Tunisia' },
  { iso: 'TR', code: '+90',  country: 'Turkey' },
  { iso: 'TM', code: '+993', country: 'Turkmenistan' },
  { iso: 'UG', code: '+256', country: 'Uganda' },
  { iso: 'UA', code: '+380', country: 'Ukraine' },
  { iso: 'GB', code: '+44',  country: 'United Kingdom' },
  { iso: 'US', code: '+1',   country: 'United States' },
  { iso: 'UY', code: '+598', country: 'Uruguay' },
  { iso: 'UZ', code: '+998', country: 'Uzbekistan' },
  { iso: 'VE', code: '+58',  country: 'Venezuela' },
  { iso: 'VN', code: '+84',  country: 'Vietnam' },
  { iso: 'YE', code: '+967', country: 'Yemen' },
  { iso: 'ZM', code: '+260', country: 'Zambia' },
  { iso: 'ZW', code: '+263', country: 'Zimbabwe' },
];

// Normalise typed digits into a local mobile number.
// Strips: non-digits, leading zeros, accidentally re-typed country code.
function cleanLocalNumber(raw, dialCode) {
  let digits = (raw || '').replace(/\D/g, '');
  const codeDigits = dialCode.replace('+', '');
  if (digits.startsWith(codeDigits)) digits = digits.slice(codeDigits.length);
  return digits.replace(/^0+/, '');
}

// Full list: Gulf pinned first, then the rest alphabetically.
const ALL_DIAL_CODES = [...GCC_DIAL_CODES, ...WORLD_DIAL_CODES];

// Crisp flag SVG (renders on every OS incl. Windows, unlike emoji flags).
function flagUrl(iso) { return 'https://flagcdn.com/' + (iso || '').toLowerCase() + '.svg'; }

// Searchable country-code picker — type a country name or dial code to filter.
function CountryCombobox({ value, onChange }) {
  const [open, setOpen] = useStateR(false);
  const [query, setQuery] = useStateR('');
  const rootRef = useRefR(null);
  const inputRef = useRefR(null);

  useEffectR(() => {
    if (!open) return;
    function onDoc(e) { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 0);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [open]);

  const q = query.trim().toLowerCase();
  const nq = q.replace('+', '');
  const filtered = q
    ? ALL_DIAL_CODES.filter(c =>
        c.country.toLowerCase().includes(q) ||
        (nq && c.code.replace('+', '').startsWith(nq)) ||
        c.iso.toLowerCase() === q)
    : ALL_DIAL_CODES;

  function pick(c) { onChange(c); setOpen(false); setQuery(''); }

  const flagImg = (iso, w) => (
    <img src={flagUrl(iso)} alt="" width={w} height={Math.round(w * 0.72)}
      loading="lazy" style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0, boxShadow: '0 0 0 1px rgba(15,30,22,0.08)' }} />
  );

  return (
    <div ref={rootRef} style={{ position: 'relative', width: 132 }}>
      <button
        type="button" onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox" aria-expanded={open} aria-label="Country code"
        style={{
          width: '100%', height: 48, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--paper)',
          fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, color: 'var(--fg)', cursor: 'pointer',
        }}
      >
        {flagImg(value.iso, 22)}
        <span>{value.code}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--fg-4)', fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', zIndex: 30, top: 52, left: 0, width: 280, maxWidth: '78vw',
            background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
            boxShadow: '0 12px 32px rgba(15,30,22,0.18)', overflow: 'hidden',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid var(--hairline)' }}>
            <input
              ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search country or code"
              style={{
                width: '100%', height: 38, padding: '0 10px', boxSizing: 'border-box',
                border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)',
                fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--fg)',
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '14px 12px', fontSize: 12, color: 'var(--fg-4)' }}>No match</div>
            )}
            {filtered.map(c => (
              <button
                key={c.iso} type="button" role="option" aria-selected={c.iso === value.iso}
                onClick={() => pick(c)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  background: c.iso === value.iso ? 'var(--bg)' : 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--fg)',
                }}
              >
                {flagImg(c.iso, 22)}
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.country}</span>
                <span style={{ color: 'var(--fg-3)' }}>{c.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Email / WhatsApp gate modal (re-injected — the live one, with the
// searchable country picker and WhatsApp-delivery framing)
// ─────────────────────────────────────────────────────────────
function EmailGate({ open, onClose, onSubmit }) {
  const [name, setName] = useStateR('');
  const [country, setCountry] = useStateR(GCC_DIAL_CODES[0]); // default UAE
  const [phone, setPhone] = useStateR('');
  const [submitting, setSubmitting] = useStateR(false);
  const dialCode = country.code;

  if (!open) return null;
  const localDigits = cleanLocalNumber(phone, dialCode);
  // Phone is the only required field — name is optional. Every extra required field
  // cuts completion, and this gate sits at the highest-intent moment. We capture the
  // name inside the WhatsApp conversation afterward if it's left blank.
  const valid = localDigits.length >= 7;

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

            <label className="form-label">YOUR NAME (OPTIONAL)</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="First name"
              className="form-input" style={{ marginBottom: 14 }}
            />

            <label className="form-label">YOUR WHATSAPP NUMBER</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <CountryCombobox value={country} onChange={setCountry} />
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
// Result screen — animated 12-month projection variant (step 7)
// ─────────────────────────────────────────────────────────────
function ResultScreenAnnual({ inputs, calc, industryObj, onUnlock, onBack }) {
  const annual = useCountUp(calc.monthlyLoss * 12, 2600);
  // Rows derive from the same animated value → live-counting flicker
  const monthlyAnim = Math.round(annual / 12 / 100) * 100;
  const weeklyAnim  = Math.round(annual / 12 / 4.3 / 100) * 100;
  const dailyAnim   = Math.round(annual / 365 / 50) * 50;
  return (
    <div style={{ background: 'var(--bg-inverse)', color: 'var(--paper)', minHeight: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div className="ambient"></div>
      <LeakField mode="fall" dark lossRate={0.45} />
      <div className="rv" style={{ padding: '14px 22px 0', display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
        <Wordmark size={13} color="var(--paper)" />
        <span className="eyebrow" style={{ fontSize: 9, color: 'var(--paper-3)' }}>YOUR RESULT · 12 MONTH</span>
      </div>
      <div style={{ padding: '32px 22px calc(22px + env(safe-area-inset-bottom, 0px))', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <p className="rv" style={{ '--d': '90ms', fontFamily: 'var(--font-display)', fontSize: 16, lineHeight: 1.35, color: 'var(--paper-2)', marginBottom: 26, textWrap: 'pretty' }}>
          {calc.diagnostic}
        </p>

        {/* Annual stat — primary, counts up */}
        <div className="rv" style={{ '--d': '200ms' }}>
          <div className="eyebrow" style={{ fontSize: 9, color: 'var(--paper-3)', marginBottom: 8 }}>UNCHECKED, OVER 12 MONTHS</div>
        </div>
        <div className="num-settle" style={{ '--d': '260ms', position: 'relative', marginBottom: 22 }}>
          <span className="num-glow" aria-hidden="true"></span>
          <div style={{ position: 'relative', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 54, lineHeight: 1, letterSpacing: '-0.045em', color: 'var(--accent)', display: 'flex', alignItems: 'baseline', gap: 10, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, letterSpacing: '0.08em' }}>AED</span>
            <RollingNumber value={annual} />
          </div>
        </div>

        {/* Time breakdown stack — staggers in after the count-up starts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid rgba(247,243,237,0.22)' }}>
          <div className="rv" style={{ '--d': '700ms' }}><TimeRow label="PER MONTH" value={monthlyAnim} /></div>
          <div className="rv" style={{ '--d': '850ms' }}><TimeRow label="PER WEEK" value={weeklyAnim} /></div>
          <div className="rv" style={{ '--d': '1000ms' }}><TimeRow label="PER DAY" value={dailyAnim} last /></div>
        </div>

        <div className="rv" style={{ '--d': '1250ms', marginTop: 'auto', paddingTop: 22 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, lineHeight: 1.4, color: 'var(--paper)', textWrap: 'pretty' }}>
            You're losing {window.IDS_fmtAED(calc.monthlyLoss * 12)} a year. The fix costs a fraction of that.
          </p>
          <button type="button" onClick={onUnlock} className="btn btn-paper" style={{ marginTop: 18 }}>
            Get my free report <span className="btn-arrow" style={{ marginLeft: 4 }}>→</span>
          </button>
          <p style={{ marginTop: 12, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(247,243,237,0.45)' }}>
            Personalised to your business · Free · AED 0
          </p>
          {onBack && (
            <button type="button" onClick={onBack} style={{ margin: '10px auto 0', display: 'block', color: 'rgba(247,243,237,0.45)', fontSize: 11, fontFamily: 'var(--font-display)' }}>← Edit my answers</button>
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
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 17, color: 'var(--paper)', display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--paper-3)' }}>AED</span>
        <RollingNumber value={value} />
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Success screen — shown after the gate is submitted.
// The report itself is sent via WhatsApp (delivered out-of-band,
// not rendered in the app — the number is the lead-capture leverage).
// ─────────────────────────────────────────────────────────────
function ReportSentScreen({ calc, lead, onRestart }) {
  const phone = lead?.whatsapp || 'your WhatsApp';
  const lossLabel = window.IDS_fmtAED(calc.monthlyLoss);
  const waText = encodeURIComponent(`Hi, I just did the WhatsApp revenue audit — looks like I'm losing ${lossLabel} a month. Can you tell me more about the custom-built WhatsApp system?`);
  const waLink = `https://wa.me/447353750250?text=${waText}`;
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
          Want to get started today? Message us — we'll have you live in 24 hours.
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

Object.assign(window, {
  ResultScreen, ResultScreenAnnual, ReportSentScreen, EmailGate, CountryCombobox,
  useCountUp, LossBar, generateReportMD,
});
