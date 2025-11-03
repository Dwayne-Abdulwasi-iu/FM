export function sanitizePlaceholderImageUrl(url?: string | null): string {
  if (!url || url.trim() === '') return '/images/placeholder-design.svg'
  // Replace any legacy uploads/placeholder-design-*.jpg with our svg
  if (/\/uploads\/placeholder-design-\d+\.jpg$/i.test(url)) {
    return '/images/placeholder-design.svg'
  }
  return url
}
