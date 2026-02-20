// Catch dynamic search/advanced routes
// Prevents Next.js from trying to pre-render undefined dynamic segments

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export { default } from '@/app/search/advanced/page';
