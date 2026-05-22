import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function HomePage() {
  const session = await auth();
  const locale = await getLocale();

  if (session?.user) {
    redirect({ href: "/admin/dashboard", locale });
  } else {
    redirect({ href: "/admin/login", locale });
  }

  return null;
}
