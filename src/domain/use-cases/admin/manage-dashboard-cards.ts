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
  displayName: string | null;
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
        defaultLabelEn: def?.defaultLabelEn || "",
        defaultLabelAr: def?.defaultLabelAr || "",
        defaultIcon: def?.defaultIcon || "file-text",
        visible: c.visible,
        sortOrder: c.sortOrder,
        displayNameAr: c.displayNameAr,
        displayNameEn: c.displayNameEn,
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
          displayName: card.displayName,
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
        statUpdates.push({
          slug: card.slug,
          visible: card.visible,
          sortOrder: card.sortOrder,
          displayNameAr: card.displayNameAr,
          displayNameEn: card.displayNameEn,
        });
      } else {
        formUpdates.push({
          formTemplateId: card.formTemplateId,
          visible: card.visible,
          sortOrder: card.sortOrder,
          displayNameAr: card.displayNameAr,
          displayNameEn: card.displayNameEn,
          logoUrl: card.logoUrl,
          metricLabel: card.metricLabel,
          metricValue: card.metricValue,
        });
      }
    }

    await Promise.all([
      this.cardRepo.updateMany(formUpdates),
      this.statCardRepo.upsertMany(statUpdates),
    ]);
  }
}
