import {
  FieldDefinition,
  CreateFieldDefinitionInput,
  UpdateFieldDefinitionInput,
  ReorderFieldInput,
} from "@/domain/entities/field-definition";
import { FieldDefinitionRepository } from "@/domain/repositories/field-definition-repository";

/**
 * Use cases for admin field definition management.
 * Domain layer — orchestrates business logic.
 */
export class ManageFieldsUseCase {
  constructor(private repo: FieldDefinitionRepository) {}

  async createField(input: CreateFieldDefinitionInput): Promise<FieldDefinition> {
    // Auto-assign sort order if not provided
    if (input.sortOrder === undefined) {
      input.sortOrder = await this.repo.getNextSortOrder(input.formTemplateId);
    }
    return this.repo.create(input);
  }

  async getField(id: string): Promise<FieldDefinition | null> {
    return this.repo.findById(id);
  }

  async listFields(formTemplateId: string, includeInactive = false): Promise<FieldDefinition[]> {
    return this.repo.findByFormId(formTemplateId, includeInactive);
  }

  async updateField(id: string, input: UpdateFieldDefinitionInput): Promise<FieldDefinition | null> {
    return this.repo.update(id, input);
  }

  async deleteField(id: string): Promise<boolean> {
    // Soft-delete to preserve historical submission data
    return this.repo.softDelete(id);
  }

  async reorderFields(formTemplateId: string, fields: ReorderFieldInput[]): Promise<void> {
    return this.repo.reorder(formTemplateId, fields);
  }
}
