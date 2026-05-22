import { FieldValue, CreateFieldValueInput, UpdateFieldValueInput } from "@/domain/entities/field-value";

/**
 * FieldValue repository interface.
 * Domain layer — defines data access contract.
 */
export interface FieldValueRepository {
  createMany(inputs: CreateFieldValueInput[]): Promise<FieldValue[]>;
  findBySubmissionId(submissionId: string): Promise<FieldValue[]>;
  updateMany(submissionId: string, updates: { fieldDefinitionId: string; data: UpdateFieldValueInput }[]): Promise<void>;
  deleteBySubmissionId(submissionId: string): Promise<boolean>;
}
