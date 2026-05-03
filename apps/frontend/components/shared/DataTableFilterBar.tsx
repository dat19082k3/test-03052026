import React from 'react';
import { cn } from '@/lib/utils';

export interface DataTableFilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function DataTableFilterBar({ children, className, ...props }: DataTableFilterBarProps) {
  return (
    <div 
      className={cn(
        "flex flex-col sm:flex-row items-center gap-3 bg-background p-1 mb-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
