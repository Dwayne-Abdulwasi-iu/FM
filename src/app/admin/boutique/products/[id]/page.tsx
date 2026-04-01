import { redirect } from 'next/navigation';

// Redirect legacy /admin/boutique/products/[id] URLs
// (e.g. from old email notifications) to the correct route.
export default async function AdminBoutiqueProductRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/boutique/product-details/${id}`);
}
