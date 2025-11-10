declare module '@/lib/currency' {
  export function getConversionRate(from: string, to: string, signal?: AbortSignal): Promise<{ rate: number, provider: string }>
  export function applyRate(amount: number, rate: number): number
}
