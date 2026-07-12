import { extractDocumentData } from "../../src/data/services/ai-extraction-service";
import fs from "fs";

async function main() {
  const b64 = fs.readFileSync("/tmp/img_b64.txt", "utf-8");
  const fieldDefinitions = [
    { id: "name", nameEn: "Full Name", nameAr: "الاسم", inputType: "text" },
    { id: "dob", nameEn: "Date of Birth", nameAr: "تاريخ الميلاد", inputType: "date" },
    { id: "nationality", nameEn: "Nationality", nameAr: "الجنسية", inputType: "text" },
    { id: "passport", nameEn: "Passport/National ID Number", nameAr: "رقم الجواز او الرقم القومي", inputType: "text" },
    { id: "notes", nameEn: "Notes", nameAr: "ملحوظات", inputType: "text" },
  ];
  const start = Date.now();
  const result = await extractDocumentData(
    [{ data: b64, mimeType: "image/png" }],
    fieldDefinitions,
    [],
    "ar",
    { multiInstanceEnabled: true, maxInstances: 20 }
  );
  console.log("Took", Date.now() - start, "ms");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
