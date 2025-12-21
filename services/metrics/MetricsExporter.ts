/**
 * MetricsExporter - Export metrics in various formats
 *
 * Handles JSON and CSV export of session metrics.
 */

import { type SessionMetrics, type MetricsExport } from '../../types/metrics';

const METRICS_VERSION = '1.0.0';

export class MetricsExporter {
  /**
   * Export sessions as JSON string
   */
  static toJSON(sessions: SessionMetrics[]): string {
    const exportData: MetricsExport = {
      version: METRICS_VERSION,
      exportDate: new Date().toISOString(),
      totalSessions: sessions.length,
      sessions: sessions,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export sessions as CSV string (summary format)
   */
  static toCSV(sessions: SessionMetrics[]): string {
    const headers = [
      'Session ID',
      'Date',
      'Position',
      'Survival Time (s)',
      'Max Level',
      'Total Kills',
      'Entry Price',
      'Exit Price',
      'PnL at Death (%)',
      'Avg Difficulty',
      'Max Difficulty',
      'Max Streak',
      'Cards Picked',
    ];

    const rows = sessions.map(s => [
      s.sessionId,
      new Date(s.sessionTimestamp).toISOString(),
      s.bitcoin.positionChosen,
      Math.round(s.player.survivalTimeMs / 1000),
      s.player.maxLevel,
      s.player.totalKills,
      s.bitcoin.priceAtStart.toFixed(2),
      s.bitcoin.priceAtEnd.toFixed(2),
      (s.bitcoin.pnlAtDeath * 100).toFixed(2),
      s.difficulty.averageDifficulty.toFixed(2),
      s.difficulty.maxDifficulty.toFixed(2),
      s.combo.maxStreak,
      s.card.levelUpCount,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Download JSON file in browser
   */
  static downloadJSON(sessions: SessionMetrics[], filename: string = 'game_metrics.json'): void {
    const json = this.toJSON(sessions);
    this.downloadFile(json, filename, 'application/json');
  }

  /**
   * Download CSV file in browser
   */
  static downloadCSV(sessions: SessionMetrics[], filename: string = 'game_metrics.csv'): void {
    const csv = this.toCSV(sessions);
    this.downloadFile(csv, filename, 'text/csv');
  }

  /**
   * Helper to trigger file download
   */
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
