import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { ThemeProvider } from "@/presentation/providers/theme-provider";
import { AuthProvider } from "@/presentation/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { getSiteBranding } from "@/components/shared/site-name";
import "@/app/globals.css";
import { env } from "@/env.mjs";

const displayFont = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const bodyFont = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const branding = await getSiteBranding();

  return {
    metadataBase: env.NEXT_PUBLIC_APP_URL ? new URL(env.NEXT_PUBLIC_APP_URL) : undefined,
    title: t("title", { siteName: branding.siteName }),
    description: t("description"),
    keywords: ["SCCT", "Damages", "Data Collection", "Bilingual", "Dashboard"],
    authors: [{ name: "SCCT Team" }],
    creator: "SCCT Team",
    publisher: "SCCT Team",
    icons: {
      icon: branding.siteLogoUrl || "/favicon.ico",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: t("ogTitle", { siteName: branding.siteName }),
      description: t("ogDescription"),
      url: env.NEXT_PUBLIC_APP_URL,
      siteName: branding.siteName,
      locale: locale === "ar" ? "ar_EG" : "en_US",
      type: "website",
    },
    verification: env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
    alternates: {
      canonical: "/",
      languages: {
        en: "/en",
        ar: "/ar",
      },
    },
    category: "Business",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={`${displayFont.variable} ${bodyFont.variable} ${geistMono.variable}`}>
      <body
        className="min-h-screen bg-background font-sans antialiased overflow-x-hidden [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)]"
        suppressHydrationWarning
      >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NextIntlClientProvider messages={messages} locale={locale}>
              <AuthProvider>
                {children}
                <Toaster richColors position={dir === "rtl" ? "top-left" : "top-right"} />
              </AuthProvider>
            </NextIntlClientProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
