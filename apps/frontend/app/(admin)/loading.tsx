'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  const t = useTranslations('common.layout.loading');

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center">
        {/* Animated Glow effect for a premium feel */}
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse duration-2000" />
        
        {/* The Loader with a subtle drop shadow */}
        <div className="relative">
          <Loader2 className="w-12 h-12 text-primary animate-spin filter drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
        </div>
      </div>
      
      {/* Informative text with elegant typography */}
      <div className="flex flex-col items-center mt-10 space-y-2 text-center">
        <h3 className="text-xl font-semibold tracking-tight text-foreground/90 animate-in slide-in-from-bottom-2 duration-700 delay-150">
          {t('title')}
        </h3>
        <p className="max-w-xs text-sm text-muted-foreground/70 animate-in slide-in-from-bottom-2 duration-700 delay-300">
          {t('description')}
        </p>
      </div>

      {/* Decorative glassmorphism element at the bottom */}
      <div className="mt-16 w-48 h-1 overflow-hidden rounded-full bg-muted/30">
        <div className="h-full bg-primary/40 w-1/3 rounded-full animate-progress" />
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-progress {
          animation: progress 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
