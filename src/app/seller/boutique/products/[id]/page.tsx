import { redirect } from 'next/navigation';

// Redirect legacy /seller/boutique/products/[id] URLs
// (e.g. from old email notifications) to the correct route.
export default async function SellerBoutiqueProductRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/seller/boutique/product-details/${id}`);
}
