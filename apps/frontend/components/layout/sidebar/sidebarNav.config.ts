import {
  LayoutDashboard,
  Package,
  Warehouse,
  FileText,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  titleKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

export const sidebarNavigation: NavGroup[] = [
  {
    labelKey: '',
    items: [
      { titleKey: 'layout.nav.home', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    labelKey: 'layout.nav.inventory',
    items: [
      { titleKey: 'layout.nav.vouchers', href: '/inventory/vouchers', icon: FileText },
      { titleKey: 'layout.nav.warehouses', href: '/inventory/warehouses', icon: Warehouse },
      { titleKey: 'layout.nav.items', href: '/inventory/items', icon: Package },
    ],
  },
];
