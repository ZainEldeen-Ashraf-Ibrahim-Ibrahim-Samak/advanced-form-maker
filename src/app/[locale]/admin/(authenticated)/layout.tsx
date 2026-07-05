import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/presentation/components/shared/language-switcher";
import { ThemeToggle } from "@/presentation/components/shared/theme-toggle";
import { Logo } from "@/presentation/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Menu, Plus } from "lucide-react";
import { LiveNotifications } from "@/presentation/components/admin/live-notifications";
import { SidebarNav } from "@/presentation/components/admin/sidebar-nav";
import { LogoutButton } from "@/presentation/components/admin/logout-button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getSiteBranding } from "@/components/shared/site-name";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();
  const branding = await getSiteBranding();
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) {
    redirect({ href: "/admin/login", locale });
    return null;
  }

  // If a regular user tries to access admin pages, redirect them to request access
  if (userRole === "user") {
    redirect({ href: "/request-access", locale });
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground shrink-0">
        {/* Brand area */}
        <div className="px-5 py-6 border-b border-sidebar-border">
          <Logo
            className="mb-3 hover:opacity-85 transition-opacity text-sidebar-foreground"
            logoUrl={branding.siteLogoUrl}
            siteName={branding.siteName}
          />
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-xs text-sidebar-foreground/60 truncate" title={session.user.name || ""}>
              {session.user.name}
            </p>
          </div>
        </div>

        <SidebarNav userRole={userRole} />

        <div className="px-4 py-4 border-t border-sidebar-border mt-auto">
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex md:hidden items-center justify-between bg-sidebar text-sidebar-foreground px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger
                nativeButton={true}
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Open menu" className="text-sidebar-foreground hover:bg-sidebar-accent" />
                }
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side={locale === "ar" ? "right" : "left"} className="w-72 p-0 flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border">
                <div className="px-5 py-6 border-b border-sidebar-border">
                  <Logo
                    className="mb-2 text-sidebar-foreground"
                    logoUrl={branding.siteLogoUrl}
                    siteName={branding.siteName}
                  />
                  <p className="text-xs text-sidebar-foreground/60 truncate" title={session.user.name || ""}>
                    {session.user.name}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SidebarNav userRole={userRole} />
                </div>
              </SheetContent>
            </Sheet>
            <Logo
              className="scale-90 transform origin-left rtl:origin-right text-sidebar-foreground"
              logoUrl={branding.siteLogoUrl}
              siteName={branding.siteName}
            />
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <LogoutButton showLabel={false} />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex justify-end mb-4">
            <a
              href={branding.addFormButtonLink}
              target={branding.addFormButtonLink.startsWith("http") ? "_blank" : undefined}
              rel={branding.addFormButtonLink.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                {branding.addFormButtonLabel}
              </Button>
            </a>
          </div>
          <LiveNotifications />
          {children}
        </main>
      </div>
    </div>
  );
}
