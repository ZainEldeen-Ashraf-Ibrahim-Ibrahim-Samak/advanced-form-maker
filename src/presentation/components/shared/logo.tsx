import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { SiteName } from "@/components/shared/site-name";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/admin" className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/favicon.ico"
        alt="SCCT DAMAGES Logo"
        width={32}
        height={32}
        className="object-contain shrink-0"
      />
      <SiteName className="text-xl font-bold text-primary tracking-tight" />
    </Link>
  );
}
