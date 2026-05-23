import { z } from "zod";

export const extractionRequestSchema = z.object({
  imageBase64: z.string().min(1),
  imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]),
  fieldDefinitions: z.array(
    z.object({
      id: z.string().min(1),
      nameEn: z.string().min(1),
      nameAr: z.string().min(1),
      inputType: z.enum(["text", "number", "image", "file", "date", "dropdown"]),
      dropdownOptionsEn: z.array(z.string()).optional(),
      dropdownOptionsAr: z.array(z.string()).optional(),
    })
  ),
  contactFields: z.array(
    z.object({
      key: z.enum(["name", "email", "phone", "address"]),
      labelEn: z.string().min(1),
      labelAr: z.string().min(1),
    })
  ),
  locale: z.enum(["en", "ar"]),
});

export type ExtractionRequest = z.infer<typeof extractionRequestSchema>;

export const extractedContactDataSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
});

export const extractedFieldValueSchema = z.object({
  value: z.union([z.string(), z.number()]).nullable(),
  confidence: z.number().min(0).max(1),
});

export const extractionResponseSchema = z.object({
  status: z.enum(["success", "partial", "failure"]),
  contactData: extractedContactDataSchema,
  fieldValues: z.record(z.string(), extractedFieldValueSchema),
  errorMessage: z.string().nullable().optional(),
});

export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;
