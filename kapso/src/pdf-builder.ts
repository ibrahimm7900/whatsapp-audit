// pdf-builder.ts — 3-page branded A4 PDF using pdf-lib
// Brand: forest #1F4A37, clay #D4956B, paper #FAFAF7, ink #1A1D18

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import { fmtAED } from './scoring';
import { getDiagnosisParagraph, getWhyThreeParagraph, CalcResult, IndustryObj, InputsForDiag } from './diagnostics';

// ── Brand palette ──────────────────────────────────────────────
const FOREST = rgb(0.122, 0.290, 0.216);   // #1F4A37
const CLAY   = rgb(0.831, 0.584, 0.420);   // #D4956B
const PAPER  = rgb(0.980, 0.976, 0.969);   // #FAFAF7
const INK    = rgb(0.102, 0.114, 0.094);   // #1A1D18
const FG2    = rgb(0.380, 0.400, 0.350);   // grey body text
const RED    = rgb(0.780, 0.200, 0.180);
const GREEN  = rgb(0.122, 0.290, 0.216);   // same as FOREST
const WHITE  = rgb(1, 1, 1);

// ── A4 dimensions ─────────────────────────────────────────────
const W = 595.28;
const H = 841.89;
const MARGIN = 48;
const CONTENT_W = W - MARGIN * 2;

// ── Layout helpers ─────────────────────────────────────────────
function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb> = INK,
) {
  page.drawText(text, { x, y, font, size, color });
}

/** Wrap text to fit within maxWidth, return array of lines */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Draw wrapped paragraph, returns Y after last line */
function drawParagraph(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  maxWidth: number,
  lineHeight = 1.4,
): number {
  const lines = wrapText(text, font, size, maxWidth);
  for (const line of lines) {
    drawText(page, line, x, y, font, size, color);
    y -= size * lineHeight;
  }
  return y;
}

/** Draw standard page header strip */
function drawHeader(page: PDFPage, bold: PDFFont, reg: PDFFont, pageLabel: string) {
  // Full-width forest strip
  drawRect(page, 0, H - 44, W, 44, FOREST);
  // Left: IDS wordmark
  drawText(page, 'IBRAHIM DIGITAL SOLUTIONS', MARGIN, H - 27, bold, 8, WHITE);
  // Right: page number
  const pgW = bold.widthOfTextAtSize(pageLabel, 8);
  drawText(page, pageLabel, W - MARGIN - pgW, H - 27, bold, 8, CLAY);
  // Sub-strip separator line
  drawRect(page, 0, H - 50, W, 2, CLAY);
}

/** Draw standard page footer */
function drawFooter(page: PDFPage, reg: PDFFont, left: string, right: string) {
  drawRect(page, 0, 0, W, 32, FOREST);
  drawText(page, left, MARGIN, 11, reg, 8, WHITE);
  const rw = reg.widthOfTextAtSize(right, 8);
  drawText(page, right, W - MARGIN - rw, 11, reg, 8, FG2);
}

// ─────────────────────────────────────────────────────────────
// Public interface
// ─────────────────────────────────────────────────────────────
export interface PDFBuildParams {
  name: string;
  industry: string;
  industryName: string;
  dealLabel: string;
  dealValue: number;
  weeklyEnquiries: number;
  responseTimeId: string;
  coverageId: string;
  calc: CalcResult;
  workflows: Array<{
    id: string;
    name: string;
    does: string;
    recovers: string;
    complexity: string;
    isStartHere?: boolean;
  }>;
  respObj: { label: string; readable: string };
  covObj:  { label: string; readable: string };
}

export async function buildReportPDF(p: PDFBuildParams): Promise<Uint8Array> {
  const doc  = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);

  const inputs: InputsForDiag = {
    industry: p.industry,
    dealValue: p.dealValue,
    weeklyEnquiries: p.weeklyEnquiries,
    responseTime: p.responseTimeId,
    coverage: p.coverageId,
  };

  const industryObj: IndustryObj = {
    id: p.industry,
    name: p.industryName,
    dealLabel: p.dealLabel,
  };

  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const lossWithPilot = Math.round((p.calc.monthlyLoss * 0.25) / 100) * 100;
  const netWithPilot  = p.calc.monthlyLoss - lossWithPilot - 5000;

  // ────────────────────────────────────────────────────────────
  // PAGE 1 — Your Situation
  // ────────────────────────────────────────────────────────────
  {
    const pg = doc.addPage([W, H]);
    pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });

    drawHeader(pg, bold, reg, 'WHATSAPP REVENUE REPORT  01 / 03');

    let y = H - 72;

    // Section eyebrow
    drawText(pg, 'YOUR SITUATION', MARGIN, y, bold, 7, CLAY);
    y -= 14;

    // Hero headline
    const headLine = `Your WhatsApp is losing you`;
    const headLine2 = `${fmtAED(p.calc.monthlyLoss)} every month.`;
    drawText(pg, headLine, MARGIN, y, bold, 20, INK);
    y -= 26;
    drawText(pg, headLine2, MARGIN, y, bold, 20, FOREST);
    y -= 10;

    // Thin divider
    drawRect(pg, MARGIN, y, CONTENT_W, 1, rgb(0.85, 0.85, 0.82));
    y -= 18;

    // Prepared for
    drawText(pg, `Prepared for: ${p.name}  ·  ${dateStr}`, MARGIN, y, reg, 8.5, FG2);
    y -= 22;

    // Diagnosis heading
    drawText(pg, 'DIAGNOSIS', MARGIN, y, bold, 7.5, CLAY);
    y -= 14;

    // Diagnosis paragraph
    const diag = getDiagnosisParagraph(inputs, p.calc);
    y = drawParagraph(pg, diag, MARGIN, y, reg, 9.5, INK, CONTENT_W, 1.55) - 4;

    // Divider
    drawRect(pg, MARGIN, y, CONTENT_W, 1, rgb(0.85, 0.85, 0.82));
    y -= 18;

    // Situation table heading
    drawText(pg, 'YOUR SITUATION', MARGIN, y, bold, 7.5, CLAY);
    y -= 14;

    const tableRows = [
      ['Industry', p.industryName],
      [`Average ${p.dealLabel} value`, fmtAED(p.dealValue)],
      ['Weekly enquiries', `${p.weeklyEnquiries >= 200 ? '200+' : p.weeklyEnquiries} messages`],
      ['Response time', p.respObj.label],
      ['Coverage', p.covObj.label],
    ];

    for (let i = 0; i < tableRows.length; i++) {
      const rowY = y;
      const bg = i % 2 === 0 ? rgb(0.930, 0.930, 0.920) : PAPER;
      drawRect(pg, MARGIN, rowY - 3, CONTENT_W, 18, bg);
      drawText(pg, tableRows[i][0], MARGIN + 8, rowY + 7, reg, 9, FG2);
      drawText(pg, tableRows[i][1], MARGIN + 200, rowY + 7, bold, 9, INK);
      y -= 18;
    }
    y -= 10;

    // Bottom-of-page forest panel
    const panelH = 100;
    const panelY = 36;
    drawRect(pg, 0, panelY, W, panelH, FOREST);

    // Clay accent strip top of panel
    drawRect(pg, 0, panelY + panelH - 3, W, 3, CLAY);

    // Monthly loss big figure
    const bigFmt = fmtAED(p.calc.monthlyLoss);
    const bigW = bold.widthOfTextAtSize(bigFmt, 28);
    drawText(pg, bigFmt, MARGIN, panelY + panelH - 38, bold, 28, CLAY);
    drawText(pg, 'monthly loss', MARGIN, panelY + panelH - 56, reg, 9, rgb(0.75, 0.82, 0.76));

    // Weekly loss right-aligned
    const wkFmt = `${fmtAED(p.calc.weeklyLoss)} / week`;
    const wkW   = reg.widthOfTextAtSize(wkFmt, 10);
    drawText(pg, wkFmt, W - MARGIN - wkW, panelY + panelH - 38, reg, 10, WHITE);
    const annFmt = `${fmtAED(p.calc.monthlyLoss * 12)} / year`;
    const annW   = reg.widthOfTextAtSize(annFmt, 10);
    drawText(pg, annFmt, W - MARGIN - annW, panelY + panelH - 56, reg, 10, rgb(0.75, 0.82, 0.76));

    drawFooter(pg, reg, 'Ibrahim Digital · Dubai · ibrahimdigitalsolutions.com', 'Page 1 of 3');
  }

  // ────────────────────────────────────────────────────────────
  // PAGE 2 — Workflow Recommendations
  // ────────────────────────────────────────────────────────────
  {
    const pg = doc.addPage([W, H]);
    pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });

    drawHeader(pg, bold, reg, 'WORKFLOW RECOMMENDATIONS  02 / 03');

    let y = H - 72;

    drawText(pg, `RECOMMENDED FOR ${p.name.toUpperCase()}'S BUSINESS`, MARGIN, y, bold, 7, CLAY);
    y -= 14;
    drawText(pg, 'Three workflows that would fix your specific gap.', MARGIN, y, bold, 16, INK);
    y -= 18;
    const subLine = `Based on your ${p.industryName} business, ${p.respObj.readable}, and ${p.covObj.readable}.`;
    y = drawParagraph(pg, subLine, MARGIN, y, reg, 9.5, FG2, CONTENT_W, 1.4) - 8;

    // Workflow cards
    for (let i = 0; i < p.workflows.length; i++) {
      const w = p.workflows[i];
      const cardH = 100;

      // Card background
      drawRect(pg, MARGIN, y - cardH + 8, CONTENT_W, cardH, WHITE);

      // Left border accent
      const borderColor = w.isStartHere ? CLAY : FOREST;
      drawRect(pg, MARGIN, y - cardH + 8, 4, cardH, borderColor);

      let cy = y - 4;

      // START HERE badge
      if (w.isStartHere) {
        drawRect(pg, MARGIN + 12, cy - 11, 70, 14, CLAY);
        drawText(pg, '★  START HERE', MARGIN + 16, cy - 8, bold, 7, WHITE);
        cy -= 16;
      }

      // Workflow number + name
      drawText(pg, `${String(i + 1).padStart(2, '0')}  ${w.name.toUpperCase()}`, MARGIN + 12, cy, bold, 9.5, INK);
      cy -= 14;

      // Does
      cy = drawParagraph(pg, w.does, MARGIN + 12, cy, reg, 8.5, FG2, CONTENT_W - 24, 1.4) - 2;

      // Recovers
      drawText(pg, 'RECOVERS', MARGIN + 12, cy, bold, 7, CLAY);
      cy -= 11;
      cy = drawParagraph(pg, w.recovers, MARGIN + 12, cy, reg, 8, INK, CONTENT_W - 24, 1.35) - 2;

      // Meta
      drawText(pg, `${w.complexity.toUpperCase()} COMPLEXITY  ·  LIVE IN 48 HOURS`, MARGIN + 12, cy, reg, 7, FG2);

      y -= (cardH + 10);
    }

    y -= 6;

    // Why these three
    drawRect(pg, MARGIN, y, CONTENT_W, 1, rgb(0.85, 0.85, 0.82));
    y -= 14;
    drawText(pg, 'WHY THESE THREE', MARGIN, y, bold, 7.5, CLAY);
    y -= 13;
    const whyText = getWhyThreeParagraph(inputs, p.calc, industryObj);
    drawParagraph(pg, whyText, MARGIN, y, reg, 9, FG2, CONTENT_W, 1.5);

    drawFooter(pg, reg, 'Ibrahim Digital · Dubai · ibrahimdigitalsolutions.com', 'Page 2 of 3');
  }

  // ────────────────────────────────────────────────────────────
  // PAGE 3 — The Numbers
  // ────────────────────────────────────────────────────────────
  {
    const pg = doc.addPage([W, H]);
    pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });

    drawHeader(pg, bold, reg, 'THE NUMBERS  03 / 03');

    let y = H - 72;

    drawText(pg, 'THE COMPARISON', MARGIN, y, bold, 7, CLAY);
    y -= 14;
    drawText(pg, 'The numbers, side by side.', MARGIN, y, bold, 20, INK);
    y -= 32;

    // Comparison table
    const COL1 = MARGIN;
    const COL2 = MARGIN + 200;
    const COL3 = MARGIN + 350;
    const colW2 = 140;

    // Table header
    drawRect(pg, MARGIN, y - 4, CONTENT_W, 22, FOREST);
    drawText(pg, '', COL1 + 8, y + 8, bold, 9, WHITE);
    drawText(pg, 'DOING NOTHING', COL2 + 8, y + 8, bold, 8, WHITE);
    drawText(pg, 'STARTING THE PILOT', COL3 + 2, y + 8, bold, 8, CLAY);
    y -= 26;

    const tableRows: Array<[string, string, string, boolean?]> = [
      ['Setup cost',    'AED 0',                    'AED 0'],
      ['Monthly cost',  'AED 0',                    'AED 5,000'],
      ['Monthly loss',  fmtAED(p.calc.monthlyLoss), fmtAED(lossWithPilot)],
      ['Net position',  `−${fmtAED(p.calc.monthlyLoss)}`, `+${fmtAED(netWithPilot)}`, true],
    ];

    for (let i = 0; i < tableRows.length; i++) {
      const [label, col2val, col3val, highlight] = tableRows[i];
      const rowBg = i % 2 === 0 ? rgb(0.93, 0.93, 0.92) : PAPER;
      drawRect(pg, MARGIN, y - 4, CONTENT_W, 22, rowBg);

      drawText(pg, label, COL1 + 8, y + 8, bold, 9.5, INK);

      const c2col = highlight ? RED : FG2;
      const c3col = highlight ? GREEN : INK;
      drawText(pg, col2val, COL2 + 8, y + 8, reg, 9.5, c2col);
      drawText(pg, col3val, COL3 + 2, y + 8, bold, 9.5, c3col);

      y -= 24;
    }

    y -= 16;

    // Forest panel — the key message
    const panelH = 120;
    drawRect(pg, 0, y - panelH, W, panelH, FOREST);
    drawRect(pg, 0, y, W, 3, CLAY);

    let py = y - 20;
    const msg1 = `Every month you wait costs you ${fmtAED(p.calc.monthlyLoss)}.`;
    const msg2 = `Every month with the pilot costs you AED 5,000.`;
    const msg3 = netWithPilot > 0
      ? `The difference is ${fmtAED(netWithPilot)} — in your pocket, not your competitors'.`
      : `The pilot pays for itself the moment you recover one deal.`;

    py = drawParagraph(pg, msg1, MARGIN, py, bold, 11, WHITE, CONTENT_W, 1.5) - 2;
    py = drawParagraph(pg, msg2, MARGIN, py, reg, 11, rgb(0.75, 0.82, 0.76), CONTENT_W, 1.5) - 2;
    drawParagraph(pg, msg3, MARGIN, py, bold, 11, CLAY, CONTENT_W, 1.5);

    y -= (panelH + 24);

    // Your Next Step section
    drawText(pg, 'YOUR NEXT STEP', MARGIN, y, bold, 7.5, CLAY);
    y -= 14;
    drawText(pg, 'Try it free. See it work. Then decide.', MARGIN, y, bold, 14, INK);
    y -= 20;

    // Three pills
    const pills = ['AED 0 to start', '48 hrs to live', 'No contract'];
    let px = MARGIN;
    for (const pill of pills) {
      const pw = bold.widthOfTextAtSize(pill, 9) + 20;
      drawRect(pg, px, y - 6, pw, 20, FOREST);
      drawText(pg, pill, px + 10, y + 5, bold, 9, WHITE);
      px += pw + 10;
    }
    y -= 32;

    // Contact block
    drawRect(pg, MARGIN, y - 4, CONTENT_W, 1, rgb(0.85, 0.85, 0.82));
    y -= 16;
    drawText(pg, 'GET IN TOUCH', MARGIN, y, bold, 7.5, CLAY);
    y -= 14;
    drawText(pg, 'WhatsApp:   +44 7842 552606', MARGIN, y, reg, 10, INK);
    y -= 14;
    drawText(pg, 'Instagram:    @ibrahim.prompted', MARGIN, y, reg, 10, INK);

    const footerLeft  = `Prepared for ${p.name}  ·  ${dateStr}`;
    const footerRight = 'Ibrahim Digital · Dubai';
    drawFooter(pg, reg, footerLeft, footerRight);
  }

  return doc.save();
}
