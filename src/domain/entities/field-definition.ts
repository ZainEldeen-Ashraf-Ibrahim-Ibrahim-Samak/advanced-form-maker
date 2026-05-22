/**
 * FieldDefinition entity interface.
 * Domain layer — zero framework imports.
 */

export type InputType = "text" | "number" | "image" | "file" | "date" | "dropdown";

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  regexType?: "email" | "phone" | "name";
}

export interface FieldDefinition {
  id: string;
  formTemplateId: string;
  nameEn: string;
  nameAr: string;
  inputType: InputType;
  validationRules: ValidationRules;
  isMultiple: boolean;
  dropdownOptionsEn: string[];
  dropdownOptionsAr: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateFieldDefinitionInput = Omit<
  FieldDefinition,
  "id" | "isActive" | "createdAt" | "updatedAt" | "sortOrder"
> & {
  sortOrder?: number;
};

export type UpdateFieldDefinitionInput = Partial<
  Pick<
    FieldDefinition,
    | "nameEn"
    | "nameAr"
    | "inputType"
    | "isMultiple"
    | "validationRules"
    | "dropdownOptionsEn"
    | "dropdownOptionsAr"
    | "sortOrder"
  >
>;

export interface ReorderFieldInput {
  fieldId: string;
  sortOrder: number;
}
