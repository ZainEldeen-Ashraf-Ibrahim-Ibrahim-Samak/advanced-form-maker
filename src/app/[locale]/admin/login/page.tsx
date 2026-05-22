"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LanguageSwitcher } from "@/presentation/components/shared/language-switcher";
import { ThemeToggle } from "@/presentation/components/shared/theme-toggle";
import { Loader2 } from "lucide-react";
import EmailRegix from "@/components/validation/EmailRegix";
import { EMAIL_REGEX } from "@/constants/constants";
import { Logo } from "@/presentation/components/shared/logo";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (email && !EMAIL_REGEX.test(email)) {
      setError(t("loginError"));
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "AccessDenied" || result.error.includes("AccessDenied")) {
          setError(t("userAccessDenied"));
        } else {
          setError(t("loginError"));
        }
      } else {
        router.push("/admin/dashboard");
      }
    } catch {
      setError(t("loginError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-background via-background to-muted/30 p-4">
      <div className="absolute top-4 inset-e-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          {/* SCCT Logo for branding (visible on login screen) */}
          <div className="flex justify-center mb-2">
            {/* If you want to hide the logo, comment out the next line. */}
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold">{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@scct.local"
                required
                autoComplete="email"
                disabled={isLoading}
              />
              <EmailRegix email={email} showTypoSuggestions={false} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("loginButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
