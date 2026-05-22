import {
  FieldDefinition,
  CreateFieldDefinitionInput,
  UpdateFieldDefinitionInput,
  ReorderFieldInput,
} from "@/domain/entities/field-definition";

/**
 * FieldDefinition repository interface.
 * Domain layer — defines data access contract.
 */
export interface FieldDefinitionRepository {
  create(input: CreateFieldDefinitionInput): Promise<FieldDefinition>;
  findById(id: string): Promise<FieldDefinition | null>;
  findByFormId(formTemplateId: string, includeInactive?: boolean): Promise<FieldDefinition[]>;
  update(id: string, input: UpdateFieldDefinitionInput): Promise<FieldDefinition | null>;
  softDelete(id: string): Promise<boolean>;
  reorder(formTemplateId: string, fields: ReorderFieldInput[]): Promise<void>;
  getNextSortOrder(formTemplateId: string): Promise<number>;
}
