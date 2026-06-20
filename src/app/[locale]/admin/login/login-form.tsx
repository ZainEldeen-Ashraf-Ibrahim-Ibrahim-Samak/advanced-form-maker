"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/presentation/components/shared/language-switcher";
import { ThemeToggle } from "@/presentation/components/shared/theme-toggle";
import { Loader2, ShieldCheck } from "lucide-react";
import EmailRegix from "@/components/validation/EmailRegix";
import { EMAIL_REGEX } from "@/constants/constants";
import { Logo } from "@/presentation/components/shared/logo";
import Image from "next/image";

interface LoginFormProps {
  logoUrl: string;
  siteName: string;
}

export function LoginForm({ logoUrl, siteName }: LoginFormProps) {
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
    <div className="flex min-h-screen">
      {/* ── Left brand panel (desktop only) ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[58%] relative overflow-hidden"
        style={{ background: "var(--sidebar)" }}
      >
        {/* Dot-grid decorative pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(1 0 0 / 0.14) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Floating accent shapes */}
        <div
          className="absolute -bottom-24 -start-24 h-96 w-96 rounded-full opacity-10"
          style={{ background: "oklch(0.74 0.12 35)" }}
        />
        <div
          className="absolute top-1/3 -end-16 h-64 w-64 rounded-full opacity-10"
          style={{ background: "oklch(0.67 0.13 243)" }}
        />

        {/* Top: logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <Image
              src={logoUrl || "/favicon.ico"}
              alt={`${siteName} logo`}
              width={36}
              height={36}
              className="object-contain shrink-0"
              unoptimized={!!logoUrl}
            />
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: "var(--sidebar-foreground)" }}
            >
              {siteName}
            </span>
          </div>
        </div>

        {/* Center: headline */}
        <div className="relative z-10 px-10 pb-4 space-y-5">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              background: "oklch(0.74 0.12 35 / 0.18)",
              color: "oklch(0.74 0.12 35)",
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("adminPortalBadge")}
          </div>

          <h1
            className="text-4xl font-bold leading-tight"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            {t("loginTitle")}
          </h1>

          <p
            className="text-base max-w-sm leading-relaxed"
            style={{ color: "oklch(0.938 0.008 243 / 0.65)" }}
          >
            {t("loginSubtitle")}
          </p>
        </div>

        {/* Bottom: footer */}
        <div className="relative z-10 p-10">
          <p
            className="text-xs"
            style={{ color: "oklch(0.938 0.008 243 / 0.35)" }}
          >
            © {new Date().getFullYear()} {siteName}
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Top bar: controls */}
        <div className="flex items-center justify-end gap-2 px-6 py-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        {/* Form area */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
          {/* Logo — mobile only */}
          <div className="lg:hidden mb-8">
            <Logo logoUrl={logoUrl} siteName={siteName} />
          </div>

          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground">
                {t("loginTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("loginSubtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t("email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  className="h-11"
                />
                <EmailRegix email={email} showTypoSuggestions={false} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t("password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("loginButton")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
