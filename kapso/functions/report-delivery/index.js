// Kapso Function: report-delivery
// Single-file plain JS Cloudflare Worker
// Receives workflow vars -> scores workflows -> builds HTML -> PDFShift -> WhatsApp template

const PHONE_NUMBER_ID  = '1160443047149035';
const KAPSO_BASE       = 'https://api.kapso.ai';

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

  function masthead(n) {
    return '<div class="mh">' +
      '<div class="lk"><div class="dd"><s></s><s></s></div>' +
      '<div class="wm">ibrahim<b> /</b> digital</div></div>' +
      '<div class="mm">Whatsapp Revenue Audit &middot; 0' + n + ' / 03</div>' +
    '</div>';
  }

  function footer(n, lastText) {
    return '<div class="ft">' +
      '<span>Ibrahim Digital &middot; Dubai</span>' +
      '<span>0' + n + ' / 03</span>' +
      '<span>' + (lastText || 'Confidential') + '</span>' +
    '</div>';
  }

  var sitRows = [
    ['Industry', esc(industryName)],
    ['Average ' + esc(dealLabel) + ' value', 'AED ' + Number(dealValue).toLocaleString('en-US')],
    ['Weekly enquiries', weeklyEnquiries + ' messages'],
    ['Response time', esc(respObj.label)],
    ['Coverage', esc(covObj.label)]
  ];
  var sitTable = sitRows.map(function(r) {
    return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>';
  }).join('');

  var ords = ['01','02','03'];
  var wCards = workflows.map(function(w, i) {
    var sh = w.isStartHere ? ' sh' : '';
    var badge = w.isStartHere ? '<span class="sb">&#9733; Start here</span>' : '';
    return '<div class="wc' + sh + '">' + badge +
      '<div class="wn-num">' + ords[i] + '</div>' +
      '<div class="wn">' + esc(w.name) + '</div>' +
      '<p class="wd">' + esc(w.does) + '</p>' +
      '<span class="rl">Recovers</span>' +
      '<p class="wr">' + esc(w.recovers) + '</p>' +
      '<div class="wmt">' + esc(w.complexity) + ' complexity &middot; Live in 48 hours</div>' +
    '</div>';
  }).join('');

  var cRows = [
    ['Setup cost',   'AED 0',                              'AED 0',                                       null,    null],
    ['Monthly cost', 'AED 0',                              'AED 5,000',                                   null,    null],
    ['Monthly loss', fmtAED(calc.monthlyLoss),             fmtAED(lossWithPilot),                          null,    null],
    ['Net position', '&minus;' + fmtAED(calc.monthlyLoss), '+' + fmtAED(Math.max(netWithPilot, 0)),       'red',   'grn']
  ];
  var cTable = cRows.map(function(r) {
    var c1 = r[3] ? ' class="' + r[3] + '"' : '';
    var c2 = r[4] ? ' class="' + r[4] + '"' : '';
    return '<tr><td class="tl">' + r[0] + '</td><td' + c1 + '>' + r[1] + '</td><td' + c2 + '>' + r[2] + '</td></tr>';
  }).join('');

  var css = '<style>' +
    ':root{--forest:#1F4A37;--sage:#8FA695;--clay:#D4956B;--paper:#FAFAF7;--bone:#F2F1EC;--stone:#E6E4DC;--ink:#0E0E0C;--ink2:#2A2A26;--mute:#6E6E68;--line:rgba(14,14,12,0.10);--line-d:rgba(250,250,247,0.18);--fd:"Inter Tight",Helvetica,sans-serif;--fb:"Inter",Helvetica,sans-serif;--fm:"Geist Mono",monospace;}' +
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}' +
    '@page{size:A4 portrait;margin:0;}' +
    'html,body{background:var(--paper);}' +
    '.page{width:210mm;height:290mm;background:var(--paper);display:flex;flex-direction:column;overflow:hidden;page-break-inside:avoid;break-inside:avoid;margin:0 auto;}' +
    '.page+.page{page-break-before:always;break-before:page;}' +
    '.mh{background:var(--forest);padding:14px 32px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}' +
    '.lk{display:inline-flex;align-items:center;gap:10px;}' +
    '.dd{display:inline-flex;gap:4px;}' +
    '.dd s{width:10px;height:10px;border-radius:50%;background:var(--sage);display:block;}' +
    '.dd s:last-child{opacity:0.4;}' +
    '.wm{font-family:var(--fd);font-size:18px;font-weight:600;letter-spacing:-0.02em;color:#fff;}' +
    '.wm b{font-weight:600;color:var(--clay);font-style:normal;}' +
    '.mm{font-family:var(--fm);font-size:9.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--sage);}' +
    '.bd{flex:1;padding:32px 36px 28px;display:flex;flex-direction:column;justify-content:space-between;}' +
    '.blk{display:block;}' +
    '.ey{font-family:var(--fm);font-size:10px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:var(--forest);display:block;margin-bottom:10px;}' +
    'h1{font-family:var(--fd);font-size:44px;font-weight:500;letter-spacing:-0.03em;line-height:1.05;color:var(--ink);margin-bottom:18px;}' +
    'h2{font-family:var(--fd);font-size:30px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:var(--ink);margin-bottom:10px;}' +
    'p{font-family:var(--fb);font-size:15px;line-height:1.6;color:var(--ink2);}' +
    '.st{width:100%;border-collapse:collapse;}' +
    '.st tr:nth-child(odd) td{background:var(--bone);}' +
    '.st tr:nth-child(even) td{background:var(--paper);}' +
    '.st td{padding:14px 18px;font-family:var(--fb);font-size:15px;line-height:1.4;color:var(--ink2);border-bottom:1px solid var(--line);}' +
    '.st td:first-child{font-family:var(--fm);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--mute);font-weight:500;width:44%;}' +
    '.st tr:last-child td{border-bottom:none;}' +
    '.st-head{margin-bottom:12px;}' +
    '.lp{background:var(--forest);border-radius:10px;padding:26px 30px;display:flex;align-items:stretch;}' +
    '.li{flex:1;padding-right:22px;}' +
    '.li+.li{padding-right:0;padding-left:22px;border-left:1px solid var(--line-d);}' +
    '.ll{font-family:var(--fm);font-size:9.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--sage);margin-bottom:8px;display:block;}' +
    '.lf{font-family:var(--fd);font-size:38px;font-weight:500;letter-spacing:-0.03em;line-height:1;color:var(--clay);}' +
    '.ls{font-family:var(--fb);font-size:13px;color:rgba(255,255,255,0.55);margin-top:6px;}' +
    '.ft{padding:14px 32px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;}' +
    '.ft span{font-family:var(--fm);font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--mute);}' +
    '.ft span:last-child{text-align:right;}' +
    '.wc{border-left:3px solid var(--line);border-radius:0 8px 8px 0;padding:18px 22px;margin-bottom:12px;background:var(--bone);}' +
    '.wc.sh{border-left-color:var(--clay);background:#FEF6EE;}' +
    '.wc:last-child{margin-bottom:0;}' +
    '.sb{font-family:var(--fm);font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--clay);font-weight:600;margin-bottom:5px;display:block;}' +
    '.wn-num{font-family:var(--fm);font-size:9.5px;letter-spacing:0.10em;color:var(--mute);font-weight:500;}' +
    '.wn{font-family:var(--fd);font-size:18px;font-weight:600;letter-spacing:-0.01em;color:var(--ink);margin:4px 0 8px;}' +
    '.wd{font-family:var(--fb);font-size:13.5px;line-height:1.5;color:var(--mute);margin-bottom:10px;}' +
    '.rl{font-family:var(--fm);font-size:8.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--mute);font-weight:600;margin-bottom:3px;display:block;}' +
    '.wr{font-family:var(--fb);font-size:13.5px;line-height:1.45;color:var(--ink2);margin-bottom:10px;}' +
    '.wmt{font-family:var(--fm);font-size:9px;letter-spacing:0.10em;text-transform:uppercase;color:var(--mute);}' +
    '.wb{padding:18px 22px;border-top:1px solid var(--line);}' +
    '.wbl{font-family:var(--fm);font-size:9.5px;letter-spacing:0.18em;text-transform:uppercase;color:var(--mute);font-weight:600;margin-bottom:6px;display:block;}' +
    '.wb p{font-size:13.5px;line-height:1.55;color:var(--mute);}' +
    '.ct{width:100%;border-collapse:collapse;}' +
    '.ct thead th{font-family:var(--fm);font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--mute);font-weight:600;padding:0 16px 12px;border-bottom:1px solid var(--line);text-align:left;}' +
    '.ct thead th:not(:first-child){text-align:right;}' +
    '.ct thead th.hi{color:var(--forest);}' +
    '.ct tbody td{padding:14px 16px;font-family:var(--fb);font-size:15px;color:var(--ink2);border-bottom:1px solid var(--line);vertical-align:middle;}' +
    '.ct tbody td:not(:first-child){text-align:right;font-family:var(--fm);font-size:14px;letter-spacing:0.02em;}' +
    '.ct tbody tr:nth-child(odd) td{background:var(--bone);}' +
    '.ct tbody tr:last-child td{border-bottom:none;font-weight:600;font-size:16px;}' +
    '.tl{font-family:var(--fm)!important;font-size:10px!important;letter-spacing:0.10em!important;text-transform:uppercase;color:var(--mute)!important;font-weight:500!important;}' +
    '.red{color:#C0392B!important;}' +
    '.grn{color:#1F7A4A!important;}' +
    '.cp{background:var(--forest);border-radius:10px;padding:26px 30px;}' +
    '.cp p{font-family:var(--fb);font-size:15px;line-height:1.55;color:rgba(255,255,255,0.82);margin-bottom:16px;}' +
    '.pills{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px;}' +
    '.pill{font-family:var(--fm);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--sage);border:1px solid var(--line-d);border-radius:4px;padding:5px 12px;}' +
    '.cc{font-family:var(--fm);font-size:11px;letter-spacing:0.12em;color:var(--sage);line-height:1.9;}' +
    '.disc{padding-top:16px;border-top:1px solid var(--line);}' +
    '.disc p{font-size:11.5px;color:var(--mute);line-height:1.5;}' +
    '</style>';

  var head = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">' +
    css +
    '</head><body>';

  var p1 = '<div class="page">' +
    masthead(1) +
    '<div class="bd">' +
      '<div class="blk">' +
        '<span class="ey">Prepared for ' + esc(name) + ' &middot; ' + date + '</span>' +
        '<h1>Your WhatsApp is losing you ' + esc(fmtAED(calc.monthlyLoss)) + ' every month.</h1>' +
        '<p>' + esc(diagnosis) + '</p>' +
      '</div>' +
      '<div class="blk">' +
        '<span class="ey st-head">Your situation</span>' +
        '<table class="st"><tbody>' + sitTable + '</tbody></table>' +
      '</div>' +
      '<div class="blk">' +
        '<div class="lp">' +
          '<div class="li">' +
            '<span class="ll">Monthly revenue at risk</span>' +
            '<div class="lf">' + esc(fmtAED(calc.monthlyLoss)) + '</div>' +
            '<div class="ls">from missed enquiries</div>' +
          '</div>' +
          '<div class="li">' +
            '<span class="ll">Weekly exposure</span>' +
            '<div class="lf" style="font-size:30px;">' + esc(fmtAED(calc.weeklyLoss)) + '</div>' +
            '<div class="ls">per week of delay</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    footer(1, 'Confidential') +
  '</div>';

  var p2 = '<div class="page">' +
    masthead(2) +
    '<div class="bd">' +
      '<div class="blk">' +
        '<span class="ey">Recommended for ' + esc(name) + "'s business</span>" +
        '<h2>Three workflows that fix your specific gap.</h2>' +
        '<p style="font-size:13.5px;color:var(--mute);">Based on your ' + esc(industryName) + ' business, ' + esc(respObj.readable) + ', and ' + esc(covObj.readable) + '.</p>' +
      '</div>' +
      '<div class="blk">' + wCards + '</div>' +
      '<div class="blk">' +
        '<div class="wb">' +
          '<span class="wbl">Why these three</span>' +
          '<p>' + esc(whyThree) + '</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
    footer(2, 'Confidential') +
  '</div>';

  var p3 = '<div class="page">' +
    masthead(3) +
    '<div class="bd">' +
      '<div class="blk">' +
        '<span class="ey">The numbers</span>' +
        '<h2>Side by side.</h2>' +
      '</div>' +
      '<div class="blk">' +
        '<table class="ct">' +
          '<thead><tr><th></th><th>No automation</th><th class="hi">With pilot</th></tr></thead>' +
          '<tbody>' + cTable + '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="blk">' +
        '<div class="cp">' +
          '<p>Every month you wait costs you ' + esc(fmtAED(calc.monthlyLoss)) + '. Three workflows. Live in 48 hours. AED 0 to start.</p>' +
          '<div class="pills">' +
            '<div class="pill">AED 0 to start</div>' +
            '<div class="pill">48 hrs to live</div>' +
            '<div class="pill">No contract</div>' +
          '</div>' +
          '<div class="cc">WhatsApp &nbsp;+44 7842 552606<br>Instagram &nbsp;@ibrahim.prompted</div>' +
        '</div>' +
      '</div>' +
      '<div class="blk">' +
        '<div class="disc">' +
          '<p>Loss figures are calculated from your reported response time, coverage window, weekly enquiry volume, and average deal value. Figures represent estimated revenue at risk based on UAE market conversion benchmarks.</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
    footer(3, 'ibrahimdigital.com') +
  '</div>';

  return head + p1 + p2 + p3 + '</body></html>';
}

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

  var pdfRes = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': env.PDFSHIFT_API_KEY,
    },
    body: JSON.stringify({ source: htmlString, format: 'A4', margin: { top:'0', right:'0', bottom:'0', left:'0' }, landscape: false }),
  });
  if (!pdfRes.ok) {
    var pdfErr = await pdfRes.text();
    console.error('[report-delivery] PDFShift error:', pdfErr);
    return Response.json({ error: 'pdf generation failed', detail: pdfErr }, { status: 502 });
  }
  var pdfBuffer = await pdfRes.arrayBuffer();

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

  var templateRes = await fetch(
    KAPSO_BASE + '/meta/whatsapp/v24.0/' + PHONE_NUMBER_ID + '/messages',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': env.KAPSO_API_KEY },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone_number,
        type: 'template',
        template: {
          name: 'revenue_audit_report',
          language: { code: 'en_US' },
          components: [
            {
              type: 'header',
              parameters: [
                { type: 'document', document: { id: mediaId, filename: fileName } }
              ]
            },
            {
              type: 'body',
              parameters: [
                { type: 'text', parameter_name: 'lead_name',    text: lead_name },
                { type: 'text', parameter_name: 'monthly_loss', text: fmtAED(monthlyLoss) }
              ]
            }
          ]
        }
      }),
    }
  );

  if (!templateRes.ok) {
    var tplErr = await templateRes.text();
    console.error('[report-delivery] template send failed:', tplErr);
    return Response.json({ error: 'template send failed', detail: tplErr }, { status: 502 });
  }

  return Response.json({ vars: { delivery_status: 'sent' } });
}
