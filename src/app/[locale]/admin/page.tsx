import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function AdminPage() {
  const locale = await getLocale();
  redirect({ href: "/admin/dashboard", locale });
  return null;
}
