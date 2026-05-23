import { DashboardCardRepository } from "@/domain/repositories/dashboard-card-repository";
import { FormTemplateRepository } from "@/domain/repositories/form-template-repository";
import { UpdateDashboardCardInput } from "@/domain/entities/dashboard-card";

export interface DashboardCardWithData {
  formTemplateId: string;
  name: string;
  description: string;
  visible: boolean;
  sortOrder: number;
  submissionCount: number;
  isLocked: boolean;
  displayName: string | null;
  metricLabel: string | null;
  metricValue: string | null;
}

export class ManageDashboardCardsUseCase {
  constructor(
    private cardRepo: DashboardCardRepository,
    private formRepo: FormTemplateRepository
  ) {}

  async listCardsWithFormData(): Promise<DashboardCardWithData[]> {
    const [cards, templates] = await Promise.all([
      this.cardRepo.listAll(),
      this.formRepo.findAll(),
    ]);

    const cardsByFormId = new Map(cards.map((c) => [c.formTemplateId, c]));

    // Lazy-initialize: create a DashboardCard for any form that doesn't have one yet
    const missingForms = templates.filter((t) => !cardsByFormId.has(t.id));
    if (missingForms.length > 0) {
      const newCards = await Promise.all(
        missingForms.map((t) => this.cardRepo.createForForm(t.id))
      );
      newCards.forEach((c) => cardsByFormId.set(c.formTemplateId, c));
    }

    const allCards = [...cardsByFormId.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    const cardsWithData = await Promise.all(
      allCards.map(async (card) => {
        const template = templates.find((t) => t.id === card.formTemplateId);
        if (!template) return null;

        const submissionCount = await this.formRepo.countSubmissions(card.formTemplateId);
        return {
          formTemplateId: card.formTemplateId,
          name: template.name,
          description: template.description || "",
          visible: card.visible,
          sortOrder: card.sortOrder,
          submissionCount,
          isLocked: template.isLocked,
          displayName: card.displayName,
          metricLabel: card.metricLabel,
          metricValue: card.metricValue,
        };
      })
    );

    return cardsWithData.filter((c): c is DashboardCardWithData => c !== null);
  }

  async saveCardConfig(cards: UpdateDashboardCardInput[]): Promise<void> {
    for (const card of cards) {
      if (!card.formTemplateId) {
        throw new Error("formTemplateId is required for card configuration update");
      }
      if (card.sortOrder !== undefined && card.sortOrder < 0) {
        throw new Error("sortOrder must be a non-negative integer");
      }
    }
    await this.cardRepo.updateMany(cards);
  }
}
