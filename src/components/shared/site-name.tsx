export const SITE_NAME = "SCCT DAMAGES";
export const SITE_ADMIN_NAME = `${SITE_NAME} Admin`;
export const SITE_FAVICON_PATH = "/favicon.ico";

export function SiteName({ className = "" }: { className?: string }) {
  return <span className={className}>{SITE_NAME}</span>;
}
