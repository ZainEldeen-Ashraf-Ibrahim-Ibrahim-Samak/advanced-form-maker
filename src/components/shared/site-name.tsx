import { ManageSettingsUseCase } from "@/domain/use-cases/admin/manage-settings";

export const SITE_NAME = "ADVANCED FORM MAKER";
export const SITE_ADMIN_NAME = `${SITE_NAME} Admin`;
export const SITE_FAVICON_PATH = "/favicon.ico";

export function SiteName({ className = "" }: { className?: string }) {
  return <span className={className}>{SITE_NAME}</span>;
}

export async function getSiteBranding(): Promise<{ siteName: string; siteLogoUrl: string }> {
  try {
    const useCase = new ManageSettingsUseCase();
    const settings = await useCase.getSettings();
    return {
      siteName: settings?.branding?.siteName || SITE_NAME,
      siteLogoUrl: settings?.branding?.siteLogoUrl || "",
    };
  } catch (error) {
    console.error("Failed to get site branding:", error);
    return {
      siteName: SITE_NAME,
      siteLogoUrl: "",
    };
  }
}
