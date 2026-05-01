'use client';

import { Search, Sun, Moon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useHeaderActions } from './useHeaderActions';
import { LocaleSwitcher } from './LocaleSwitcher';

export function AppHeader() {
  const { searchQuery, handleSearch } = useHeaderActions();
  const t = useTranslations('common.layout');
  const { theme, setTheme } = useTheme();

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t('themeToggle')}</span>
        </Button>

        {/* Language Switcher */}
        <LocaleSwitcher />
      </div>
    </header>
  );
}
