import { Suspense } from 'react'
import ShopPhysicalContent from './shop-physical-content'

function LoadingFallback() {
  return <div className="p-8 text-center">Loading products...</div>
}

export default function ShopPhysicalPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ShopPhysicalContent />
    </Suspense>
  )
}
