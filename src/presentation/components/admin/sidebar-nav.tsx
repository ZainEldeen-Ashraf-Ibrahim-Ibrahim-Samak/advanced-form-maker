"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard, FileText, Clock, ImageIcon,
  Users, Database, Settings, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubmissionsList } from "@/presentation/view-models/use-submissions-list";
import { useEffect } from "react";
import { LogoutButton } from "./logout-button";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  count?: number;
}

interface SidebarNavProps {
  userRole?: string;
}

export function SidebarNav({ userRole }: SidebarNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { counts, fetchSubmissions } = useSubmissionsList();

  useEffect(() => {
    fetchSubmissions(1, "all");

    const handleUpdate = () => fetchSubmissions(1, "all");
    window.addEventListener("submissions-updated", handleUpdate);
    return () => window.removeEventListener("submissions-updated", handleUpdate);
  }, [fetchSubmissions]);

  const navItems: NavItem[] = [
    {
      href: "/admin/dashboard",
      label: t("dashboard"),
      icon: LayoutDashboard,
      iconColor: "text-sky-400",
    },
    {
      href: "/admin/forms",
      label: t("forms"),
      icon: FileText,
      iconColor: "text-emerald-400",
    },
    {
      href: "/admin/submissions",
      label: t("submissions"),
      icon: Clock,
      iconColor: "text-amber-400",
      count: counts.pending,
    },
    {
      href: "/admin/media",
      label: t("media"),
      icon: ImageIcon,
      iconColor: "text-violet-400",
    },
  ];

  if (userRole === "admin") {
    navItems.push(
      {
        href: "/admin/team",
        label: t("team"),
        icon: Users,
        iconColor: "text-rose-400",
      },
      {
        href: "/admin/cache",
        label: t("cache"),
        icon: Database,
        iconColor: "text-teal-400",
      },
    );
  }

  navItems.push({
    href: "/admin/settings",
    label: t("settings"),
    icon: Settings,
    iconColor: "text-slate-400",
  });

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-sidebar-primary-foreground"
                    : cn(item.iconColor, "group-hover:opacity-100 opacity-80"),
                )}
              />
              <span className="truncate">{item.label}</span>
            </div>
            {item.count !== undefined && item.count > 0 && (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                  isActive
                    ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                    : "bg-amber-400/20 text-amber-300",
                )}
              >
                {item.count}
              </span>
            )}
          </Link>
        );
      })}

      <div className="pt-3 mt-3 border-t border-sidebar-border">
        <LogoutButton />
      </div>
    </nav>
  );
}
