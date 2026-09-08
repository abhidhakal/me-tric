/**
 * Date manipulation utilities for rollups, weeks, months, quarters, and years.
 */

export function getTodayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // Noon to prevent timezone drift
}

export function formatToIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateHeader(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

export function formatShortDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

export function getDayOfWeekName(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getDayShortName(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function shiftDate(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate);
  d.setDate(d.getDate() + days);
  return formatToIso(d);
}

export function isSameDay(iso1: string, iso2: string): boolean {
  return iso1 === iso2;
}

/**
 * ISO 8601 Week Number (Monday as start of week)
 */
export function getIsoWeekNumber(isoDate: string): number {
  const date = parseIsoDate(isoDate);
  const dayNum = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - dayNum);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getIsoWeekKey(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  const year = d.getFullYear();
  const week = getIsoWeekNumber(isoDate);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function getWeekRange(isoDate: string): { start: string; end: string; weekNum: number; weekKey: string } {
  const date = parseIsoDate(isoDate);
  const day = date.getDay();
  // Monday is day 1, Sunday is day 7
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = formatToIso(monday);
  const end = formatToIso(sunday);
  const weekNum = getIsoWeekNumber(isoDate);
  const weekKey = getIsoWeekKey(isoDate);

  return { start, end, weekNum, weekKey };
}

export function getMonthRange(isoDate: string): { start: string; end: string; monthName: string; monthKey: string; year: number } {
  const date = parseIsoDate(isoDate);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const monthName = firstDay.toLocaleDateString('en-US', { month: 'long' });
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  return {
    start: formatToIso(firstDay),
    end: formatToIso(lastDay),
    monthName,
    monthKey,
    year,
  };
}

export function getQuarterRange(isoDate: string): { start: string; end: string; quarter: number; quarterKey: string; year: number } {
  const date = parseIsoDate(isoDate);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const quarter = Math.floor(month / 3) + 1; // 1 to 4

  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 2;

  const firstDay = new Date(year, startMonth, 1);
  const lastDay = new Date(year, endMonth + 1, 0);

  return {
    start: formatToIso(firstDay),
    end: formatToIso(lastDay),
    quarter,
    quarterKey: `${year}-Q${quarter}`,
    year,
  };
}

export function getYearRange(isoDate: string): { start: string; end: string; year: number; yearKey: string } {
  const date = parseIsoDate(isoDate);
  const year = date.getFullYear();

  const firstDay = new Date(year, 0, 1);
  const lastDay = new Date(year, 11, 31);

  return {
    start: formatToIso(firstDay),
    end: formatToIso(lastDay),
    year,
    yearKey: String(year),
  };
}

export function getDaysList(startIso: string, endIso: string): string[] {
  const result: string[] = [];
  let current = startIso;
  while (current <= endIso) {
    result.push(current);
    current = shiftDate(current, 1);
  }
  return result;
}
