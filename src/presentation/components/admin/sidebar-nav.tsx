"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LayoutDashboard, FileText, Clock, ImageIcon, Users, Database, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubmissionsList } from "@/presentation/view-models/use-submissions-list";
import { useEffect } from "react";
import { LogoutButton } from "./logout-button";

interface SidebarNavProps {
  userRole?: string;
}

export function SidebarNav({ userRole }: SidebarNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { counts, fetchSubmissions } = useSubmissionsList();

  const fetchCounts = async () => {
    try {
      const res = await fetch("/api/admin/submissions/counts");
      const json = await res.json();
      // Use the internal state setter from useSubmissionsList is not direct, 
      // but we can just trigger fetchSubmissions with current params to refresh everything
      // or just refresh the page data.
      // Better: we can just use the counts from the hook if we can trigger its re-fetch.
    } catch {}
  };

  useEffect(() => {
    // Initial fetch
    fetchSubmissions(1, "all"); // This triggers fetchCounts internally

    const handleUpdate = () => {
      fetchSubmissions(1, "all");
    };

    window.addEventListener("submissions-updated", handleUpdate);
    return () => window.removeEventListener("submissions-updated", handleUpdate);
  }, [fetchSubmissions]);

  const navItems = [
    { href: "/admin/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/admin/forms", label: t("forms"), icon: FileText },
    { href: "/admin/submissions", label: t("submissions"), icon: Clock, count: counts.pending },
    { href: "/admin/media", label: t("media"), icon: ImageIcon },
  ];

  if (userRole === "admin") {
    navItems.push(
      { href: "/admin/team", label: t("team"), icon: Users },
      { href: "/admin/cache", label: t("cache"), icon: Database }
    );
  }

  navItems.push({ href: "/admin/settings", label: t("settings"), icon: Settings });

  return (
    <nav className="flex-1 px-4 space-y-1 py-4">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all group",
              isActive 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground")} />
              <span>{item.label}</span>
            </div>
            {item.count !== undefined && item.count > 0 && (
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                isActive ? "bg-primary-foreground text-primary" : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
      <div className="pt-2 mt-2 border-t">
         <LogoutButton />
      </div>
    </nav>
  );
}
