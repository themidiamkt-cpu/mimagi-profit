export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return `${formatNumber(value, 1)}%`;
};

export const formatDate = (date: string | Date | null): string => {
  if (!date) return '-';

  let d: Date;
  if (typeof date === 'string') {
    if (date.includes('-')) {
      const [year, month, day] = date.split('T')[0].split('-').map(Number);
      d = new Date(year, month - 1, day);
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }

  try {
    return new Intl.DateTimeFormat('pt-BR').format(d);
  } catch (e) {
    return '-';
  }
};
