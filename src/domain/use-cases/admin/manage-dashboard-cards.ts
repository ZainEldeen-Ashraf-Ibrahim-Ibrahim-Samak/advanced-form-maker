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
}

export class ManageDashboardCardsUseCase {
  constructor(
    private cardRepo: DashboardCardRepository,
    private formRepo: FormTemplateRepository
  ) {}

  async listCardsWithFormData(): Promise<DashboardCardWithData[]> {
    const cards = await this.cardRepo.listAll();
    const templates = await this.formRepo.findAll();
    const templateMap = new Map(templates.map((t) => [t.id, t]));

    const cardsWithData = await Promise.all(
      cards.map(async (card) => {
        const template = templateMap.get(card.formTemplateId);
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
