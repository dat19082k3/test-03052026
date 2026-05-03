'use client';

import { usePathname } from 'next/navigation';
import { Search, Sun, Moon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useHeaderActions } from './useHeaderActions';
import { LocaleSwitcher } from './LocaleSwitcher';
import { sidebarNavigation } from '../sidebar/sidebarNav.config';

export function AppHeader() {
  const { searchQuery, handleSearch } = useHeaderActions();
  const t = useTranslations('common');
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  // Find the exact active item and its group
  let activeItem: any = null;
  let activeGroup: any = null;

  for (const group of sidebarNavigation) {
    const item = group.items.find(
      (item) => item.href !== '/' && pathname.startsWith(item.href)
    );
    if (item) {
      activeItem = item;
      activeGroup = group;
      break;
    }
  }

  // Fallback to home if none matches or on the root path
  if (!activeItem && pathname === '/') {
    activeItem = sidebarNavigation[0]?.items[0];
    activeGroup = sidebarNavigation[0];
  }


  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      {activeItem && (
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            {activeGroup?.labelKey && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-muted-foreground">
                    {t(activeGroup.labelKey)}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{activeItem?.titleKey && t(activeItem.titleKey)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t('layout.themeToggle')}</span>
        </Button>

        {/* Language Switcher */}
        <LocaleSwitcher />
      </div>
    </header>
  );
}
