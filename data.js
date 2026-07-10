// data.js — workflow library, industry config, calculation logic
// Loaded as plain JS so it's available globally before babel scripts run.

// defaultDeal: per-industry typical "your take per deal" (AED). Used to auto-populate
// dealValue when the deal-value step is skipped in the streamlined tap-only flow —
// calc() requires dealValue, and this value also feeds the report's workflow ranking
// (boost_high_value / boost_medium_value in the workflows below). Mid-range per vertical.
window.IDS_INDUSTRIES = [
  { id: 'real_estate', name: 'Real estate',  desc: 'Agents, brokerages, developers',     dealLabel: 'commission',  defaultDeal: 50000 },
  { id: 'hvac',        name: 'HVAC',         desc: 'AC installation and maintenance',    dealLabel: 'callout',     defaultDeal: 500 },
  { id: 'automotive',  name: 'Automotive',   desc: 'Dealerships and traders',            dealLabel: 'margin',      defaultDeal: 50000 },
  { id: 'wellness',    name: 'Wellness',     desc: 'Clinics, salons, gyms',              dealLabel: 'appointment', defaultDeal: 500 },
  { id: 'logistics',   name: 'Logistics',    desc: 'Freight, delivery, warehousing',     dealLabel: 'contract',    defaultDeal: 5000 },
  { id: 'education',   name: 'Education',    desc: 'Schools, tutoring, training',        dealLabel: 'enrolment',   defaultDeal: 5000 },
];

window.IDS_DEAL_PRESETS = [
  { id: 'p1', label: 'Under AED 1,000',         value: 500 },
  { id: 'p2', label: 'AED 1,000 – 10,000',      value: 5000 },
  { id: 'p3', label: 'AED 10,000 – 100,000',    value: 50000 },
  { id: 'p4', label: 'Over AED 100,000',        value: 150000 },
];

window.IDS_RESPONSE = [
  { id: 'under_1hr', label: 'Under 1 hour',     desc: 'You reply quickly, most of the time.',                lossRate: 0.15, readable: 'under-1-hour response times' },
  { id: '1_4hrs',    label: '1 – 4 hours',      desc: 'You get back to most people same day.',               lossRate: 0.35, readable: '1–4 hour response times' },
  { id: '4_24hrs',   label: '4 – 24 hours',     desc: "Replies take a while, especially when you're busy.",  lossRate: 0.60, readable: '4–24 hour response times' },
  { id: 'next_day',  label: 'Next day or later',desc: 'Messages often wait until you have time.',            lossRate: 0.80, readable: 'next-day response times' },
];

window.IDS_COVERAGE = [
  { id: 'weekdays_only', label: 'Weekdays only',          desc: '9am – 6pm, Monday to Friday. Evenings, weekends, and Fridays are quiet.',  multiplier: 1.35, readable: 'weekday-only availability' },
  { id: 'weekdays_weekends', label: 'Weekdays and weekends', desc: "You're available most days, but evenings and nights are offline.",      multiplier: 1.15, readable: 'weekday and weekend availability' },
  { id: 'always',        label: 'Always available',        desc: 'You or your team reply at any hour, any day.',                              multiplier: 1.00, readable: '24/7 availability' },
];

window.IDS_DIAGNOSTIC_LINE = {
  under_1hr: 'You reply quickly — but not when it counts most.',
  '1_4hrs':  'Leads are slipping through while you\u2019re busy.',
  '4_24hrs': 'By the time you reply, they\u2019ve already chosen someone else.',
  next_day:  'Most of your enquiries never become customers.',
};

// ── Calculation ──────────────────────────────────────────────
window.IDS_calculate = function (inputs) {
  const enq   = Math.min(inputs.weeklyEnquiries, 200);
  const resp  = window.IDS_RESPONSE.find(r => r.id === inputs.responseTime);
  const cov   = window.IDS_COVERAGE.find(c => c.id === inputs.coverage);
  const monthly = enq * inputs.dealValue * resp.lossRate * cov.multiplier * 4.3;
  const monthlyRounded = Math.round(monthly / 100) * 100;
  return {
    monthlyLoss: monthlyRounded,
    weeklyLoss: Math.round((monthlyRounded / 4.3) / 100) * 100,
    lossRatePercent: Math.round(resp.lossRate * 100),
    coverageMultiplierPercent: Math.round((cov.multiplier - 1) * 100),
    responseTimeReadable: resp.readable,
    coverageReadable: cov.readable,
    diagnostic: window.IDS_DIAGNOSTIC_LINE[inputs.responseTime],
  };
};

// ── Workflow library (condensed for prototype) ────────────────
window.IDS_WORKFLOWS = [
  // REAL ESTATE
  { id:'RE-1', industry:'real_estate', name:'After-hours responder',      does:'Replies to every enquiry that comes in outside your working hours — evenings, weekends, Fridays — instantly, in the buyer\u2019s language.', recovers:'Captures the 35–45% of inbound leads currently lost to after-hours silence.', complexity:'Low',    boost_after_hours:1, boost_coverage_gap:1, startHere:(i)=> (i.responseTime==='4_24hrs'||i.responseTime==='next_day') && i.coverage==='weekdays_only' },
  { id:'RE-2', industry:'real_estate', name:'Viewing scheduler',          does:'Takes an enquiry from first message to a booked property viewing — qualification, availability, confirmation — with no agent involvement.', recovers:'Recovers 2 viewings per month that convert.', complexity:'Low',    boost_speed:1, boost_medium_volume:1, startHere:(i)=> i.weeklyEnquiries>30 && i.dealValue>50000 },
  { id:'RE-3', industry:'real_estate', name:'Multilingual qualifier',     does:'Detects the buyer\u2019s language — Arabic, English, Russian, Urdu, Chinese — and replies fluently from the first message.', recovers:'A single recovered Russian or Chinese buyer = AED 60–120k commission.', complexity:'Low',    boost_high_value:1, startHere:(i)=> i.dealValue>150000 && i.responseTime!=='under_1hr' },
  { id:'RE-4', industry:'real_estate', name:'Portal lead follow-up',      does:'When a lead comes in from Property Finder or Bayut, an instant WhatsApp message goes to the lead within 90 seconds — before any competitor replies.', recovers:'Doubles portal-lead conversion at the same ad spend.', complexity:'Medium', boost_high_value:1, boost_speed:1 },
  { id:'RE-5', industry:'real_estate', name:'Lead qualifier',             does:'Asks the three questions that separate serious buyers from tyre-kickers — budget, timeline, finance or cash — before you spend a minute.', recovers:'Cuts wasted WhatsApp time on non-buyers from 60% to under 20%.', complexity:'Low',    boost_high_volume:1 },
  { id:'RE-6', industry:'real_estate', name:'CRM sync',                   does:'Every WhatsApp lead — name, number, budget, language — pushed straight into your CRM with no manual data entry.', recovers:'Stops leads getting lost in chat and never followed up.', complexity:'Medium', boost_fast_responder:1, boost_medium_volume:1 },

  // HVAC
  { id:'HV-1', industry:'hvac', name:'Emergency triage',                  does:'AC emergency messages get an instant acknowledgment, booking slot, and technician ETA — in under 60 seconds, at any hour.', recovers:'In summer, missing 10 emergency callouts/week = AED 4–15k in a single week.', complexity:'Low',    boost_after_hours:1, boost_triage:1, startHere:(i)=> i.responseTime!=='under_1hr' && i.coverage==='weekdays_only' },
  { id:'HV-2', industry:'hvac', name:'AMC renewal reminder',              does:'Sends a 60/30/7-day renewal sequence to every client whose AMC is expiring, with a one-tap renew link.', recovers:'AED 75–125k/year in AMC revenue currently evaporating.', complexity:'Medium', boost_fast_responder:1, boost_medium_value:1 },
  { id:'HV-3', industry:'hvac', name:'Booking confirmation',              does:'Confirmation the moment a job is scheduled — technician name, arrival window, 2-hour reminder.', recovers:'Cuts 20–30% no-show rate on technician visits.', complexity:'Low',    boost_speed:1 },
  { id:'HV-4', industry:'hvac', name:'Quote sender',                      does:'Responds to standard price enquiries — "how much for AC service?" — with an instant formatted quote and booking link.', recovers:'Frees 2–3 hours/day of owner time.', complexity:'Low',    boost_high_volume:1, boost_speed:1 },
  { id:'HV-5', industry:'hvac', name:'Off-hours coverage',                does:'Handles every enquiry that comes in outside business hours with instant replies, triage, and booking.', recovers:'AED 10–40k/month in additional callouts during summer.', complexity:'Low',    boost_after_hours:1, boost_coverage_gap:1 },
  { id:'HV-6', industry:'hvac', name:'Technician dispatch notification',  does:'When a job is booked, technician gets job details and customer is notified simultaneously.', recovers:'Each prevented miscommunication saves AED 200–400 + protects an AMC relationship.', complexity:'Medium', boost_high_volume:1 },

  // AUTOMOTIVE
  { id:'AU-1', industry:'automotive', name:'Availability checker',        does:'When a buyer asks "is this car still available?", they get an instant answer, current price, and a test-drive link.', recovers:'AED 37,500/week of margin currently lost to slow replies.', complexity:'Low',    boost_speed:1, boost_triage:1, startHere:(i)=> (i.responseTime==='4_24hrs'||i.responseTime==='next_day') && i.weeklyEnquiries>20 },
  { id:'AU-2', industry:'automotive', name:'Test drive booker',           does:'From first message to a confirmed test drive — date, time, vehicle, showroom confirmation — with no sales staff involvement.', recovers:'Recovers 10 additional showroom visits/month.', complexity:'Low',    boost_speed:1, boost_high_value:1 },
  { id:'AU-3', industry:'automotive', name:'Lead qualifier',              does:'Asks the four questions every sales team needs — model, budget, finance/cash, trade-in — before engaging.', recovers:'Filters 50–60% of non-buyers before any human time is spent.', complexity:'Low',    boost_high_volume:1 },
  { id:'AU-4', industry:'automotive', name:'Showroom appointment reminder', does:'Confirmation, 24-hour reminder, 2-hour reminder before the test drive.', recovers:'Recovers 5–7 additional show-ups/week = AED 37–52k in margin opportunity.', complexity:'Low',    boost_fast_responder:1, boost_medium_volume:1 },
  { id:'AU-5', industry:'automotive', name:'Quote sender',                does:'Sends a full vehicle quote — price, specs, colours, finance options — within 60 seconds of enquiry.', recovers:'AED 27k additional margin/week from improved enquiry-to-test-drive conversion.', complexity:'Low',    boost_speed:1, boost_high_value:1 },
  { id:'AU-6', industry:'automotive', name:'Cold lead follow-up',         does:'Re-engages buyers who went silent — a sequence of 3 messages over 7 days that brings them back without being pushy.', recovers:'Recovers 10 cold leads/month at AED 7,500 margin = AED 75k.', complexity:'Medium', boost_fast_responder:1 },

  // WELLNESS
  { id:'WL-1', industry:'wellness', name:'No-show reminder sequence',     does:'Confirmation, 24-hour reminder, 2-hour reminder for every booked client, with a one-tap reschedule.', recovers:'Cuts no-shows by 60–80% — recovering AED 45–60k/month.', complexity:'Low',    boost_fast_responder:1, boost_speed:1, boost_triage:1, startHere:()=> true },
  { id:'WL-2', industry:'wellness', name:'Appointment booker',            does:'From first message to a confirmed appointment — service selection, available times, booking — with no receptionist involvement.', recovers:'Frees 4–6 hours/day of receptionist time.', complexity:'Low',    boost_speed:1, boost_medium_volume:1 },
  { id:'WL-3', industry:'wellness', name:'Price qualifier',               does:'Establishes intent — service, budget, first-time/returning — and filters out price shoppers who will not book.', recovers:'Reclaims 2+ hours/week of staff time on non-converting conversations.', complexity:'Low',    boost_high_volume:1 },
  { id:'WL-4', industry:'wellness', name:'Rebooking loop',                does:'Automatically contacts clients who haven\u2019t returned in 30 days with a personalised message and one-tap rebook link.', recovers:'AED 20k/month in recovered recurring revenue.', complexity:'Medium', boost_fast_responder:1 },
  { id:'WL-5', industry:'wellness', name:'New client onboarding',         does:'New clients receive confirmation, address, parking, what to bring, and intake forms — automatically.', recovers:'Drops first-visit no-show rates by 40%.', complexity:'Low',    boost_medium_volume:1 },
  { id:'WL-6', industry:'wellness', name:'Package upsell',                does:'After a client\u2019s third visit, an automatic message offers a 10-session package — at the moment engagement is highest.', recovers:'AED 30k/month locked in as upfront recurring revenue.', complexity:'Medium', boost_fast_responder:1 },

  // LOGISTICS
  { id:'LG-1', industry:'logistics', name:'Status update responder',      does:'When a client asks where their shipment is, the system pulls tracking data and replies with a full status update in under 30 seconds.', recovers:'Eliminates 1–2 dedicated staff = AED 96–288k/year.', complexity:'Medium', boost_high_volume:1, boost_triage:1, startHere:(i)=> i.weeklyEnquiries>40 && i.responseTime!=='under_1hr' },
  { id:'LG-2', industry:'logistics', name:'Escalation router',            does:'Distinguishes routine enquiries from real problems — handles the routine automatically, escalates the rest immediately.', recovers:'Returns 80% of operations-manager time to actual problem-solving.', complexity:'Medium', boost_high_volume:1 },
  { id:'LG-3', industry:'logistics', name:'Booking confirmation',         does:'Confirms every pickup and delivery — reference, date, time window, driver contact — the moment it\u2019s logged.', recovers:'Each prevented missed pickup saves AED 200–500 + protects the contract.', complexity:'Low',    boost_fast_responder:1, boost_medium_volume:1 },
  { id:'LG-4', industry:'logistics', name:'Customs update handler',       does:'Proactively sends customs clearance updates at each stage — without waiting for the client to ask.', recovers:'Eliminates 70% of inbound customs-related messages.', complexity:'Medium', boost_high_volume:1 },
  { id:'LG-5', industry:'logistics', name:'Voice note handler',           does:'Transcribes Arabic voice notes, identifies the request, replies in Arabic text — automatically.', recovers:'Removes a friction point causing 15–20% of GCC client complaints.', complexity:'Medium' },
  { id:'LG-6', industry:'logistics', name:'Internal team separator',      does:'Routes client messages to a dedicated client-facing channel, separate from internal team coordination.', recovers:'Reduces response errors by 80%.', complexity:'Low',    boost_high_volume:1 },

  // EDUCATION
  { id:'ED-1', industry:'education', name:'Trial class booker',           does:'From a parent\u2019s first enquiry to a confirmed trial class — subject, level, time slot, confirmation.', recovers:'AED 30k/month from recovered trial-class bookings.', complexity:'Low',    boost_speed:1, boost_triage:1, startHere:(i)=> (i.responseTime==='4_24hrs'||i.responseTime==='next_day') && i.dealValue>5000 },
  { id:'ED-2', industry:'education', name:'Enrolment nurture sequence',   does:'5-message sequence over 10 days — course details, FAQs, testimonial, deposit request — with no admissions involvement.', recovers:'AED 60k/month in additional revenue from improved close rate.', complexity:'Medium', boost_fast_responder:1, boost_medium_value:1 },
  { id:'ED-3', industry:'education', name:'Fee enquiry handler',          does:'Replies to "how much is the course?" with a full breakdown, schedule, payment options, and a trial-class link.', recovers:'3× conversion vs replying hours later.', complexity:'Low',    boost_high_volume:1 },
  { id:'ED-4', industry:'education', name:'Multilingual parent handler',  does:'Detects parent\u2019s language — Arabic, English, Urdu, Hindi — and replies fluently from the first message.', recovers:'AED 20–60k/month from doubled multilingual conversion.', complexity:'Low',    boost_medium_value:1 },
  { id:'ED-5', industry:'education', name:'Admissions follow-up',         does:'3-message sequence over 14 days re-engaging parents who went quiet.', recovers:'AED 100k from 10 recovered cold leads.', complexity:'Medium', boost_fast_responder:1 },
  { id:'ED-6', industry:'education', name:'New student onboarding',       does:'On enrolment, automatic schedule, login, materials list, and welcome message from the instructor.', recovers:'Drops first-month dropout from 15% to 5%.', complexity:'Low',    boost_fast_responder:1 },
];

// ── Workflow scoring ─────────────────────────────────────────
window.IDS_scoreWorkflows = function (inputs) {
  let candidates = window.IDS_WORKFLOWS.filter(w => w.industry === inputs.industry);
  candidates = candidates.map(w => {
    let score = 0;
    if (inputs.responseTime === 'under_1hr' && w.boost_fast_responder) score += 2;
    if (inputs.responseTime === '1_4hrs' && w.boost_speed) score += 2;
    if (['4_24hrs','next_day'].includes(inputs.responseTime) && w.boost_triage) score += 3;
    if (inputs.coverage === 'weekdays_only' && w.boost_after_hours) score += 2;
    if (inputs.coverage !== 'always' && w.boost_coverage_gap) score += 1;
    if (inputs.weeklyEnquiries > 50 && w.boost_high_volume) score += 2;
    if (inputs.weeklyEnquiries > 20 && w.boost_medium_volume) score += 1;
    if (inputs.dealValue > 100000 && w.boost_high_value) score += 3;
    if (inputs.dealValue > 10000 && w.boost_medium_value) score += 1;
    if (inputs.weeklyEnquiries < 20 && w.complexity === 'low') score += 1;
    // Hard "start here" override
    if (typeof w.startHere === 'function' && w.startHere(inputs)) score += 5;
    return { ...w, score };
  });
  candidates.sort((a, b) => b.score - a.score);
  if (candidates[0]) candidates[0].isStartHere = true;
  return candidates.slice(0, 3);
};

// ── Format helpers ──────────────────────────────────────────
window.IDS_fmtAED = (n) => 'AED ' + Math.round(n).toLocaleString('en-US');
