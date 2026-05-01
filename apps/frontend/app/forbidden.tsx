import { ErrorPage } from '@/components/ui/error-page';

export default function Forbidden() {
  return <ErrorPage code={403} />;
}
