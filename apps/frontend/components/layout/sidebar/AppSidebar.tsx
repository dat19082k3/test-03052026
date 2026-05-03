'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useSidebarNav } from './useSidebarNav';
import { NavGroup } from './NavGroup';

export function AppSidebar() {
  const { navigation, isActive } = useSidebarNav();
  const t = useTranslations('common');

  return (
    <Sidebar collapsible="icon" className="border-r" variant="inset">
      {/* Logo / Brand */}
      <SidebarHeader className="border-b px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            {t('layout.brand')}
          </span>
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-2">
        {navigation.map((group) => (
          <NavGroup 
            key={group.labelKey || 'main'} 
            group={group} 
            isActive={isActive} 
          />
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t p-4">
      </SidebarFooter>
    </Sidebar>
  );
}
