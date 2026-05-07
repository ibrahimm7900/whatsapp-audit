// Kapso Function: report-delivery
// Single-file plain JS Cloudflare Worker
// Receives workflow vars -> scores workflows -> builds HTML -> PDFShift -> WhatsApp

const PHONE_NUMBER_ID  = '1162751303579401';
const KAPSO_BASE       = 'https://api.kapso.ai';
const PDFSHIFT_API_KEY = 'sk_f2ea0f67c1c812135ef5ed3320395f05760774c4';

// ── Data ──────────────────────────────────────────────────────────────────────

const RESPONSE = [
  { id: 'under_1hr', label: 'Under 1 hour',     lossRate: 0.15, readable: 'under-1-hour response times' },
  { id: '1_4hrs',    label: '1-4 hours',         lossRate: 0.35, readable: '1-4 hour response times' },
  { id: '4_24hrs',   label: '4-24 hours',        lossRate: 0.60, readable: '4-24 hour response times' },
  { id: 'next_day',  label: 'Next day or later', lossRate: 0.80, readable: 'next-day response times' },
];

const COVERAGE = [
  { id: 'weekdays_only',     label: 'Weekdays only',         multiplier: 1.35, readable: 'weekday-only availability' },
  { id: 'weekdays_weekends', label: 'Weekdays and weekends', multiplier: 1.15, readable: 'weekday and weekend availability' },
  { id: 'always',            label: 'Always available',      multiplier: 1.00, readable: '24/7 availability' },
];

const INDUSTRIES = [
  { id: 'real_estate', name: 'Real estate', dealLabel: 'commission' },
  { id: 'hvac',        name: 'HVAC',        dealLabel: 'callout' },
  { id: 'automotive',  name: 'Automotive',  dealLabel: 'margin' },
  { id: 'wellness',    name: 'Wellness',    dealLabel: 'appointment' },
  { id: 'logistics',   name: 'Logistics',   dealLabel: 'contract' },
  { id: 'education',   name: 'Education',   dealLabel: 'enrolment' },
];

const WORKFLOWS = [
  // REAL ESTATE
  { id:'RE-1', industry:'real_estate', name:'After-hours responder', does:"Replies to every enquiry that comes in outside your working hours instantly, in the buyer's language.", recovers:'Captures the 35-45% of inbound leads currently lost to after-hours silence.', complexity:'Low', boost_after_hours:1, boost_coverage_gap:1, startHere:(i)=>(i.responseTime==='4_24hrs'||i.responseTime==='next_day')&&i.coverage==='weekdays_only' },
  { id:'RE-2', industry:'real_estate', name:'Viewing scheduler', does:'Takes an enquiry from first message to a booked property viewing with no agent involvement.', recovers:'Recovers 2 viewings per month that convert.', complexity:'Low', boost_speed:1, boost_medium_volume:1, startHere:(i)=>i.weeklyEnquiries>30&&i.dealValue>50000 },
  { id:'RE-3', industry:'real_estate', name:'Multilingual qualifier', does:"Detects the buyer's language and replies fluently from the first message.", recovers:'A single recovered Russian or Chinese buyer = AED 60-120k commission.', complexity:'Low', boost_high_value:1, startHere:(i)=>i.dealValue>150000&&i.responseTime!=='under_1hr' },
  { id:'RE-4', industry:'real_estate', name:'Portal lead follow-up', does:'When a lead comes in from Property Finder or Bayut, an instant WhatsApp message goes to the lead within 90 seconds.', recovers:'Doubles portal-lead conversion at the same ad spend.', complexity:'Medium', boost_high_value:1, boost_speed:1 },
  { id:'RE-5', industry:'real_estate', name:'Lead qualifier', does:'Asks the three questions that separate serious buyers from tyre-kickers before you spend a minute.', recovers:'Cuts wasted WhatsApp time on non-buyers from 60% to under 20%.', complexity:'Low', boost_high_volume:1 },
  { id:'RE-6', industry:'real_estate', name:'CRM sync', does:'Every WhatsApp lead pushed straight into your CRM with no manual data entry.', recovers:'Stops leads getting lost in chat and never followed up.', complexity:'Medium', boost_fast_responder:1, boost_medium_volume:1 },
  // HVAC
  { id:'HV-1', industry:'hvac', name:'Emergency triage', does:'AC emergency messages get an instant acknowledgment, booking slot, and technician ETA in under 60 seconds, at any hour.', recovers:'In summer, missing 10 emergency callouts/week = AED 4-15k in a single week.', complexity:'Low', boost_after_hours:1, boost_triage:1, startHere:(i)=>i.responseTime!=='under_1hr'&&i.coverage==='weekdays_only' },
  { id:'HV-2', industry:'hvac', name:'AMC renewal reminder', does:'Sends a 60/30/7-day renewal sequence to every client whose AMC is expiring, with a one-tap renew link.', recovers:'AED 75-125k/year in AMC revenue currently evaporating.', complexity:'Medium', boost_fast_responder:1, boost_medium_value:1 },
  { id:'HV-3', industry:'hvac', name:'Booking confirmation', does:'Confirmation the moment a job is scheduled - technician name, arrival window, 2-hour reminder.', recovers:'Cuts 20-30% no-show rate on technician visits.', complexity:'Low', boost_speed:1 },
  { id:'HV-4', industry:'hvac', name:'Quote sender', does:'Responds to standard price enquiries with an instant formatted quote and booking link.', recovers:'Frees 2-3 hours/day of owner time.', complexity:'Low', boost_high_volume:1, boost_speed:1 },
  { id:'HV-5', industry:'hvac', name:'Off-hours coverage', does:'Handles every enquiry that comes in outside business hours with instant replies, triage, and booking.', recovers:'AED 10-40k/month in additional callouts during summer.', complexity:'Low', boost_after_hours:1, boost_coverage_gap:1 },
  { id:'HV-6', industry:'hvac', name:'Technician dispatch notification', does:'When a job is booked, technician gets job details and customer is notified simultaneously.', recovers:'Each prevented miscommunication saves AED 200-400 + protects an AMC relationship.', complexity:'Medium', boost_high_volume:1 },
  // AUTOMOTIVE
  { id:'AU-1', industry:'automotive', name:'Availability checker', does:"When a buyer asks if a car is available, they get an instant answer, current price, and a test-drive link.", recovers:'AED 37,500/week of margin currently lost to slow replies.', complexity:'Low', boost_speed:1, boost_triage:1, startHere:(i)=>(i.responseTime==='4_24hrs'||i.responseTime==='next_day')&&i.weeklyEnquiries>20 },
  { id:'AU-2', industry:'automotive', name:'Test drive booker', does:'From first message to a confirmed test drive with no sales staff involvement.', recovers:'Recovers 10 additional showroom visits/month.', complexity:'Low', boost_speed:1, boost_high_value:1 },
  { id:'AU-3', industry:'automotive', name:'Lead qualifier', does:'Asks the four questions every sales team needs before engaging.', recovers:'Filters 50-60% of non-buyers before any human time is spent.', complexity:'Low', boost_high_volume:1 },
  { id:'AU-4', industry:'automotive', name:'Showroom appointment reminder', does:'Confirmation, 24-hour reminder, 2-hour reminder before the test drive.', recovers:'Recovers 5-7 additional show-ups/week = AED 37-52k in margin opportunity.', complexity:'Low', boost_fast_responder:1, boost_medium_volume:1 },
  { id:'AU-5', industry:'automotive', name:'Quote sender', does:'Sends a full vehicle quote within 60 seconds of enquiry.', recovers:'AED 27k additional margin/week from improved enquiry-to-test-drive conversion.', complexity:'Low', boost_speed:1, boost_high_value:1 },
  { id:'AU-6', industry:'automotive', name:'Cold lead follow-up', does:'Re-engages buyers who went silent with a sequence of 3 messages over 7 days.', recovers:'Recovers 10 cold leads/month at AED 7,500 margin = AED 75k.', complexity:'Medium', boost_fast_responder:1 },
  // WELLNESS
  { id:'WL-1', industry:'wellness', name:'No-show reminder sequence', does:'Confirmation, 24-hour reminder, 2-hour reminder for every booked client, with a one-tap reschedule.', recovers:'Cuts no-shows by 60-80% - recovering AED 45-60k/month.', complexity:'Low', boost_fast_responder:1, boost_speed:1, boost_triage:1, startHere:()=>true },
  { id:'WL-2', industry:'wellness', name:'Appointment booker', does:'From first message to a confirmed appointment with no receptionist involvement.', recovers:'Frees 4-6 hours/day of receptionist time.', complexity:'Low', boost_speed:1, boost_medium_volume:1 },
  { id:'WL-3', industry:'wellness', name:'Price qualifier', does:'Establishes intent and filters out price shoppers who will not book.', recovers:'Reclaims 2+ hours/week of staff time on non-converting conversations.', complexity:'Low', boost_high_volume:1 },
  { id:'WL-4', industry:'wellness', name:'Rebooking loop', does:"Automatically contacts clients who haven't returned in 30 days with a personalised message and one-tap rebook link.", recovers:'AED 20k/month in recovered recurring revenue.', complexity:'Medium', boost_fast_responder:1 },
  { id:'WL-5', industry:'wellness', name:'New client onboarding', does:'New clients receive confirmation, address, parking, what to bring, and intake forms automatically.', recovers:'Drops first-visit no-show rates by 40%.', complexity:'Low', boost_medium_volume:1 },
  { id:'WL-6', industry:'wellness', name:'Package upsell', does:"After a client's third visit, an automatic message offers a 10-session package.", recovers:'AED 30k/month locked in as upfront recurring revenue.', complexity:'Medium', boost_fast_responder:1 },
  // LOGISTICS
  { id:'LG-1', industry:'logistics', name:'Status update responder', does:'When a client asks where their shipment is, the system replies with a full status update in under 30 seconds.', recovers:'Eliminates 1-2 dedicated staff = AED 96-288k/year.', complexity:'Medium', boost_high_volume:1, boost_triage:1, startHere:(i)=>i.weeklyEnquiries>40&&i.responseTime!=='under_1hr' },
  { id:'LG-2', industry:'logistics', name:'Escalation router', does:'Distinguishes routine enquiries from real problems and handles routine automatically, escalates the rest immediately.', recovers:'Returns 80% of operations-manager time to actual problem-solving.', complexity:'Medium', boost_high_volume:1 },
  { id:'LG-3', industry:'logistics', name:'Booking confirmation', does:"Confirms every pickup and delivery the moment it's logged.", recovers:'Each prevented missed pickup saves AED 200-500 + protects the contract.', complexity:'Low', boost_fast_responder:1, boost_medium_volume:1 },
  { id:'LG-4', industry:'logistics', name:'Customs update handler', does:'Proactively sends customs clearance updates at each stage without waiting for the client to ask.', recovers:'Eliminates 70% of inbound customs-related messages.', complexity:'Medium', boost_high_volume:1 },
  { id:'LG-5', industry:'logistics', name:'Voice note handler', does:'Transcribes Arabic voice notes, identifies the request, replies in Arabic text automatically.', recovers:'Removes a friction point causing 15-20% of GCC client complaints.', complexity:'Medium' },
  { id:'LG-6', industry:'logistics', name:'Internal team separator', does:'Routes client messages to a dedicated client-facing channel, separate from internal team coordination.', recovers:'Reduces response errors by 80%.', complexity:'Low', boost_high_volume:1 },
  // EDUCATION
  { id:'ED-1', industry:'education', name:'Trial class booker', does:"From a parent's first enquiry to a confirmed trial class.", recovers:'AED 30k/month from recovered trial-class bookings.', complexity:'Low', boost_speed:1, boost_triage:1, startHere:(i)=>(i.responseTime==='4_24hrs'||i.responseTime==='next_day')&&i.dealValue>5000 },
  { id:'ED-2', industry:'education', name:'Enrolment nurture sequence', does:'5-message sequence over 10 days with no admissions involvement.', recovers:'AED 60k/month in additional revenue from improved close rate.', complexity:'Medium', boost_fast_responder:1, boost_medium_value:1 },
  { id:'ED-3', industry:'education', name:'Fee enquiry handler', does:'Replies to fee enquiries with a full breakdown, schedule, payment options, and a trial-class link, instantly.', recovers:'3x conversion vs replying hours later.', complexity:'Low', boost_high_volume:1 },
  { id:'ED-4', industry:'education', name:'Multilingual parent handler', does:"Detects parent's language and replies fluently from the first message.", recovers:'AED 20-60k/month from doubled multilingual conversion.', complexity:'Low', boost_medium_value:1 },
  { id:'ED-5', industry:'education', name:'Admissions follow-up', does:'3-message sequence over 14 days re-engaging parents who went quiet.', recovers:'AED 100k from 10 recovered cold leads.', complexity:'Medium', boost_fast_responder:1 },
  { id:'ED-6', industry:'education', name:'New student onboarding', does:'On enrolment, automatic schedule, login, materials list, and welcome message from the instructor.', recovers:'Drops first-month dropout from 15% to 5%.', complexity:'Low', boost_fast_responder:1 },
];

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreWorkflows(inputs) {
  var candidates = WORKFLOWS.filter(function(w) { return w.industry === inputs.industry; });
  candidates = candidates.map(function(w) {
    var score = 0;
    if (inputs.responseTime === 'under_1hr' && w.boost_fast_responder) score += 2;
    if (inputs.responseTime === '1_4hrs'    && w.boost_speed)          score += 2;
    if ((inputs.responseTime === '4_24hrs' || inputs.responseTime === 'next_day') && w.boost_triage) score += 3;
    if (inputs.coverage === 'weekdays_only' && w.boost_after_hours)    score += 2;
    if (inputs.coverage !== 'always'        && w.boost_coverage_gap)   score += 1;
    if (inputs.weeklyEnquiries > 50  && w.boost_high_volume)           score += 2;
    if (inputs.weeklyEnquiries > 20  && w.boost_medium_volume)         score += 1;
    if (inputs.dealValue > 100000    && w.boost_high_value)            score += 3;
    if (inputs.dealValue > 10000     && w.boost_medium_value)          score += 1;
    if (inputs.weeklyEnquiries < 20  && w.complexity === 'Low')        score += 1;
    if (typeof w.startHere === 'function' && w.startHere(inputs))      score += 5;
    return Object.assign({}, w, { score: score });
  });
  candidates.sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
  if (candidates[0]) candidates[0].isStartHere = true;
  return candidates.slice(0, 3);
}

function fmtAED(n) {
  return 'AED ' + Math.round(n).toLocaleString('en-US');
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

function getDiagnosisParagraph(inputs, calc) {
  var fast = inputs.responseTime === 'under_1hr' || inputs.responseTime === '1_4hrs';
  var cov  = inputs.coverage;
  if (cov === 'weekdays_only' && !fast)
    return "You're available roughly 45 hours per week. Your leads come in 168 hours per week. The gap - evenings, Fridays, weekends - is where your revenue is going. Every hour offline is an hour a competitor can reply first.";
  if (cov === 'weekdays_only' && fast)
    return "You reply quickly when you're there. The problem is the hours you're not. Evenings, Fridays, and weekends account for 35-45% of all WhatsApp enquiries in the UAE. Those hours are currently unattended.";
  if (cov === 'weekdays_weekends' && !fast)
    return "You're available most days, but your response time is giving leads enough time to contact a competitor and hear back first. In the UAE, 78% of customers commit to whoever responds first.";
  if (cov === 'weekdays_weekends' && fast)
    return "You're fast and available most of the time. The gap is after-hours - evenings and nights when enquiries come in but nothing goes out. That window is costing you " + fmtAED(calc.monthlyLoss) + " per month.";
  if (cov === 'always' && !fast)
    return "You're always reachable, but the speed of your replies is the leak. UAE buyers contact multiple businesses simultaneously. The first reply wins - at your current response time, you're rarely first.";
  return "You reply quickly and you're always available. Your loss is lower than most - but at " + calc.lossRatePercent + "% of enquiries still not converting, there is " + fmtAED(calc.monthlyLoss) + " per month in leads that are not being captured, qualified, or followed up.";
}

function getWhyThreeParagraph(inputs, calc, industryName) {
  var enq = inputs.weeklyEnquiries >= 200 ? '200+' : String(inputs.weeklyEnquiries);
  var gap = calc.coverageMultiplierPercent > 0
    ? "coverage - leads going cold while you're offline"
    : 'speed - competitors replying first';
  return 'You handle ' + (inputs.dealValue >= 50000 ? 'high-value' : 'time-sensitive') + ' ' + industryName.toLowerCase() + ' leads in a market where the first reply wins. With ' + enq + ' enquiries per week and ' + calc.responseTimeReadable + ', your biggest gap is ' + gap + '. These three workflows address that gap in order of ROI.';
}

// ── HTML template ─────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReportHTML(p) {
  var name = p.name, industryName = p.industryName, dealLabel = p.dealLabel;
  var dealValue = p.dealValue, weeklyEnquiries = p.weeklyEnquiries;
  var respObj = p.respObj, covObj = p.covObj, calc = p.calc, workflows = p.workflows;

  var date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  var lossWithPilot = Math.round((calc.monthlyLoss * 0.25) / 100) * 100;
  var netWithPilot  = calc.monthlyLoss - lossWithPilot - 5000;
  var inputs = { responseTime: respObj.id, coverage: covObj.id, weeklyEnquiries: weeklyEnquiries, dealValue: dealValue };
  var diagnosis = getDiagnosisParagraph(inputs, calc);
  var whyThree  = getWhyThreeParagraph(inputs, calc, industryName);

  function hdr(n) {
    return '<div style="background:#1F4A37;color:#FAFAF7;padding:13pt 44pt;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
      '<span style="font-size:7.5pt;letter-spacing:0.12em;font-weight:bold;">WHATSAPP REVENUE REPORT &middot; 0' + n + ' / 03</span>' +
      '<span style="font-size:7.5pt;opacity:0.75;">Ibrahim Digital Solutions</span>' +
    '</div>';
  }

  function ftr(n) {
    return '<div style="border-top:0.5pt solid #D8D5CE;padding:9pt 44pt;display:flex;justify-content:space-between;font-size:7pt;color:#616657;flex-shrink:0;">' +
      '<span>Ibrahim Digital &middot; Dubai &middot; ibrahimdigital.com</span>' +
      '<span>Page ' + n + ' of 3</span>' +
    '</div>';
  }

  var tRows = [
    ['Industry', esc(industryName)],
    ['Average ' + esc(dealLabel) + ' value', 'AED ' + Number(dealValue).toLocaleString('en-US')],
    ['Weekly enquiries', weeklyEnquiries + ' messages'],
    ['Response time', esc(respObj.label)],
    ['Coverage', esc(covObj.label)],
  ];
  var sitTable = tRows.map(function(r, i) {
    return '<tr style="background:' + (i%2===0?'#F0EEE8':'#FAFAF7') + ';">' +
      '<td style="padding:8pt 12pt;color:#616657;font-size:8.5pt;font-weight:bold;width:42%;">' + r[0] + '</td>' +
      '<td style="padding:8pt 12pt;font-size:9pt;">' + r[1] + '</td>' +
    '</tr>';
  }).join('');

  var ords = ['01','02','03'];
  var wCards = workflows.map(function(w, i) {
    var bd = w.isStartHere ? '#D4956B' : '#D8D5CE';
    var bg = w.isStartHere ? '#FFF8F3' : '#FFFFFF';
    var badge = w.isStartHere ? '<div style="font-size:7pt;letter-spacing:0.1em;color:#D4956B;font-weight:bold;margin-bottom:5pt;">&#9733; START HERE</div>' : '';
    return '<div style="border-left:3pt solid ' + bd + ';padding:13pt 16pt;margin-bottom:10pt;background:' + bg + ';border-radius:0 3pt 3pt 0;">' +
      badge +
      '<div style="font-size:10.5pt;font-weight:bold;color:#1A1D18;margin-bottom:6pt;">' + ords[i] + '&nbsp;&nbsp;' + esc(w.name) + '</div>' +
      '<p style="font-size:8.5pt;color:#616657;margin-bottom:8pt;line-height:1.45;">' + esc(w.does) + '</p>' +
      '<div style="font-size:7pt;letter-spacing:0.1em;color:#616657;font-weight:bold;margin-bottom:2pt;">RECOVERS</div>' +
      '<p style="font-size:8.5pt;margin-bottom:8pt;line-height:1.4;">' + esc(w.recovers) + '</p>' +
      '<div style="font-size:7pt;letter-spacing:0.08em;color:#9A9A8A;">' + w.complexity.toUpperCase() + ' COMPLEXITY &middot; LIVE IN 48 HOURS</div>' +
    '</div>';
  }).join('');

  var cRows = [
    ['Setup cost',   'AED 0',                   'AED 0'],
    ['Monthly cost', 'AED 0',                   'AED 5,000'],
    ['Monthly loss', fmtAED(calc.monthlyLoss),  fmtAED(lossWithPilot)],
    ['Net position', '&minus;' + fmtAED(calc.monthlyLoss), '+' + fmtAED(Math.max(netWithPilot, 0))],
  ];
  var cTable = cRows.map(function(r, i) {
    var last = i === cRows.length - 1;
    return '<tr style="background:' + (i%2===0?'#F0EEE8':'#FAFAF7') + ';">' +
      '<td style="padding:9pt 12pt;font-size:8.5pt;color:#616657;">' + r[0] + '</td>' +
      '<td style="padding:9pt 12pt;font-size:8.5pt;text-align:right;' + (last?'color:#CC4444;font-weight:bold;':'') + '">' + r[1] + '</td>' +
      '<td style="padding:9pt 12pt;font-size:8.5pt;text-align:right;' + (last?'color:#2A7A4A;font-weight:bold;':'') + '">' + r[2] + '</td>' +
    '</tr>';
  }).join('');

  var css = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    '@page{size:A4 portrait;margin:0;}' +
    '*{box-sizing:border-box;margin:0;padding:0;}' +
    'body{font-family:Helvetica,Arial,sans-serif;background:#FAFAF7;color:#1A1D18;font-size:10pt;line-height:1.5;}' +
    '.page{width:595pt;height:842pt;page-break-after:always;overflow:hidden;display:flex;flex-direction:column;background:#FAFAF7;}' +
    '.page:last-child{page-break-after:auto;}' +
    '.body{padding:28pt 44pt 20pt;flex:1;display:flex;flex-direction:column;overflow:hidden;}' +
    '</style></head><body>';

  var p1 = '<div class="page">' + hdr(1) +
    '<div class="body">' +
    '<div style="font-size:8pt;color:#616657;letter-spacing:0.04em;margin-bottom:14pt;">Prepared for <strong>' + esc(name) + '</strong> &middot; ' + date + '</div>' +
    '<h1 style="font-size:17pt;font-weight:bold;color:#1F4A37;line-height:1.25;margin-bottom:12pt;">Your WhatsApp is losing you<br><span style="color:#D4956B;">' + esc(fmtAED(calc.monthlyLoss)) + '</span> every month.</h1>' +
    '<p style="font-size:9pt;color:#616657;line-height:1.55;margin-bottom:18pt;max-width:440pt;">' + esc(diagnosis) + '</p>' +
    '<div style="font-size:7.5pt;letter-spacing:0.1em;color:#1F4A37;font-weight:bold;margin-bottom:8pt;">YOUR SITUATION</div>' +
    '<table style="width:100%;border-collapse:collapse;">' + sitTable + '</table>' +
    '<div style="background:#1F4A37;color:#FAFAF7;padding:20pt 28pt;display:flex;justify-content:space-between;align-items:center;border-radius:4pt;margin-top:auto;">' +
      '<div><div style="font-size:7pt;letter-spacing:0.1em;opacity:0.65;margin-bottom:4pt;">MONTHLY REVENUE LEAK</div><div style="font-size:24pt;font-weight:bold;color:#D4956B;line-height:1;">' + esc(fmtAED(calc.monthlyLoss)) + '</div></div>' +
      '<div style="text-align:right;"><div style="font-size:7pt;letter-spacing:0.1em;opacity:0.65;margin-bottom:4pt;">PER WEEK</div><div style="font-size:15pt;font-weight:bold;line-height:1;">' + esc(fmtAED(calc.weeklyLoss)) + '</div><div style="font-size:7pt;opacity:0.65;margin-top:3pt;">AED ' + (calc.monthlyLoss * 12).toLocaleString('en-US') + ' per year</div></div>' +
    '</div>' +
    '</div>' + ftr(1) + '</div>';

  var p2 = '<div class="page">' + hdr(2) +
    '<div class="body">' +
    '<div style="font-size:8pt;color:#D4956B;letter-spacing:0.08em;font-weight:bold;margin-bottom:5pt;">RECOMMENDED FOR ' + esc(name.toUpperCase()) + "'S BUSINESS</div>" +
    '<h2 style="font-size:13pt;font-weight:bold;color:#1F4A37;line-height:1.3;margin-bottom:5pt;">Three workflows that would fix your specific gap.</h2>' +
    '<p style="font-size:8.5pt;color:#616657;margin-bottom:14pt;line-height:1.45;">Based on your ' + esc(industryName) + ' business, ' + esc(respObj.readable) + ', and ' + esc(covObj.readable) + '.</p>' +
    wCards +
    '<div style="border-top:1pt solid #D8D5CE;padding-top:12pt;margin-top:auto;">' +
      '<div style="font-size:7.5pt;letter-spacing:0.1em;color:#1F4A37;font-weight:bold;margin-bottom:5pt;">WHY THESE THREE</div>' +
      '<p style="font-size:8.5pt;color:#616657;line-height:1.5;">' + esc(whyThree) + '</p>' +
    '</div>' +
    '</div>' + ftr(2) + '</div>';

  var p3 = '<div class="page">' + hdr(3) +
    '<div class="body">' +
    '<div style="font-size:8pt;color:#616657;letter-spacing:0.08em;font-weight:bold;margin-bottom:5pt;">THE COMPARISON</div>' +
    '<h2 style="font-size:13pt;font-weight:bold;color:#1F4A37;line-height:1.3;margin-bottom:16pt;">The numbers, side by side.</h2>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:18pt;">' +
      '<thead><tr style="background:#1F4A37;color:#FAFAF7;">' +
        '<th style="padding:9pt 12pt;text-align:left;font-size:8pt;width:34%;"></th>' +
        '<th style="padding:9pt 12pt;text-align:right;font-size:7.5pt;letter-spacing:0.06em;font-weight:bold;">DOING NOTHING</th>' +
        '<th style="padding:9pt 12pt;text-align:right;font-size:7.5pt;letter-spacing:0.06em;font-weight:bold;">STARTING THE PILOT</th>' +
      '</tr></thead><tbody>' + cTable + '</tbody></table>' +
    '<div style="background:#1F4A37;color:#FAFAF7;padding:18pt 26pt;border-radius:4pt;margin-bottom:16pt;line-height:1.65;">' +
      '<p style="font-size:8.5pt;margin-bottom:3pt;">Every month you wait costs you <strong style="color:#D4956B;">' + esc(fmtAED(calc.monthlyLoss)) + '</strong>.</p>' +
      '<p style="font-size:8.5pt;margin-bottom:3pt;">Every month with the pilot costs you <strong>AED 5,000</strong>.</p>' +
      '<p style="font-size:8.5pt;">The difference is <strong style="color:#D4956B;">' + esc(fmtAED(Math.max(netWithPilot, 0))) + '</strong>.</p>' +
    '</div>' +
    '<div style="display:flex;gap:20pt;margin-bottom:18pt;">' +
      '<div style="text-align:center;flex:1;border:1pt solid #D8D5CE;padding:12pt 8pt;border-radius:3pt;"><div style="font-size:15pt;font-weight:bold;color:#1F4A37;line-height:1;">AED 0</div><div style="font-size:7pt;color:#616657;letter-spacing:0.06em;margin-top:4pt;">TO START</div></div>' +
      '<div style="text-align:center;flex:1;border:1pt solid #D8D5CE;padding:12pt 8pt;border-radius:3pt;"><div style="font-size:15pt;font-weight:bold;color:#1F4A37;line-height:1;">48 HRS</div><div style="font-size:7pt;color:#616657;letter-spacing:0.06em;margin-top:4pt;">TO GO LIVE</div></div>' +
      '<div style="text-align:center;flex:1;border:1pt solid #D8D5CE;padding:12pt 8pt;border-radius:3pt;"><div style="font-size:15pt;font-weight:bold;color:#1F4A37;line-height:1;">0</div><div style="font-size:7pt;color:#616657;letter-spacing:0.06em;margin-top:4pt;">CONTRACTS</div></div>' +
    '</div>' +
    '<div style="border-top:1pt solid #D8D5CE;padding-top:12pt;margin-top:auto;">' +
      '<div style="font-size:7.5pt;letter-spacing:0.1em;color:#1F4A37;font-weight:bold;margin-bottom:8pt;">YOUR NEXT STEP</div>' +
      '<div style="display:flex;gap:28pt;margin-bottom:10pt;">' +
        '<div><div style="font-size:8pt;color:#616657;margin-bottom:2pt;">WhatsApp</div><div style="font-size:9pt;font-weight:bold;">+44 7842 552606</div></div>' +
        '<div><div style="font-size:8pt;color:#616657;margin-bottom:2pt;">Instagram</div><div style="font-size:9pt;font-weight:bold;">@ibrahim.prompted</div></div>' +
      '</div>' +
      '<div style="font-size:7.5pt;color:#9A9A8A;">Prepared for ' + esc(name) + ' &middot; ' + date + ' &middot; Ibrahim Digital Solutions &middot; Dubai</div>' +
    '</div>' +
    '</div>' + ftr(3) + '</div>';

  return css + p1 + p2 + p3 + '</body></html>';
}

// ── Main handler ──────────────────────────────────────────────────────────────

async function handler(request, env) {
  var body;
  try { body = await request.json(); } catch(e) {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  var vars = (body.execution_context && body.execution_context.vars)
    ? body.execution_context.vars : body;

  var lead_name        = vars.lead_name;
  var phone_number     = vars.phone_number;
  var industry         = vars.industry;
  var industry_name    = vars.industry_name;
  var deal_label       = vars.deal_label;
  var deal_value       = vars.deal_value;
  var weekly_enquiries = vars.weekly_enquiries;
  var response_time_id = vars.response_time_id;
  var coverage_id      = vars.coverage_id;

  if (!lead_name || !phone_number || !industry || !response_time_id || !coverage_id) {
    return Response.json({ error: 'missing required vars' }, { status: 400 });
  }

  var respObj = RESPONSE.find(function(r) { return r.id === response_time_id; });
  var covObj  = COVERAGE.find(function(c) { return c.id === coverage_id; });
  if (!respObj || !covObj) {
    return Response.json({ error: 'unknown response_time_id or coverage_id' }, { status: 400 });
  }

  var inputs = {
    industry:        industry,
    dealValue:       Number(deal_value) || 0,
    weeklyEnquiries: Number(weekly_enquiries) || 20,
    responseTime:    response_time_id,
    coverage:        coverage_id,
  };
  var workflows = scoreWorkflows(inputs);

  var rawMonthly  = inputs.weeklyEnquiries * inputs.dealValue * respObj.lossRate * covObj.multiplier * 4.3;
  var monthlyLoss = Math.round(rawMonthly / 100) * 100;
  var weeklyLoss  = Math.round(monthlyLoss / 4.3 / 100) * 100;
  var calc = {
    monthlyLoss:               monthlyLoss,
    weeklyLoss:                weeklyLoss,
    lossRatePercent:           Math.round(respObj.lossRate * 100),
    coverageMultiplierPercent: Math.round((covObj.multiplier - 1) * 100),
    responseTimeReadable:      respObj.readable,
    coverageReadable:          covObj.readable,
  };

  // 1. Build HTML -> PDF via PDFShift
  var htmlString = buildReportHTML({
    name:            lead_name,
    industryName:    industry_name || industry,
    dealLabel:       deal_label || 'deal',
    dealValue:       inputs.dealValue,
    weeklyEnquiries: inputs.weeklyEnquiries,
    respObj:         respObj,
    covObj:          covObj,
    calc:            calc,
    workflows:       workflows,
  });

  var pdfRes = await fetch('https://api.pdfshift.io/v3/convert/chromium', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Basic ' + btoa(PDFSHIFT_API_KEY + ':'),
    },
    body: JSON.stringify({ source: htmlString, format: 'A4', margin: { top:'0', right:'0', bottom:'0', left:'0' }, landscape: false }),
  });
  if (!pdfRes.ok) {
    var pdfErr = await pdfRes.text();
    console.error('[report-delivery] PDFShift error:', pdfErr);
    return Response.json({ error: 'pdf generation failed', detail: pdfErr }, { status: 502 });
  }
  var pdfBuffer = await pdfRes.arrayBuffer();

  // 2. Upload PDF to WhatsApp via Kapso
  var fileName = 'Revenue-Report-' + lead_name.replace(/\s+/g, '-') + '.pdf';
  var form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', 'document');
  form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), fileName);

  var uploadRes = await fetch(
    KAPSO_BASE + '/meta/whatsapp/v24.0/' + PHONE_NUMBER_ID + '/media',
    { method: 'POST', headers: { 'X-API-Key': env.KAPSO_API_KEY }, body: form }
  );
  if (!uploadRes.ok) {
    var upErr = await uploadRes.text();
    console.error('[report-delivery] media upload failed:', upErr);
    return Response.json({ error: 'media upload failed', detail: upErr }, { status: 502 });
  }
  var mediaId = (await uploadRes.json()).id;

  // 3. Send text message
  await fetch(KAPSO_BASE + '/meta/whatsapp/v24.0/' + PHONE_NUMBER_ID + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': env.KAPSO_API_KEY },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone_number, type: 'text',
      text: { body: 'Hi ' + lead_name + ' 👋\n\nHere\'s your WhatsApp Revenue Audit from Ibrahim Digital.\n\nBased on your inputs, your business is leaking *' + fmtAED(monthlyLoss) + '* every month from missed WhatsApp enquiries.\n\nI\'ve put together 3 workflows that would fix your specific gap - your personalised report is attached.\n\n_If you want to talk about getting these live in 48 hours, just reply to this message._' },
    }),
  });

  // 4. Send PDF document
  var docRes = await fetch(KAPSO_BASE + '/meta/whatsapp/v24.0/' + PHONE_NUMBER_ID + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': env.KAPSO_API_KEY },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone_number, type: 'document',
      document: { id: mediaId, filename: fileName, caption: 'Your WhatsApp Revenue Audit - Ibrahim Digital Solutions' },
    }),
  });
  if (!docRes.ok) {
    var docErr = await docRes.text();
    console.error('[report-delivery] document send failed:', docErr);
    return Response.json({ error: 'document send failed', detail: docErr }, { status: 502 });
  }

  return Response.json({ vars: { delivery_status: 'sent' } });
}
