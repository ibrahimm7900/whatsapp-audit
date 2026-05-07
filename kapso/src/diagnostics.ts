// diagnostics.ts — ported verbatim from calc-result.jsx
// getDiagnosisParagraph, getWhyThreeParagraph

import { fmtAED } from './scoring';

export interface CalcResult {
  monthlyLoss: number;
  weeklyLoss: number;
  lossRatePercent: number;
  coverageMultiplierPercent: number;
  responseTimeReadable: string;
  coverageReadable: string;
}

export interface IndustryObj {
  id: string;
  name: string;
  dealLabel: string;
}

export interface InputsForDiag {
  industry: string;
  dealValue: number;
  weeklyEnquiries: number;
  responseTime: string;
  coverage: string;
}

export function getDiagnosisParagraph(inputs: InputsForDiag, calc: CalcResult): string {
  const fast = inputs.responseTime === 'under_1hr' || inputs.responseTime === '1_4hrs';
  const cov  = inputs.coverage;

  if (cov === 'weekdays_only' && !fast)
    return "You're available roughly 45 hours per week. Your leads come in 168 hours per week. The gap — evenings, Fridays, weekends — is where your revenue is going. Every hour offline is an hour a competitor can reply first.";

  if (cov === 'weekdays_only' && fast)
    return "You reply quickly when you're there. The problem is the hours you're not. Evenings, Fridays, and weekends account for 35–45% of all WhatsApp enquiries in the UAE. Those hours are currently unattended.";

  if (cov === 'weekdays_weekends' && !fast)
    return "You're available most days, but your response time is giving leads enough time to contact a competitor and hear back first. In the UAE, 78% of customers commit to whoever responds first.";

  if (cov === 'weekdays_weekends' && fast)
    return `You're fast and available most of the time. The gap is after-hours — evenings and nights when enquiries come in but nothing goes out. That window is costing you ${fmtAED(calc.monthlyLoss)} per month.`;

  if (cov === 'always' && !fast)
    return "You're always reachable, but the speed of your replies is the leak. UAE buyers contact multiple businesses simultaneously. The first reply wins — at your current response time, you're rarely first.";

  return `You reply quickly and you're always available. Your loss is lower than most — but at ${calc.lossRatePercent}% of enquiries still not converting, there is ${fmtAED(calc.monthlyLoss)} per month in leads that are not being captured, qualified, or followed up.`;
}

export function getWhyThreeParagraph(inputs: InputsForDiag, calc: CalcResult, industryObj: IndustryObj): string {
  const enq = inputs.weeklyEnquiries >= 200 ? '200+' : String(inputs.weeklyEnquiries);
  return `You handle ${inputs.dealValue >= 50000 ? 'high-value' : 'time-sensitive'} ${industryObj.name.toLowerCase()} leads in a market where the first reply wins. With ${enq} enquiries per week and ${calc.responseTimeReadable}, your biggest gap is ${calc.coverageMultiplierPercent > 0 ? 'coverage — leads going cold while you\'re offline' : 'speed — competitors replying first'}. These three workflows address that gap in order of ROI.`;
}
