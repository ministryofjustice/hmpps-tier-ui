export default function heat(allValues: Record<string, number>, key: string): number {
  const maxValue = Math.max(...Object.values(allValues))
  const percentage = (allValues[key] / maxValue) * 100
  if (Math.ceil(percentage) < 10) {
    return 10
  }
  return Math.ceil(percentage / 10) * 10
}
