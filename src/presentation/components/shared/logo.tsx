import Image from "next/image";
import { Link } from "@/i18n/navigation";

export function Logo({
  className = "",
  logoUrl = "",
  siteName = "ADVANCED FORM MAKER"
}: {
  className?: string;
  logoUrl?: string;
  siteName?: string;
}) {
  return (
    <Link href="/admin" className={`flex items-center gap-2 ${className}`}>
      <Image
        src={logoUrl || "/favicon.ico"}
        alt={`${siteName} Logo`}
        width={32}
        height={32}
        className="object-contain shrink-0"
        unoptimized={!!logoUrl}
      />
      <span className="text-xl font-bold tracking-tight">{siteName}</span>
    </Link>
  );
}
