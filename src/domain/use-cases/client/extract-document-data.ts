import { extractionRequestSchema } from "@/lib/validations/ai-extraction";
import { ExtractionResult } from "@/domain/entities/ai-extraction";
import { extractDocumentData } from "@/data/services/ai-extraction-service";

export class ExtractDocumentDataUseCase {
  async execute(requestData: unknown): Promise<ExtractionResult> {
    const validated = extractionRequestSchema.parse(requestData);

    return await extractDocumentData(
      validated.imageBase64,
      validated.imageMimeType,
      validated.fieldDefinitions,
      validated.contactFields,
      validated.locale
    );
  }
}
