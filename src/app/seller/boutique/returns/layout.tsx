import { Suspense, ReactNode } from 'react'

export const metadata = {
  title: 'Returns | Seller Dashboard',
  description: 'Manage your product returns and refunds',
}

export default function ReturnsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      {children}
    </Suspense>
  )
}
