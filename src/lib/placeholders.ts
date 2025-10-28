// SVG placeholder generator for fashion designs
export function generatePlaceholderSVG(width: number, height: number, text: string = 'Fashion Design'): string {
  return `data:image/svg+xml;charset=UTF-8,%3Csvg width='${width}' height='${height}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='${width}' height='${height}' fill='%23f3f4f6'/%3E%3Crect x='${width/4}' y='${height/4}' width='${width/2}' height='${height/2}' fill='%23e5e7eb' rx='8'/%3E%3Ctext x='${width/2}' y='${height/2 + 6}' text-anchor='middle' font-family='Arial, sans-serif' font-size='${Math.min(width, height) / 20}' fill='%236b7280'%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`
}

export function generateDesignPlaceholder(width: number, height: number): string {
  return `data:image/svg+xml;charset=UTF-8,%3Csvg width='${width}' height='${height}' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='${width}' height='${height}' fill='%23f8fafc'/%3E%3Cg transform='translate(${width/2 - 30}, ${height/2 - 30})'%3E%3Crect width='60' height='60' fill='%23e2e8f0' rx='8'/%3E%3Cpath d='M20 20h20v20h-20z' fill='%23cbd5e1'/%3E%3Cpath d='M15 35l10-10 10 5 10-5v15H15z' fill='%239ca3af'/%3E%3C/g%3E%3Ctext x='${width/2}' y='${height/2 + 50}' text-anchor='middle' font-family='Arial, sans-serif' font-size='14' fill='%236b7280'%3EFashion Design%3C/text%3E%3C/svg%3E`
}