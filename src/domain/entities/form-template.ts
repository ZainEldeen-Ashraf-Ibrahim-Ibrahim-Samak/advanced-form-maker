/**
 * FormTemplate entity interface.
 * Domain layer — zero framework imports.
 */
export type ContactFormFieldKey = "name" | "email" | "phone" | "address";

export interface ContactFormField {
  id: string;
  key: ContactFormFieldKey;
  labelEn: string;
  labelAr: string;
  label: string;
  placeholderEn: string;
  placeholderAr: string;
  placeholder: string;
  required: boolean;
  sortOrder: number;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  contactRecords: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    contact?: string | null;
    role?: string | null;
    notes?: string | null;
    mediaUrl?: string | null;
    mediaPublicId?: string | null;
  }>;
  contactFormFields: ContactFormField[];
  isActive: boolean;
  isLocked: boolean;
  isContactForm: boolean;
  contactFormLocked: boolean;
  aiAutoFillEnabled: boolean;
  canAddMoreReplies: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateFormTemplateInput = Pick<FormTemplate, "name"> & {
  description?: string;
  aiAutoFillEnabled?: boolean;
  isContactForm?: boolean;
};

export type UpdateFormTemplateInput = Partial<
  Pick<FormTemplate, "name" | "description" | "isActive" | "isLocked" | "contactRecords" | "contactFormFields" | "aiAutoFillEnabled" | "isContactForm" | "contactFormLocked" | "canAddMoreReplies">
>;

