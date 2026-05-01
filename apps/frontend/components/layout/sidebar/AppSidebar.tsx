'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { useSidebarNav } from './useSidebarNav';

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
          <SidebarGroup key={group.labelKey || 'main'}>
            {group.labelKey && (
              <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                {t(group.labelKey)}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
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
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t p-4">
      </SidebarFooter>
    </Sidebar>
  );
}
