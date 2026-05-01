'use client';

import { usePathname } from 'next/navigation';
import { sidebarNavigation, type NavGroup } from './sidebarNav.config';

export function useSidebarNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return {
    navigation: sidebarNavigation as NavGroup[],
    pathname,
    isActive,
  };
}
