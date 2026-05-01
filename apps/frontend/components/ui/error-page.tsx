'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from './button';
import { AlertCircle, Home, ArrowLeft, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorPageProps extends React.HTMLAttributes<HTMLDivElement> {
  code: 403 | 404 | 500 | 503;
  title?: string;
  description?: string;
  reset?: () => void;
}

export function ErrorPage({
  code,
  title,
  description,
  reset,
  className,
  ...props
}: ErrorPageProps) {
  const t = useTranslations('common.errors');
  const router = useRouter();

  const getIcon = () => {
    switch (code) {
      case 500:
      case 503:
        return <RefreshCcw className="h-6 w-6 text-destructive" />;
      default:
        return <AlertCircle className="h-6 w-6 text-warning" />;
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-[80vh] flex-col items-center justify-center p-6 text-center',
        className
      )}
      {...props}
    >
      <div className="flex max-w-md flex-col items-center gap-6">
        {/* Error Code Bubble */}
        <div className="flex items-center justify-center rounded-2xl bg-muted px-4 py-1.5 text-sm font-medium">
          <span className="mr-2 flex h-2 w-2 rounded-full bg-primary" />
          Error {code}
        </div>

        {/* Text Content */}
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {title || t(`${code}.title`)}
          </h1>
          <p className="text-base text-muted-foreground mt-2">
            {description || t(`${code}.description`)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 w-full justify-center">
          <Button
            variant="default"
            size="lg"
            className="w-full sm:w-auto"
            asChild
          >
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              {t('backToHome')}
            </Link>
          </Button>

          {reset && (
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => reset()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t('tryAgain')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
