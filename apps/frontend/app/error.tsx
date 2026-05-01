'use client';

import { useEffect } from 'react';
import { ErrorPage } from '@/components/ui/error-page';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  return <ErrorPage code={500} reset={reset} />;
}
