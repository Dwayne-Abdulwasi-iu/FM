import { Suspense } from 'react'
import OrderTrackingContent from './order-tracking-content'

function LoadingFallback() {
  return <div className="p-8 text-center">Loading tracking information...</div>
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OrderTrackingContent />
    </Suspense>
  )
}
