import { NextResponse } from "next/server";
import { flattenNestedData } from "@/lib/utils/exportUtils";
import * as xlsx from "xlsx";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/dev-logger";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

// Ensure all models are registered in the current context
import "@/data/models/backup-log.model";
import "@/data/models/field-definition.model";
import "@/data/models/field-value.model";
import "@/data/models/form-template.model";
import "@/data/models/resubmission-request.model";
import "@/data/models/settings.model";
import "@/data/models/submission.model";
import "@/data/models/user.model";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "xlsx";

    await connectToDatabase();

    const FormTemplate = mongoose.model("FormTemplate");
    const Submission = mongoose.model("Submission");
    const FieldValue = mongoose.model("FieldValue");

    // Fetch all active form templates
    const templates = await FormTemplate.find({ isActive: true }).lean().exec() as any[];

    if (!templates || templates.length === 0) {
      return NextResponse.json({ error: "No active form templates found" }, { status: 404 });
    }

    let bodyContent: Buffer | string;
    let contentType: string;

    if (format === "xlsx") {
      const workbook = xlsx.utils.book_new();
      let hasSheets = false;

      for (const template of templates) {
        const submissions = await Submission.find({ formTemplateId: template._id }).lean().exec();
        if (submissions.length === 0) continue;

        const submissionIds = submissions.map((s: any) => s._id);
        const fieldValues = await FieldValue.find({ submissionId: { $in: submissionIds } }).lean().exec();

        const fieldValuesBySubmission = new Map<string, any[]>();
        for (const val of fieldValues) {
          const subId = val.submissionId.toString();
          if (!fieldValuesBySubmission.has(subId)) {
            fieldValuesBySubmission.set(subId, []);
          }
          fieldValuesBySubmission.get(subId)!.push(val);
        }

        const flattenedData = submissions.map((doc: any, index: number) => {
          const { _id, __v, ...rest } = doc;
          const flat: Record<string, any> = {};
          flat["Form Template"] = template.name;

          for (const [key, value] of Object.entries(rest)) {
            Object.assign(flat, flattenNestedData(value, key));
          }

          const docIdStr = _id.toString();
          const customFields = fieldValuesBySubmission.get(docIdStr) || [];
          for (const fv of customFields) {
            const columnName = fv.fieldNameSnapshot || `Field_${fv.fieldDefinitionId}`;
            if (fv.mediaUrl) {
              flat[columnName] = fv.mediaUrl;
            } else if (fv.mediaItems && fv.mediaItems.length > 0) {
              flat[columnName] = fv.mediaItems.map((item: any) => item.url).join(", ");
            } else {
              flat[columnName] = fv.value !== undefined && fv.value !== null ? String(fv.value) : "";
            }
          }

          return {
            "#": index + 1,
            id: docIdStr,
            ...flat
          };
        });

        const cleanSheetName = template.name
          .replace(/[:\?\*\/\\\[\]]/g, "")
          .substring(0, 31) || `Form-${template._id.toString().substring(0, 6)}`;

        const worksheet = xlsx.utils.json_to_sheet(flattenedData);
        xlsx.utils.book_append_sheet(workbook, worksheet, cleanSheetName);
        hasSheets = true;
      }

      if (!hasSheets) {
        // If no sheets were added because there were no submissions, add a dummy sheet
        const dummyWorksheet = xlsx.utils.json_to_sheet([{ Message: "No submissions found for any active form templates" }]);
        xlsx.utils.book_append_sheet(workbook, dummyWorksheet, "No Data");
      }

      bodyContent = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    } else if (format === "pdf") {
      const doc = new jsPDF();
      let fontName = "helvetica";
      const fontPath = path.join(process.cwd(), "public", "fonts", "Amiri-Regular.ttf");
      if (fs.existsSync(fontPath)) {
        const fontBuffer = fs.readFileSync(fontPath);
        const base64Font = fontBuffer.toString("base64");
        doc.addFileToVFS("Amiri-Regular.ttf", base64Font);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
        fontName = "Amiri";
      }

      doc.setProperties({ title: "Bulk Export" });
      doc.setFont(fontName);

      let isFirst = true;
      let hasAnyData = false;

      for (const template of templates) {
        const submissions = await Submission.find({ formTemplateId: template._id }).lean().exec();
        if (submissions.length === 0) continue;
        hasAnyData = true;

        if (!isFirst) {
          doc.addPage();
        }
        isFirst = false;

        doc.setFont(fontName);
        doc.text(template.name, 14, 15);

        const submissionIds = submissions.map((s: any) => s._id);
        const fieldValues = await FieldValue.find({ submissionId: { $in: submissionIds } }).lean().exec();

        const fieldValuesBySubmission = new Map<string, any[]>();
        for (const val of fieldValues) {
          const subId = val.submissionId.toString();
          if (!fieldValuesBySubmission.has(subId)) {
            fieldValuesBySubmission.set(subId, []);
          }
          fieldValuesBySubmission.get(subId)!.push(val);
        }

        const flattenedData = submissions.map((doc: any, index: number) => {
          const { _id, __v, ...rest } = doc;
          const flat: Record<string, any> = {};
          flat["Form Template"] = template.name;

          for (const [key, value] of Object.entries(rest)) {
            Object.assign(flat, flattenNestedData(value, key));
          }

          const docIdStr = _id.toString();
          const customFields = fieldValuesBySubmission.get(docIdStr) || [];
          for (const fv of customFields) {
            const columnName = fv.fieldNameSnapshot || `Field_${fv.fieldDefinitionId}`;
            if (fv.mediaUrl) {
              flat[columnName] = fv.mediaUrl;
            } else if (fv.mediaItems && fv.mediaItems.length > 0) {
              flat[columnName] = fv.mediaItems.map((item: any) => item.url).join(", ");
            } else {
              flat[columnName] = fv.value !== undefined && fv.value !== null ? String(fv.value) : "";
            }
          }

          return {
            "#": index + 1,
            id: docIdStr,
            ...flat
          };
        });

        const headers = Object.keys(flattenedData[0] || {});
        const pdfBody = flattenedData.map((row) => headers.map((h) => String((row as any)[h] || "")));

        autoTable(doc, {
          head: [headers],
          body: pdfBody,
          startY: 20,
          styles: { font: fontName, fontStyle: "normal", fontSize: 10 },
        });
      }

      if (!hasAnyData) {
        doc.text("No submissions found for any active form templates", 14, 15);
      }

      bodyContent = Buffer.from(doc.output("arraybuffer"));
      contentType = "application/pdf";

    } else {
      return NextResponse.json({ error: `Unsupported format for bulk export: ${format}` }, { status: 400 });
    }

    const filename = `all-forms-data.${format}`;
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(bodyContent as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    logger.error(`Bulk export failed: ${error}`);
    return NextResponse.json({ error: "Bulk export failed" }, { status: 500 });
  }
}
