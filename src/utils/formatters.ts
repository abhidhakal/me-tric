import { Metric } from '../types';

/**
 * Formats minutes into human-readable duration like "4h 20m", "45m", or "0m"
 */
export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded <= 0) return '0m';
  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m`;
  } else if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}m`;
}

/**
 * Formats numbers into currency string: e.g. "Rs. 850", "Rs. 100,000"
 */
export function formatCurrency(amount: number, symbol: string = 'Rs.'): string {
  const formatted = new Intl.NumberFormat('en-US').format(Math.round(amount));
  return `${symbol} ${formatted}`;
}

/**
 * Formats general numbers with commas: e.g. "1,400"
 */
export function formatNumber(num: number, unit?: string): string {
  const formatted = new Intl.NumberFormat('en-US').format(num);
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Universal formatter based on metric definition
 */
export function formatMetricValue(value: number, metric: Metric, currencySymbol: string = 'Rs.'): string {
  switch (metric.type) {
    case 'duration':
      return formatDuration(value);
    case 'currency':
      return formatCurrency(value, currencySymbol);
    case 'boolean':
      return value > 0 ? 'Yes' : 'No';
    case 'rating':
      return `${value} / 10`;
    case 'number':
    default:
      return formatNumber(value, metric.unit);
  }
}

/**
 * Parses user quick-input for durations:
 * Supports:
 * - "2h 30m" -> 150
 * - "2.5h"   -> 150
 * - "45m"    -> 45
 * - "2h"     -> 120
 * - "90"     -> 90 (assumes minutes)
 */
export function parseDurationInput(raw: string): number {
  const text = raw.trim().toLowerCase();
  if (!text) return 0;

  // Check if it has hours and minutes: e.g. "2h 30m" or "2h30m"
  const comboMatch = text.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(\d+)?\s*m(?:in(?:ute)?s?)?$/i);
  if (comboMatch) {
    const hours = parseFloat(comboMatch[1]) || 0;
    const mins = parseFloat(comboMatch[2]) || 0;
    return Math.round(hours * 60 + mins);
  }

  // Check if it has just hours: e.g. "2.5h" or "3h"
  const hoursMatch = text.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/i);
  if (hoursMatch) {
    return Math.round(parseFloat(hoursMatch[1]) * 60);
  }

  // Check if it has just minutes: e.g. "45m" or "45 mins"
  const minsMatch = text.match(/^(\d+)\s*m(?:in(?:ute)?s?)?$/i);
  if (minsMatch) {
    return parseInt(minsMatch[1], 10);
  }

  // If pure number: default to minutes
  const pureNum = parseFloat(text);
  if (!isNaN(pureNum)) {
    return Math.round(pureNum);
  }

  return 0;
}
