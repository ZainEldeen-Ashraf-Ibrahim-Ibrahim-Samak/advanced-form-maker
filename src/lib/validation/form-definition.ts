import { z } from "zod";

export const formDefinitionFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "number", "select", "date", "phone", "nationalId", "media"]),
  required: z.boolean(),
  regex: z.string().optional(),
  formatterId: z.enum(["phone", "nationalId", "date", "numeric", "none"]).optional(),
  messageKeys: z.object({
    label: z.string().min(1),
    placeholder: z.string().optional(),
    errorRequired: z.string().min(1),
    errorRegex: z.string().min(1),
    errorFormat: z.string().optional(),
  }),
  mediaLimits: z
    .object({
      maxImageBytes: z.number().int().positive().optional(),
      maxVideoBytes: z.number().int().positive().optional(),
      acceptedMimeTypes: z.array(z.string()).optional(),
    })
    .optional(),
});

export const formDefinitionResponseSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  fields: z.array(formDefinitionFieldSchema),
});

export type FormDefinitionResponse = z.infer<typeof formDefinitionResponseSchema>;
