export const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';

const saoPauloFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAO_PAULO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function getSaoPauloDateString(date = new Date()): string {
  const parts = saoPauloFormatter.formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  const day = parts.find(part => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export function dateToLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function dateStringToLocalNoon(dateValue: string): Date {
  const [year, month, day] = dateValue.split('-').map(Number);

  return new Date(year, month - 1, day, 12);
}

export function addDaysToDateString(dateValue: string, days: number): string {
  const date = dateStringToLocalNoon(dateValue);
  date.setDate(date.getDate() + days);

  return dateToLocalDateString(date);
}

export function startOfMonthDateString(dateValue: string): string {
  const [year, month] = dateValue.split('-').map(Number);

  return dateToLocalDateString(new Date(year, month - 1, 1, 12));
}

export function endOfMonthDateString(dateValue: string): string {
  const [year, month] = dateValue.split('-').map(Number);

  return dateToLocalDateString(new Date(year, month, 0, 12));
}

export function startOfWeekDateString(dateValue: string): string {
  const date = dateStringToLocalNoon(dateValue);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return dateToLocalDateString(date);
}

export function endOfWeekDateString(dateValue: string): string {
  return addDaysToDateString(startOfWeekDateString(dateValue), 6);
}
