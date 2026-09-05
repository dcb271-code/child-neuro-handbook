import { redirect } from 'next/navigation';

// Progress tracking moved into /board-review (tucked under "My Progress").
// Redirect rather than 404 in case this URL got bookmarked or shared.
export default function ProgressPage() {
  redirect('/board-review/');
}
