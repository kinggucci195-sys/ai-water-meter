export function formatMilliliters(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} L`;
  }
  return `${value.toFixed(0)} mL`;
}

export function formatWh(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} kWh`;
  }
  return `${value.toFixed(1)} Wh`;
}

export function formatCarbon(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} kg CO2e`;
  }
  return `${value.toFixed(1)} g CO2e`;
}

export function formatTokens(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function toLocalYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
