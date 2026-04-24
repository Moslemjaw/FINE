import React from 'react';
import { FileText, Download } from 'lucide-react';
import { generateWarRoomPDF, generateSimulationPDF, generateNewsReportPDF } from '../utils/pdfGenerator.js';

/**
 * Generates a downloadable PDF report for War Room, Simulation, or News data.
 */
export function ReportDownloader({ type = 'warroom', data, sessionId, stats, articles }) {
  function downloadPDF() {
    if (!data && !stats) return;
    switch (type) {
      case 'warroom':
        generateWarRoomPDF(data);
        break;
      case 'simulation':
        generateSimulationPDF(data);
        break;
      case 'news':
        generateNewsReportPDF(stats, articles);
        break;
      default:
        generateWarRoomPDF(data);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={downloadPDF}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 text-xs text-cyan-400 hover:from-cyan-500/20 hover:to-violet-500/20 hover:text-white transition-all"
      >
        <Download size={12} />Export PDF
      </button>
    </div>
  );
}
