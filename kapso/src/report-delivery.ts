// report-delivery.ts — Kapso Function (Cloudflare Worker)
// Receives workflow variables → scores workflows → builds PDF → uploads → sends via WhatsApp

import { buildReportPDF } from './pdf-builder';
import { scoreWorkflows, RESPONSE, COVERAGE, fmtAED } from './scoring';

const PHONE_NUMBER_ID = '1162751303579401';

interface Env {
  KAPSO_API_KEY: string;
}

interface WorkflowVars {
  lead_name: string;
  phone_number: string;
  monthly_loss: string;
  weekly_loss: string;
  annual_loss: string;
  industry: string;
  industry_name: string;
  deal_label: string;
  deal_value: number;
  weekly_enquiries: number;
  response_time_id: string;
  coverage_id: string;
  loss_rate_pct: number;
  coverage_mult_pct: number;
  markdown: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // ── Parse incoming Kapso payload ───────────────────────────
    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'invalid JSON body' }, { status: 400 });
    }

    // Kapso passes variables under execution_context.vars; fall back to body root for local testing
    const vars: WorkflowVars = body.execution_context?.vars ?? body;

    const {
      lead_name,
      phone_number,
      industry,
      industry_name,
      deal_label,
      deal_value,
      weekly_enquiries,
      response_time_id,
      coverage_id,
    } = vars;

    // ── Lookup rate/coverage objects ───────────────────────────
    const respObj = RESPONSE.find(r => r.id === response_time_id);
    const covObj  = COVERAGE.find(c => c.id === coverage_id);

    if (!respObj || !covObj) {
      return Response.json({ error: 'unknown response_time_id or coverage_id' }, { status: 400 });
    }

    // ── Score top-3 workflows ──────────────────────────────────
    const workflows = scoreWorkflows({
      industry,
      dealValue:        deal_value,
      weeklyEnquiries:  weekly_enquiries,
      responseTime:     response_time_id,
      coverage:         coverage_id,
    });

    // ── Reconstruct calc object ────────────────────────────────
    const rawMonthly  = weekly_enquiries * deal_value * respObj.lossRate * covObj.multiplier * 4.3;
    const monthlyLoss = Math.round(rawMonthly / 100) * 100;
    const weeklyLoss  = Math.round(monthlyLoss / 4.3 / 100) * 100;

    const calc = {
      monthlyLoss,
      weeklyLoss,
      lossRatePercent:           Math.round(respObj.lossRate * 100),
      coverageMultiplierPercent: Math.round((covObj.multiplier - 1) * 100),
      responseTimeReadable:      respObj.readable,
      coverageReadable:          covObj.readable,
    };

    // ── Build PDF ──────────────────────────────────────────────
    const pdfBytes = await buildReportPDF({
      name:           lead_name,
      industry,
      industryName:   industry_name,
      dealLabel:      deal_label,
      dealValue:      deal_value,
      weeklyEnquiries: weekly_enquiries,
      responseTimeId: response_time_id,
      coverageId:     coverage_id,
      calc,
      workflows,
      respObj,
      covObj,
    });

    // ── Upload PDF to WhatsApp via Kapso REST API ──────────────
    // Kapso wraps the WhatsApp Cloud API — use multipart/form-data media upload
    const kapsoBase = 'https://api.kapso.ai';
    const safeFileName = `Revenue-Report-${lead_name.replace(/\s+/g, '-')}.pdf`;

    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'document');
    formData.append(
      'file',
      new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }),
      safeFileName,
    );

    const uploadRes = await fetch(
      `${kapsoBase}/platform/v1/phone-numbers/${PHONE_NUMBER_ID}/media`,
      {
        method: 'POST',
        headers: { 'X-API-Key': env.KAPSO_API_KEY },
        body: formData,
      },
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('[report-delivery] media upload failed:', err);
      return Response.json({ error: 'media upload failed', detail: err }, { status: 502 });
    }

    const { id: mediaId } = await uploadRes.json() as { id: string };

    // ── Send personalised text message ─────────────────────────
    const textBody = {
      messaging_product: 'whatsapp',
      to: phone_number,
      type: 'text',
      text: {
        body: `Hi ${lead_name} 👋\n\nHere's your WhatsApp Revenue Audit from Ibrahim Digital.\n\nBased on your inputs, your business is leaking *${fmtAED(monthlyLoss)}* every month from missed WhatsApp enquiries.\n\nI've put together 3 workflows that would fix your specific gap — your personalised report is attached.\n\n_If you want to talk about getting these live in 48 hours, just reply to this message._`,
      },
    };

    const textRes = await fetch(
      `${kapsoBase}/platform/v1/phone-numbers/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.KAPSO_API_KEY,
        },
        body: JSON.stringify(textBody),
      },
    );

    if (!textRes.ok) {
      const err = await textRes.text();
      console.error('[report-delivery] text send failed:', err);
      // Continue — still try to send the document
    }

    // ── Send PDF document ──────────────────────────────────────
    const docBody = {
      messaging_product: 'whatsapp',
      to: phone_number,
      type: 'document',
      document: {
        id: mediaId,
        filename: safeFileName,
        caption: 'Your WhatsApp Revenue Audit — Ibrahim Digital Solutions',
      },
    };

    const docRes = await fetch(
      `${kapsoBase}/platform/v1/phone-numbers/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.KAPSO_API_KEY,
        },
        body: JSON.stringify(docBody),
      },
    );

    if (!docRes.ok) {
      const err = await docRes.text();
      console.error('[report-delivery] doc send failed:', err);
      return Response.json({ error: 'document send failed', detail: err }, { status: 502 });
    }

    return Response.json({ vars: { delivery_status: 'sent' } });
  },
};
