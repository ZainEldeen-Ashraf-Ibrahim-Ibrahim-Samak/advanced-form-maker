import { DashboardCardRepository } from "@/domain/repositories/dashboard-card-repository";
import { FormTemplateRepository } from "@/domain/repositories/form-template-repository";
import { StatCardConfigRepository } from "@/domain/repositories/stat-card-config-repository";
import { UpdateDashboardCardInput } from "@/domain/entities/dashboard-card";
import { UpdateStatCardConfigInput } from "@/domain/entities/stat-card-config";

export interface FormSummaryCardItem {
  cardType: "form";
  formTemplateId: string;
  name: string;
  description: string;
  visible: boolean;
  sortOrder: number;
  submissionCount: number;
  isLocked: boolean;
  contactFormLocked: boolean;
  displayNameAr: string | null;
  displayNameEn: string | null;
  logoUrl: string | null;
  metricLabel: string | null;
  metricValue: string | null;
}

export interface StatCardItem {
  cardType: "stat";
  slug: string;
  defaultLabelEn: string;
  defaultLabelAr: string;
  defaultIcon: string;
  visible: boolean;
  sortOrder: number;
  displayNameAr: string | null;
  displayNameEn: string | null;
  logoUrl: string | null;
  metricLabel: string | null;
  metricValue: string | null;
  isDefault: boolean;
}

export type UnifiedCardItem = FormSummaryCardItem | StatCardItem;

// Keep alias for compatibility with existing UI usages
export type DashboardCardWithData = UnifiedCardItem;

export type UnifiedCardUpdateInput =
  | (UpdateDashboardCardInput & { cardType: "form" })
  | (UpdateStatCardConfigInput & { cardType: "stat" });

const STAT_CARD_DEFAULTS: Record<string, { defaultLabelEn: string; defaultLabelAr: string; defaultIcon: string }> = {
  total: { defaultLabelEn: "Total Submissions", defaultLabelAr: "إجمالي الطلبات", defaultIcon: "file-text" },
  pending: { defaultLabelEn: "Pending", defaultLabelAr: "قيد الانتظار", defaultIcon: "clock" },
  draft: { defaultLabelEn: "Drafts", defaultLabelAr: "المسودات", defaultIcon: "file-text" },
  viewed: { defaultLabelEn: "Viewed", defaultLabelAr: "تمت المراجعة", defaultIcon: "eye" },
  needs_rewrite: { defaultLabelEn: "Needs Rewrite", defaultLabelAr: "يحتاج تعديل", defaultIcon: "alert-circle" },
};

export class ManageDashboardCardsUseCase {
  constructor(
    private cardRepo: DashboardCardRepository,
    private formRepo: FormTemplateRepository,
    private statCardRepo: StatCardConfigRepository
  ) {}

  async listCardsWithFormData(): Promise<UnifiedCardItem[]> {
    // 1. Seed and get stat cards
    await this.statCardRepo.seedDefaults();
    const statConfigs = await this.statCardRepo.listAll();

    const statItems: StatCardItem[] = statConfigs.map((c) => {
      const def = STAT_CARD_DEFAULTS[c.slug];
      return {
        cardType: "stat",
        slug: c.slug,
        defaultLabelEn: def?.defaultLabelEn || c.displayNameEn || c.slug,
        defaultLabelAr: def?.defaultLabelAr || c.displayNameAr || c.slug,
        defaultIcon: def?.defaultIcon || "file-text",
        visible: c.visible,
        sortOrder: c.sortOrder,
        displayNameAr: c.displayNameAr,
        displayNameEn: c.displayNameEn,
        logoUrl: c.logoUrl,
        metricLabel: c.metricLabel,
        metricValue: c.metricValue,
        isDefault: c.isDefault,
      };
    });

    // 2. Get form cards
    const [cards, templates] = await Promise.all([
      this.cardRepo.listAll(),
      this.formRepo.findAll(),
    ]);

    const cardsByFormId = new Map(cards.map((c) => [c.formTemplateId, c]));

    // Lazy-initialize form cards
    const missingForms = templates.filter((t) => !cardsByFormId.has(t.id));
    if (missingForms.length > 0) {
      const newCards = await Promise.all(
        missingForms.map((t) => this.cardRepo.createForForm(t.id))
      );
      newCards.forEach((c) => cardsByFormId.set(c.formTemplateId, c));
    }

    const allCards = [...cardsByFormId.values()];

    const formItems = await Promise.all(
      allCards.map(async (card) => {
        const template = templates.find((t) => t.id === card.formTemplateId);
        if (!template) return null;

        const submissionCount = await this.formRepo.countSubmissions(card.formTemplateId);
        return {
          cardType: "form" as const,
          formTemplateId: card.formTemplateId,
          name: template.name,
          description: template.description || "",
          visible: card.visible,
          sortOrder: card.sortOrder,
          submissionCount,
          isLocked: template.isLocked,
          contactFormLocked: template.contactFormLocked,
          displayNameAr: card.displayNameAr,
          displayNameEn: card.displayNameEn,
          logoUrl: card.logoUrl,
          metricLabel: card.metricLabel,
          metricValue: card.metricValue,
        };
      })
    );

    const validFormItems = formItems.filter((c): c is FormSummaryCardItem => c !== null);

    // Merge and sort by sortOrder
    const merged: UnifiedCardItem[] = [...statItems, ...validFormItems].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    return merged;
  }

  async saveCardConfig(cards: UnifiedCardUpdateInput[]): Promise<void> {
    const formUpdates: UpdateDashboardCardInput[] = [];
    const statUpdates: UpdateStatCardConfigInput[] = [];

    for (const card of cards) {
      if (card.sortOrder !== undefined && card.sortOrder < 0) {
        throw new Error("sortOrder must be a non-negative integer");
      }

      if (card.cardType === "stat") {
        const sc = card as UpdateStatCardConfigInput & { cardType: "stat" };
        statUpdates.push({
          slug: sc.slug,
          visible: sc.visible,
          sortOrder: sc.sortOrder,
          displayNameAr: sc.displayNameAr,
          displayNameEn: sc.displayNameEn,
          logoUrl: sc.logoUrl,
          metricLabel: sc.metricLabel,
          metricValue: sc.metricValue,
        });
      } else {
        const fc = card as UpdateDashboardCardInput & { cardType: "form" };
        formUpdates.push({
          formTemplateId: fc.formTemplateId,
          visible: fc.visible,
          sortOrder: fc.sortOrder,
          displayNameAr: fc.displayNameAr,
          displayNameEn: fc.displayNameEn,
          logoUrl: fc.logoUrl,
          metricLabel: fc.metricLabel,
          metricValue: fc.metricValue,
        });
      }
    }

    await Promise.all([
      this.cardRepo.updateMany(formUpdates),
      this.statCardRepo.upsertMany(statUpdates),
    ]);
  }

  async addCustomStatCard(
    displayNameEn: string,
    displayNameAr: string,
    logoUrl?: string | null,
    metricLabel?: string | null,
    metricValue?: string | null
  ): Promise<StatCardItem> {
    // Generate a unique slug from the English name
    const baseSlug = displayNameEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "custom";
    const slug = `custom_${baseSlug}_${Date.now()}`;

    // Determine the next sortOrder
    const existing = await this.statCardRepo.listAll();
    const maxOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1);

    const created = await this.statCardRepo.create({
      slug,
      displayNameEn: displayNameEn || null,
      displayNameAr: displayNameAr || null,
      logoUrl: logoUrl || null,
      metricLabel: metricLabel || null,
      metricValue: metricValue || null,
      sortOrder: maxOrder + 1,
    });

    return {
      cardType: "stat",
      slug: created.slug,
      defaultLabelEn: displayNameEn || slug,
      defaultLabelAr: displayNameAr || slug,
      defaultIcon: "file-text",
      visible: true,
      sortOrder: created.sortOrder,
      displayNameAr: created.displayNameAr,
      displayNameEn: created.displayNameEn,
      logoUrl: created.logoUrl,
      metricLabel: created.metricLabel,
      metricValue: created.metricValue,
      isDefault: false,
    };
  }

  async deleteStatCard(slug: string): Promise<void> {
    await this.statCardRepo.deleteBySlug(slug);
  }
}
