import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { ThemeProvider } from "@/presentation/providers/theme-provider";
import { AuthProvider } from "@/presentation/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { SITE_NAME } from "@/components/shared/site-name";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL("https://scct-damages.vercel.app/"),
    title: t("title", { siteName: SITE_NAME }),
    description: t("description"),
    keywords: ["SCCT", "Damages", "Data Collection", "Bilingual", "Dashboard"],
    authors: [{ name: "SCCT Team" }],
    creator: "SCCT Team",
    publisher: "SCCT Team",
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
      title: t("ogTitle", { siteName: SITE_NAME }),
      description: t("ogDescription"),
      url: "https://scct-damages.vercel.app/",
      siteName: SITE_NAME,
      locale: locale === "ar" ? "ar_EG" : "en_US",
      type: "website",
    },
    verification: {
      google: "K2hBH3SrfPai7vh5FKzjqFugBv_kw7QmvPr-HxqVOGQ",
    },
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
    <html lang={locale} dir={dir} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
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
