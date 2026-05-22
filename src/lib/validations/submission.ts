import { z } from "zod";
export const submissionFieldSchema = z.union([
  z.string().email("Invalid email").optional(),
  z
    .string()
    .regex(/^\+?[\d\s-]{10,20}$/, "Invalid phone")
    .optional(),
  z.string().max(1000).optional(),
  z.number().optional(),
]);
export const formSubmissionSchema = z.object({
  formId: z.string().uuid("Invalid form ID"),
  responses: z.record(z.string(), submissionFieldSchema),
});
