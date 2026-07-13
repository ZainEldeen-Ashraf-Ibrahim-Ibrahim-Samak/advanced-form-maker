import { z } from "zod";

const documentMimeTypeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const extractionRequestSchema = z.object({
  images: z
    .array(
      z.object({
        data: z.string().min(1),
        mimeType: documentMimeTypeSchema,
      })
    )
    .min(1)
    .max(5),
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
  multiInstanceEnabled: z.boolean().optional(),
  maxInstances: z.number().int().min(1).nullable().optional(),
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

export const extractionResponseSchema: any = z.object({
  status: z.enum(["success", "partial", "failure"]),
  contactData: extractedContactDataSchema,
  fieldValues: z.record(z.string(), extractedFieldValueSchema),
  errorMessage: z.string().nullable().optional(),
  records: z.array(z.lazy(() => extractionResponseSchema)).optional(),
});

export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;
