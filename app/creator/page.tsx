import { redirect } from 'next/navigation';

/** The claim dashboard moved into /creators. */
export default function CreatorPage() {
  redirect('/creators#claim');
}
