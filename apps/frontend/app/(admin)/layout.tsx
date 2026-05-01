import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar, AppHeader, AppFooter } from '@/components/layout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
        <AppFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
