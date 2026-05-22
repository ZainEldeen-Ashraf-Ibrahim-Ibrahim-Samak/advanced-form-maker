"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  variant?: "ghost" | "outline" | "default";
  showLabel?: boolean;
  className?: string;
}

export function LogoutButton({ variant = "ghost", showLabel = true, className }: LogoutButtonProps) {
  const t = useTranslations("nav");
  const locale = useLocale();

  const handleLogout = async () => {
    // Client-side signOut is typically more reliable for UI triggers
    await signOut({ 
      callbackUrl: `/${locale}/admin/login`,
      redirect: true 
    });
  };

  if (!showLabel) {
    return (
      <Button 
        variant={variant} 
        size="icon" 
        className="h-9 w-9 text-red-500" 
        onClick={handleLogout}
        title={t("logout")}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button 
      variant={variant} 
      className={cn(
        "flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        "text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20",
        className
      )}
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      {t("logout")}
    </Button>
  );
}
