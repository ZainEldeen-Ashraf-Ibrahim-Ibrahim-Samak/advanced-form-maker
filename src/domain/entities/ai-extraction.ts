/**
 * AI Extraction entities and types.
 * Domain layer — zero framework imports.
 */

export type ExtractionStatus = "success" | "partial" | "failure";

export interface ExtractedContactData {
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface ExtractedFieldValue {
  value: string | number | null;
  confidence: number;
}

export interface ExtractionResult {
  status: ExtractionStatus;
  contactData: ExtractedContactData;
  fieldValues: Record<string, ExtractedFieldValue>;
  errorMessage?: string | null;
  records?: ExtractionResult[];
}
