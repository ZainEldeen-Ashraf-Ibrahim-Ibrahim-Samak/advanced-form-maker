import { getTeamMembers } from "@/domain/use-cases/admin/manage-team";
import { TeamClient } from "./team-client";
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

export default async function TeamPage() {
  const session = await auth();
  const locale = await getLocale();
  const t = await getTranslations("team");
  const user = session?.user as { role?: string; id?: string } | undefined;

  // Make sure only admins can access this page
  if (user && user.role !== "admin") {
    redirect({ href: "/admin/dashboard", locale });
  }

  const teamMembers = await getTeamMembers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("subtitle")}
        </p>
      </div>

      <TeamClient initialMembers={teamMembers} currentUserId={user?.id || ""} />
    </div>
  );
}
