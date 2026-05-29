import { getSiteBranding } from "@/components/shared/site-name";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const branding = await getSiteBranding();

  return <LoginForm logoUrl={branding.siteLogoUrl} siteName={branding.siteName} />;
}
