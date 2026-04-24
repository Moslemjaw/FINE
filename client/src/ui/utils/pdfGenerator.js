import jsPDF from 'jspdf';

/**
 * Premium PDF Report Generator for Vantage Terminal
 * Creates professional financial-grade PDF reports
 */

const COLORS = {
  midnight: [2, 6, 23],
  darkBg: [13, 27, 42],
  cardBg: [20, 35, 55],
  cyan: [34, 211, 238],
  violet: [167, 139, 250],
  emerald: [16, 185, 129],
  rose: [244, 63, 94],
  amber: [245, 158, 11],
  white: [255, 255, 255],
  textPrimary: [245, 245, 245],
  textSecondary: [160, 170, 190],
  textMuted: [110, 120, 140],
  border: [40, 55, 75],
};

function drawGradientHeader(doc) {
  // Dark header background
  doc.setFillColor(...COLORS.midnight);
  doc.rect(0, 0, 210, 45, 'F');

  // Gradient accent line
  const lineY = 44;
  for (let x = 0; x < 210; x++) {
    const ratio = x / 210;
    const r = Math.round(COLORS.cyan[0] * (1 - ratio) + COLORS.violet[0] * ratio);
    const g = Math.round(COLORS.cyan[1] * (1 - ratio) + COLORS.violet[1] * ratio);
    const b = Math.round(COLORS.cyan[2] * (1 - ratio) + COLORS.violet[2] * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(x, lineY, 1, 1.5, 'F');
  }

  // Logo area
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  doc.text('VANTAGE', 15, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.cyan);
  doc.text('AI FINANCIAL TERMINAL', 15, 27);

  // Report date
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textSecondary);
  const now = new Date();
  doc.text(now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 195, 18, { align: 'right' });
  doc.text(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), 195, 24, { align: 'right' });
}

function drawFooter(doc, pageNum, totalPages) {
  const y = 287;
  doc.setFillColor(...COLORS.midnight);
  doc.rect(0, y - 5, 210, 15, 'F');

  // Accent line
  for (let x = 0; x < 210; x++) {
    const ratio = x / 210;
    doc.setFillColor(
      Math.round(COLORS.cyan[0] * (1 - ratio) + COLORS.emerald[0] * ratio),
      Math.round(COLORS.cyan[1] * (1 - ratio) + COLORS.emerald[1] * ratio),
      Math.round(COLORS.cyan[2] * (1 - ratio) + COLORS.emerald[2] * ratio)
    );
    doc.rect(x, y - 5, 1, 0.5, 'F');
  }

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Vantage AI Financial Terminal — Confidential', 15, y + 1);
  doc.text(`Page ${pageNum} of ${totalPages}`, 195, y + 1, { align: 'right' });
}

function drawCard(doc, x, y, w, h) {
  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 3, 3, 'S');
}

function drawKPI(doc, x, y, label, value, color = COLORS.cyan) {
  drawCard(doc, x, y, 42, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...color);
  doc.text(String(value), x + 21, y + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(label.toUpperCase(), x + 21, y + 18, { align: 'center' });
}

function drawSentimentBar(doc, x, y, w, bull, neutral, bear, total) {
  if (total === 0) return;
  const bullW = (bull / total) * w;
  const neutralW = (neutral / total) * w;
  const bearW = (bear / total) * w;
  const h = 5;

  doc.setFillColor(...COLORS.emerald);
  doc.roundedRect(x, y, bullW, h, 1, 1, 'F');
  doc.setFillColor(100, 116, 139);
  doc.rect(x + bullW, y, neutralW, h, 'F');
  doc.setFillColor(...COLORS.rose);
  doc.roundedRect(x + bullW + neutralW, y, bearW, h, 1, 1, 'F');
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 4.5) {
  const lines = doc.splitTextToSize(text || '', maxWidth);
  lines.forEach((line, i) => {
    if (y + i * lineHeight < 280) {
      doc.text(line, x, y + i * lineHeight);
    }
  });
  return y + lines.length * lineHeight;
}

// ─── War Room PDF ─────────────────────────────────────────

export function generateWarRoomPDF(debate) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = 180; // page width minus margins

  // Page background
  doc.setFillColor(...COLORS.darkBg);
  doc.rect(0, 0, 210, 297, 'F');
  drawGradientHeader(doc);

  // Report title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.text('War Room Analysis Report', 15, 38);

  let curY = 52;

  // Trigger / Topic
  if (debate.trigger) {
    drawCard(doc, 15, curY, pw, 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.cyan);
    doc.text('DEBATE TOPIC', 20, curY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textPrimary);
    const lines = doc.splitTextToSize(debate.trigger, pw - 12);
    doc.text(lines[0] || '', 20, curY + 12);
    curY += 20;
  }

  // Meta row
  drawCard(doc, 15, curY, pw, 14);
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textSecondary);
  const metaItems = [
    `Status: ${debate.status || 'N/A'}`,
    `Impact: ${debate.marketImpactRating || 'N/A'}/10`,
    `Agents: ${debate.messages?.length || 0}`,
    `Created: ${debate.createdAt ? new Date(debate.createdAt).toLocaleDateString() : 'N/A'}`,
  ];
  metaItems.forEach((item, i) => {
    doc.text(item, 20 + i * 45, curY + 9);
  });
  curY += 20;

  // Consensus Report
  if (debate.consensusReport) {
    const cr = debate.consensusReport;
    drawCard(doc, 15, curY, pw, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.violet);
    doc.text('CONSENSUS SUMMARY', 20, curY + 6);
    curY += 12;

    if (cr.summary) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textPrimary);
      curY = addWrappedText(doc, cr.summary, 20, curY, pw - 10, 4);
      curY += 4;
    }

    if (cr.keyPoints?.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.cyan);
      doc.text('KEY POINTS', 20, curY);
      curY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textSecondary);
      cr.keyPoints.forEach(pt => {
        if (curY > 270) {
          drawFooter(doc, doc.getNumberOfPages(), '?');
          doc.addPage();
          doc.setFillColor(...COLORS.darkBg);
          doc.rect(0, 0, 210, 297, 'F');
          curY = 20;
        }
        doc.text(`•  ${pt}`, 22, curY);
        curY += 4.5;
      });
      curY += 3;
    }
  }

  // Agent Messages
  if (debate.messages?.length) {
    if (curY > 240) {
      drawFooter(doc, doc.getNumberOfPages(), '?');
      doc.addPage();
      doc.setFillColor(...COLORS.darkBg);
      doc.rect(0, 0, 210, 297, 'F');
      curY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.amber);
    doc.text('AGENT PERSPECTIVES', 20, curY);
    curY += 7;

    debate.messages.forEach((msg, idx) => {
      if (curY > 255) {
        drawFooter(doc, doc.getNumberOfPages(), '?');
        doc.addPage();
        doc.setFillColor(...COLORS.darkBg);
        doc.rect(0, 0, 210, 297, 'F');
        curY = 20;
      }

      // Agent header
      const agentColor = idx % 2 === 0 ? COLORS.cyan : COLORS.violet;
      doc.setFillColor(agentColor[0], agentColor[1], agentColor[2]);
      doc.roundedRect(15, curY, 3, 3, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...agentColor);
      doc.text(msg.agentName || `Agent ${idx + 1}`, 21, curY + 3);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(msg.role || '', 60, curY + 3);
      curY += 6;

      // Content
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.textSecondary);
      const content = (msg.content || '').slice(0, 600);
      curY = addWrappedText(doc, content, 21, curY, pw - 12, 3.8);
      curY += 5;
    });
  }

  // Fix page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  doc.save(`vantage-warroom-${debate._id || Date.now()}.pdf`);
}

// ─── Simulation PDF ─────────────────────────────────────────

export function generateSimulationPDF(simulation) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = 180;

  doc.setFillColor(...COLORS.darkBg);
  doc.rect(0, 0, 210, 297, 'F');
  drawGradientHeader(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.text('Simulation Analysis Report', 15, 38);

  let curY = 52;

  // KPI Row
  const report = simulation.report || {};
  const filters = simulation.filters || {};
  drawKPI(doc, 15, curY, 'Articles', simulation.itemsAnalyzed || 0, COLORS.cyan);
  drawKPI(doc, 60, curY, 'Confidence', report.overallConfidence ? `${report.overallConfidence}%` : '—', COLORS.emerald);
  drawKPI(doc, 105, curY, 'Risk Level', report.riskLevel || '—', COLORS.rose);
  drawKPI(doc, 150, curY, 'Horizon', filters.timeHorizon?.split(' ')[0] || '—', COLORS.violet);
  curY += 28;

  // Filters
  drawCard(doc, 15, curY, pw, 12);
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(`Bias: ${filters.marketBias || 'N/A'}   |   Sector: ${filters.sectorFocus || 'N/A'}   |   Horizon: ${filters.timeHorizon || 'N/A'}   |   Country: ${filters.countryFocus || 'GCC'}`, 20, curY + 8);
  curY += 18;

  // Executive Conclusion
  if (report.executiveConclusion) {
    drawCard(doc, 15, curY, pw, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.emerald);
    doc.text('EXECUTIVE CONCLUSION', 20, curY + 6);
    curY += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textPrimary);
    curY = addWrappedText(doc, report.executiveConclusion, 20, curY, pw - 10, 4.2);
    curY += 6;
  }

  // Key Points
  if (report.keyPoints?.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.cyan);
    doc.text('KEY INSIGHTS', 20, curY);
    curY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textSecondary);
    report.keyPoints.forEach(pt => {
      if (curY > 270) {
        drawFooter(doc, doc.getNumberOfPages(), '?');
        doc.addPage();
        doc.setFillColor(...COLORS.darkBg);
        doc.rect(0, 0, 210, 297, 'F');
        curY = 20;
      }
      curY = addWrappedText(doc, `•  ${pt}`, 22, curY, pw - 14, 3.8);
      curY += 2;
    });
    curY += 4;
  }

  // Sector Analysis
  if (report.sectorAnalysis?.length) {
    if (curY > 250) {
      drawFooter(doc, doc.getNumberOfPages(), '?');
      doc.addPage();
      doc.setFillColor(...COLORS.darkBg);
      doc.rect(0, 0, 210, 297, 'F');
      curY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.violet);
    doc.text('SECTOR BREAKDOWN', 20, curY);
    curY += 6;

    report.sectorAnalysis.forEach(sec => {
      if (curY > 270) {
        drawFooter(doc, doc.getNumberOfPages(), '?');
        doc.addPage();
        doc.setFillColor(...COLORS.darkBg);
        doc.rect(0, 0, 210, 297, 'F');
        curY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.amber);
      doc.text(`▸ ${sec.sector || sec.name || 'Unknown'}`, 22, curY);
      curY += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.textSecondary);
      curY = addWrappedText(doc, sec.analysis || sec.outlook || '', 24, curY, pw - 18, 3.5);
      curY += 3;
    });
  }

  // Fix page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  doc.save(`vantage-simulation-${simulation._id || Date.now()}.pdf`);
}

// ─── News Report PDF ─────────────────────────────────────────

export function generateNewsReportPDF(stats, articles = []) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = 180;

  doc.setFillColor(...COLORS.darkBg);
  doc.rect(0, 0, 210, 297, 'F');
  drawGradientHeader(doc);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.text('Market Intelligence Report', 15, 38);

  let curY = 52;

  // KPIs
  drawKPI(doc, 15, curY, 'Total Articles', stats.total || 0, COLORS.cyan);
  drawKPI(doc, 60, curY, 'Bullish', stats.bull || 0, COLORS.emerald);
  drawKPI(doc, 105, curY, 'Bearish', stats.bear || 0, COLORS.rose);
  drawKPI(doc, 150, curY, 'Sources', stats.sources || 0, COLORS.violet);
  curY += 28;

  // Sentiment overview
  drawCard(doc, 15, curY, pw, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.cyan);
  doc.text('SENTIMENT DISTRIBUTION', 20, curY + 6);

  const avgS = stats.avgScore || 0;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(`Average Sentiment Score: ${avgS > 0 ? '+' : ''}${avgS.toFixed(2)}  —  Bias: ${avgS > 0.1 ? 'BULLISH' : avgS < -0.1 ? 'BEARISH' : 'NEUTRAL'}`, 20, curY + 11);

  drawSentimentBar(doc, 20, curY + 14, pw - 10, stats.bull || 0, stats.neutral || 0, stats.bear || 0, stats.total || 1);
  curY += 26;

  // Sector Distribution
  if (stats.topSectors?.length) {
    drawCard(doc, 15, curY, pw, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.violet);
    doc.text('SECTOR DISTRIBUTION', 20, curY + 6);
    curY += 12;

    const colW = 42;
    stats.topSectors.forEach((sec, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const sx = 20 + col * colW;
      const sy = curY + row * 7;
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.textPrimary);
      doc.text(sec.name, sx, sy);
      doc.setTextColor(...COLORS.cyan);
      doc.text(String(sec.count), sx + 35, sy, { align: 'right' });
    });
    curY += Math.ceil(stats.topSectors.length / 4) * 7 + 6;
  }

  // Article List
  if (articles.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.amber);
    doc.text('LATEST ARTICLES', 20, curY);
    curY += 6;

    articles.slice(0, 20).forEach((art, i) => {
      if (curY > 270) {
        drawFooter(doc, doc.getNumberOfPages(), '?');
        doc.addPage();
        doc.setFillColor(...COLORS.darkBg);
        doc.rect(0, 0, 210, 297, 'F');
        curY = 20;
      }

      // Sentiment dot
      const sentColor = art.sentimentScore > 0.15 ? COLORS.emerald : art.sentimentScore < -0.15 ? COLORS.rose : COLORS.textMuted;
      doc.setFillColor(...sentColor);
      doc.circle(19, curY - 1, 1.2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.textPrimary);
      const headline = (art.headline || '').slice(0, 80);
      doc.text(headline, 23, curY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(`${art.source || 'Unknown'} · ${art.sentimentScore != null ? (art.sentimentScore > 0 ? '+' : '') + art.sentimentScore.toFixed(1) : '—'}`, 23, curY + 3.5);
      curY += 8;
    });
  }

  // Fix page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  doc.save(`vantage-market-intel-${Date.now()}.pdf`);
}
