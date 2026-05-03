'use client';

import { useTranslations } from 'next-intl';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
} from '@/components/ui/sidebar';
import type { NavGroup as NavGroupType } from './sidebarNav.config';
import { NavItem } from './NavItem';

interface NavGroupProps {
  group: NavGroupType;
  isActive: (href: string) => boolean;
}

export function NavGroup({ group, isActive }: NavGroupProps) {
  const t = useTranslations('common');

  return (
    <SidebarGroup>
      {group.labelKey && (
        <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          {t(group.labelKey)}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => (
            <NavItem 
              key={item.href} 
              item={item} 
              isActive={isActive(item.href)} 
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
