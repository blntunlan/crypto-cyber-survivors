/**
 * Metrics Module - Barrel Export
 *
 * Provides organized access to metrics subsystems:
 * - MetricsStorage: localStorage persistence
 * - MetricsCompiler: Raw data -> Report compilation
 * - MetricsExporter: JSON/CSV export
 * - MetricsAnalyzer: Insights and recommendations
 */

export { MetricsStorage } from './MetricsStorage';
export { MetricsCompiler, type PlayerFinalData, type BitcoinFinalData } from './MetricsCompiler';
export { MetricsExporter } from './MetricsExporter';
export { MetricsAnalyzer } from './MetricsAnalyzer';
