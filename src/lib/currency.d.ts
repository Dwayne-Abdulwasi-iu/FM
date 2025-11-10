declare module '@/lib/currency' {
  export function getConversionRate(from: string, to: string, signal?: AbortSignal): Promise<number>
  export function applyRate(amount: number, rate: number): number
}
