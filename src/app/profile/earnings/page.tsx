import { redirect } from 'next/navigation'

// Simple server-side redirect so older/permalinked routes to /profile/earnings
// continue to work and open the Earnings tab on the profile page.
export default function Page() {
  redirect('/profile?tab=Earnings')
}
