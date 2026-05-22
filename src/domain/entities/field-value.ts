import { InputType } from "./field-definition";

/**
 * FieldValue entity interface.
 * Domain layer — zero framework imports.
 */
export interface FieldValue {
  id: string;
  submissionId: string;
  fieldDefinitionId: string;
  fieldNameSnapshot: string;
  fieldTypeSnapshot: InputType;
  value?: string | number | string[] | null;
  mediaUrl?: string | null;
  mediaPublicId?: string | null;
  mediaItems?: { url: string; publicId: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateFieldValueInput = Omit<
  FieldValue,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateFieldValueInput = Partial<
  Pick<FieldValue, "value" | "mediaUrl" | "mediaPublicId" | "mediaItems">
>;
