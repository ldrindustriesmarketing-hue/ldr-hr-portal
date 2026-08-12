'use client';

import { useRouter } from 'next/navigation';

export default function ViewAssessmentPage() {
  const router = useRouter();

  return (
    <div className="p-8 text-center">
      <h1>Feature Coming Soon</h1>
      <p>PDF download feature will be available soon.</p>
      <button 
        onClick={() => router.back()}
        className="mt-4 px-4 py-2 bg-orange-500 text-white rounded"
      >
        Go Back
      </button>
    </div>
  );
}   