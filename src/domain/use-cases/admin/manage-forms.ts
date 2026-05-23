import { FormTemplate, CreateFormTemplateInput, UpdateFormTemplateInput } from "@/domain/entities/form-template";
import { FormTemplateRepository } from "@/domain/repositories/form-template-repository";
import { DashboardCardRepository } from "@/domain/repositories/dashboard-card-repository";

/**
 * Use cases for admin form template management.
 * Domain layer — orchestrates business logic.
 */
export class ManageFormsUseCase {
  constructor(
    private repo: FormTemplateRepository,
    private cardRepo?: DashboardCardRepository
  ) {}

  async createForm(input: CreateFormTemplateInput): Promise<FormTemplate> {
    const form = await this.repo.create(input);
    if (this.cardRepo) {
      await this.cardRepo.createForForm(form.id);
    }
    return form;
  }

  async getForm(id: string): Promise<FormTemplate | null> {
    return this.repo.findById(id);
  }

  async getActiveForm(): Promise<FormTemplate | null> {
    return this.repo.findActive();
  }

  async listForms(): Promise<FormTemplate[]> {
    return this.repo.findAll();
  }

  async updateForm(id: string, input: UpdateFormTemplateInput): Promise<FormTemplate | null> {
    // If setting as active, deactivate all others first
    if (input.isActive === true) {
      await this.repo.deactivateAll();
    }
    return this.repo.update(id, input);
  }

  async deleteForm(id: string): Promise<{ success: boolean; error?: string }> {
    const submissionCount = await this.repo.countSubmissions(id);
    if (submissionCount > 0) {
      return {
        success: false,
        error: "Cannot delete a form with existing submissions",
      };
    }
    if (this.cardRepo) {
      await this.cardRepo.deleteByFormId(id);
    }
    const deleted = await this.repo.delete(id);
    return { success: deleted };
  }

  async lockForm(formId: string, isLocked: boolean): Promise<FormTemplate> {
    if (!formId || typeof formId !== "string" || formId.trim() === "") {
      throw new Error("Invalid form ID");
    }
    const updated = await this.repo.setLocked(formId, isLocked);
    if (!updated) {
      throw new Error("Form template not found");
    }
    return updated;
  }
}
