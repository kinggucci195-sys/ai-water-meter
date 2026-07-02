export function formatMilliliters(value: number): string {
  if (value >= 1000) {
    return `${formatNumber(value / 1000, 2)} L`;
  }

  if (value < 0.1 && value > 0) {
    return `${formatNumber(value, 3)} mL`;
  }

  return `${formatNumber(value, 1)} mL`;
}

export function formatWh(value: number): string {
  return value >= 1000 ? `${formatNumber(value / 1000, 2)} kWh` : `${formatNumber(value, 2)} Wh`;
}

export function formatCarbon(value: number): string {
  return value >= 1000
    ? `${formatNumber(value / 1000, 2)} kg CO2e`
    : `${formatNumber(value, 2)} g CO2e`;
}

function formatNumber(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: value < 10 && value > 0 ? Math.min(1, maximumFractionDigits) : 0
  }).format(value);
}
