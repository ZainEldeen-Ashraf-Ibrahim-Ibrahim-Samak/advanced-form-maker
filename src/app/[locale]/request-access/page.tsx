import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/presentation/components/admin/logout-button";
import { LanguageSwitcher } from "@/presentation/components/shared/language-switcher";
import { ThemeToggle } from "@/presentation/components/shared/theme-toggle";

export default async function RequestAccessPage() {
  const session = await auth();
  const locale = await getLocale();

  // If not logged in, go to login
  if (!session?.user) {
    redirect({ href: "/admin/login", locale });
  }

  // If admin, go to admin dashboard
  if ((session?.user as { role?: string })?.role === "admin") {
    redirect({ href: "/admin", locale });
  }

  const t = await getTranslations("auth");
  const tc = await getTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="absolute top-4 inset-e-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                <path d="M12 8v4"/>
                <path d="M12 16h.01"/>
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t("accessDenied")}</CardTitle>
          <CardDescription className="text-base text-muted-foreground pt-2">
            {t("requestAccess")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 mt-4">
          <div className="bg-muted p-4 rounded-md text-sm text-center">
            {tc("loggedInAs")} <span className="font-semibold">{session?.user?.email}</span>
          </div>
          <LogoutButton variant="default" className="w-full mt-2" />
        </CardContent>
      </Card>
    </div>
  );
}
