import type { ContactFormField, ContactFormFieldKey } from "@/domain/entities/form-template";

export const CONTACT_FORM_FIELD_KEYS: ContactFormFieldKey[] = [
  "name",
  "email",
  "phone",
  "address",
];

const DEFAULT_LABELS_EN: Record<ContactFormFieldKey, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  address: "Address",
};

const DEFAULT_LABELS_AR: Record<ContactFormFieldKey, string> = {
  name: "الاسم",
  email: "البريد الإلكتروني",
  phone: "الهاتف",
  address: "العنوان",
};

const DEFAULT_PLACEHOLDERS_EN: Record<ContactFormFieldKey, string> = {
  name: "Enter name",
  email: "Enter email",
  phone: "Enter phone",
  address: "Enter address",
};

const DEFAULT_PLACEHOLDERS_AR: Record<ContactFormFieldKey, string> = {
  name: "ادخل الاسم",
  email: "ادخل البريد الإلكتروني",
  phone: "ادخل الهاتف",
  address: "ادخل العنوان",
};

function isContactFieldKey(value: unknown): value is ContactFormFieldKey {
  return typeof value === "string" && CONTACT_FORM_FIELD_KEYS.includes(value as ContactFormFieldKey);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function createContactFormFieldConfig(
  key: ContactFormFieldKey,
  sortOrder: number,
): ContactFormField {
  return {
    id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    key,
    labelEn: DEFAULT_LABELS_EN[key],
    labelAr: DEFAULT_LABELS_AR[key],
    label: DEFAULT_LABELS_EN[key],
    placeholderEn: DEFAULT_PLACEHOLDERS_EN[key],
    placeholderAr: DEFAULT_PLACEHOLDERS_AR[key],
    placeholder: DEFAULT_PLACEHOLDERS_EN[key],
    required: key === "name",
    sortOrder,
  };
}

export const DEFAULT_CONTACT_FORM_FIELDS: ContactFormField[] = CONTACT_FORM_FIELD_KEYS.map((key, index) => ({
  id: `contact_${key}`,
  key,
  labelEn: DEFAULT_LABELS_EN[key],
  labelAr: DEFAULT_LABELS_AR[key],
  label: DEFAULT_LABELS_EN[key],
  placeholderEn: DEFAULT_PLACEHOLDERS_EN[key],
  placeholderAr: DEFAULT_PLACEHOLDERS_AR[key],
  placeholder: DEFAULT_PLACEHOLDERS_EN[key],
  required: key === "name",
  sortOrder: index,
}));

export function normalizeContactFormFields(fields: unknown): ContactFormField[] {
  if (!Array.isArray(fields)) {
    return DEFAULT_CONTACT_FORM_FIELDS.map((field) => ({ ...field }));
  }

  const normalized = fields
    .map((field, index): ContactFormField | null => {
      if (!field || typeof field !== "object") return null;
      const candidate = field as Record<string, unknown>;
      if (!isContactFieldKey(candidate.key)) return null;

      const key = candidate.key;
      const id = readString(candidate.id);
      const legacyLabel = readString(candidate.label);
      const legacyPlaceholder = readString(candidate.placeholder);
      const labelEn = readString(candidate.labelEn) || legacyLabel || DEFAULT_LABELS_EN[key];
      const labelAr = readString(candidate.labelAr) || legacyLabel || DEFAULT_LABELS_AR[key];
      const placeholderEn = readString(candidate.placeholderEn) || legacyPlaceholder || DEFAULT_PLACEHOLDERS_EN[key];
      const placeholderAr = readString(candidate.placeholderAr) || legacyPlaceholder || DEFAULT_PLACEHOLDERS_AR[key];
      const sortOrderValue = Number(candidate.sortOrder);

      return {
        id: id || `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${index}`,
        key,
        labelEn,
        labelAr,
        label: labelEn,
        placeholderEn,
        placeholderAr,
        placeholder: placeholderEn,
        required: Boolean(candidate.required),
        regexEnabled: candidate.regexEnabled === true,
        sortOrder: Number.isInteger(sortOrderValue) ? sortOrderValue : index,
      };
    })
    .filter((field): field is ContactFormField => !!field)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((field, index) => ({ ...field, sortOrder: index }));

  if (normalized.length === 0) {
    return DEFAULT_CONTACT_FORM_FIELDS.map((field) => ({ ...field }));
  }

  return normalized;
}
