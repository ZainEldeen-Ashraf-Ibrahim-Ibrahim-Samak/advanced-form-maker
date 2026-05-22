import {
  FormTemplate,
  CreateFormTemplateInput,
  UpdateFormTemplateInput,
} from "@/domain/entities/form-template";

/**
 * FormTemplate repository interface.
 * Domain layer — defines data access contract.
 */
export interface FormTemplateRepository {
  create(input: CreateFormTemplateInput): Promise<FormTemplate>;
  findById(id: string): Promise<FormTemplate | null>;
  findActive(): Promise<FormTemplate | null>;
  findAll(): Promise<FormTemplate[]>;
  update(id: string, input: UpdateFormTemplateInput): Promise<FormTemplate | null>;
  delete(id: string): Promise<boolean>;
  deactivateAll(): Promise<void>;
  countSubmissions(formTemplateId: string): Promise<number>;
}
