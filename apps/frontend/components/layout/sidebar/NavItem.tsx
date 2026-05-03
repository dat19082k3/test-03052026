'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import type { NavItem as NavItemType } from './sidebarNav.config';

interface NavItemProps {
  item: NavItemType;
  isActive: boolean;
}

export function NavItem({ item, isActive }: NavItemProps) {
  const t = useTranslations('common');

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={t(item.titleKey)}
      >
        <Link href={item.href}>
          <item.icon className="h-4 w-4" />
          <span>{t(item.titleKey)}</span>
          {item.badge !== undefined && (
            <Badge
              variant="secondary"
              className="ml-auto h-5 min-w-5 justify-center rounded-full text-xs"
            >
              {item.badge}
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
