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

// Import all models to ensure they are registered in the current context
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
    const collection = searchParams.get("collection");
    const formId = searchParams.get("formId");

    if (!collection) {
      return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Map lowercase/plural forms to Mongoose model names
    const collectionMapping: Record<string, string> = {
      "submissions": "Submission",
      "submission": "Submission",
      "field_values": "FieldValue",
      "fieldvalue": "FieldValue",
      "field_value": "FieldValue",
      "form_templates": "FormTemplate",
      "formtemplate": "FormTemplate",
      "form_template": "FormTemplate",
      "users": "User",
      "user": "User",
      "settings": "SettingsConfiguration",
      "setting": "SettingsConfiguration",
      "settings_configurations": "SettingsConfiguration",
      "settings_configuration": "SettingsConfiguration",
      "backup_logs": "BackupLog",
      "backuplog": "BackupLog",
      "backup_log": "BackupLog",
      "field_definitions": "FieldDefinition",
      "fielddefinition": "FieldDefinition",
      "field_definition": "FieldDefinition",
      "resubmission_requests": "ResubmissionRequest",
      "resubmissionrequest": "ResubmissionRequest",
      "resubmission_request": "ResubmissionRequest",
    };

    let targetModelName = collection;
    const lowerCollection = collection.toLowerCase();
    if (collectionMapping[lowerCollection]) {
      targetModelName = collectionMapping[lowerCollection];
    }

    // Ensure the model exists in registered models
    const registeredModels = mongoose.modelNames();
    if (!registeredModels.includes(targetModelName)) {
      return NextResponse.json(
        { 
          error: "Invalid collection name", 
          details: `Requested: ${collection} (Mapped to: ${targetModelName}). Available models: ${registeredModels.join(", ")}` 
        }, 
        { status: 400 }
      );
    }

    const status = searchParams.get("status");
    const idsParam = searchParams.get("ids");

    // Query filter (e.g. filter submissions by formId / status / specific IDs if provided)
    const queryFilter: Record<string, any> = {};
    if (targetModelName === "Submission") {
      if (formId) {
        try {
          queryFilter.formTemplateId = new mongoose.Types.ObjectId(formId);
        } catch (e) {
          queryFilter.formTemplateId = formId;
        }
      }
      if (status && status !== "all") {
        queryFilter.status = status;
      }
      if (idsParam) {
        const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
        if (ids.length > 0) {
          try {
            queryFilter._id = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) };
          } catch (e) {
            queryFilter._id = { $in: ids };
          }
        }
      }
    }

    const Model = mongoose.model(targetModelName);
    const data = await Model.find(queryFilter).lean().exec();

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No data found for collection" }, { status: 404 });
    }

    const groupedData: Record<string, Record<string, any>[]> = {};
    let exportTitle = targetModelName;

    // Special handling for Submission to merge custom fields and form names
    if (targetModelName === "Submission") {
      const FieldValue = mongoose.model("FieldValue");
      const FormTemplate = mongoose.model("FormTemplate");

      const submissionIds = data.map((doc: any) => doc._id);
      const formIdStrings = Array.from(new Set(data.map((doc: any) => doc.formTemplateId?.toString()).filter(Boolean)));
      const formObjectIds = formIdStrings.map((id) => {
        try { return new mongoose.Types.ObjectId(id); } catch { return id; }
      });

      const [fieldValues, templates] = await Promise.all([
        FieldValue.find({ submissionId: { $in: submissionIds } }).lean().exec(),
        FormTemplate.find({ _id: { $in: formObjectIds } }).lean().exec(),
      ]);

      const templatesMap = new Map(templates.map((t: any) => [t._id.toString(), t.name]));

      const fieldValuesBySubmission = new Map<string, any[]>();
      for (const val of fieldValues) {
        const subId = val.submissionId.toString();
        if (!fieldValuesBySubmission.has(subId)) {
          fieldValuesBySubmission.set(subId, []);
        }
        fieldValuesBySubmission.get(subId)!.push(val);
      }

      // Determine export title based on form template name
      if (formIdStrings.length === 1) {
        exportTitle = templatesMap.get(formIdStrings[0]) || "Submissions";
      } else {
        exportTitle = "Submissions";
      }

      data.forEach((doc: any) => {
        const docIdStr = doc._id.toString();
        const templateIdStr = doc.formTemplateId?.toString();
        const primaryRecord = doc.contactRecords?.[0];
        
        const formName = templatesMap.get(templateIdStr) || "Other Submissions";
        if (!groupedData[formName]) {
          groupedData[formName] = [];
        }

        // Build clean readable row
        const row: Record<string, any> = {
          "#": groupedData[formName].length + 1,
          "Form": formName,
          "Client Name": doc.clientName || primaryRecord?.name || "—",
          "Contact Name": primaryRecord?.name || "—",
          "Contact Email": primaryRecord?.email || "—",
          "Contact Phone": primaryRecord?.phone || doc.clientContact || "—",
          "Contact Address": primaryRecord?.contact || "—",
          "Contact Role": primaryRecord?.role || "—",
          "Contact Notes": primaryRecord?.notes || "—",
          "Status": doc.status || "—",
          "Submitted At": doc.submittedAt ? new Date(doc.submittedAt).toISOString() : "—",
          "Last Updated": doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "—",
        };

        // Append custom field values as named columns
        const customFields = fieldValuesBySubmission.get(docIdStr) || [];
        for (const fv of customFields) {
          const columnName = fv.fieldNameSnapshot || `Field_${fv.fieldDefinitionId}`;
          if (fv.mediaUrl) {
            row[columnName] = fv.mediaUrl;
          } else if (fv.mediaItems && fv.mediaItems.length > 0) {
            row[columnName] = fv.mediaItems.map((item: any) => item.url).join(", ");
          } else {
            let strVal = fv.value !== undefined && fv.value !== null ? String(fv.value) : "";
            if (strVal.length > 1000) {
              strVal = strVal.substring(0, 1000) + "... [Truncated]";
            }
            row[columnName] = strVal;
          }
        }

        let finalRow = row;
        // Intercept export for 'total passengers of the ship'
        if (formName.toLowerCase().includes("passenger")) {
          const passengerRow: Record<string, any> = {};
          passengerRow["#"] = row["#"];
          
          const findVal = (keywords: string[]) => {
             const key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw)));
             return key ? row[key] : "—";
          };

          passengerRow["Full Name"] = findVal(["full name", "client name", "contact name", "name"]);
          passengerRow["Date of Birth"] = findVal(["date of birth", "dob", "birth"]);
          passengerRow["Nationality"] = findVal(["nationality"]);
          passengerRow["Passport / National ID"] = findVal(["passport", "national id", "nationality id", "id number", "id"]);

          finalRow = passengerRow;
        }

        groupedData[formName].push(finalRow);
      });
    } else {
      // General flattening for other collections
      groupedData[exportTitle] = data.map((doc: any, index: number) => {
        const { _id, __v, ...rest } = doc;
        const flat = {};
        for (const [key, value] of Object.entries(rest)) {
          Object.assign(flat, flattenNestedData(value, key));
        }
        return { 
          "#": index + 1,
          id: _id?.toString(), 
          ...flat 
        };
      });
    }

    const format = searchParams.get("format") || "xlsx";
    let bodyContent: Buffer | string;
    let contentType: string;

    if (format === "xlsx") {
      const workbook = xlsx.utils.book_new();
      
      for (const [groupName, rows] of Object.entries(groupedData)) {
        // Clean sheet name to fit 31-char limit and exclude invalid characters (like :, ?, *, /, \)
        const cleanSheetName = groupName.replace(/[:\?\*\/\\\[\]]/g, "").substring(0, 31) || "Sheet1";
        const worksheet = xlsx.utils.json_to_sheet(rows);
        
        let finalSheetName = cleanSheetName;
        let counter = 1;
        while (workbook.SheetNames.includes(finalSheetName)) {
          finalSheetName = `${cleanSheetName.substring(0, 28)}_${counter}`;
          counter++;
        }
        
        xlsx.utils.book_append_sheet(workbook, worksheet, finalSheetName);
      }
      
      bodyContent = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (format === "csv") {
      const workbook = xlsx.utils.book_new();
      const allRows = Object.values(groupedData).flat();
      const worksheet = xlsx.utils.json_to_sheet(allRows);
      xlsx.utils.book_append_sheet(workbook, worksheet, "Data");
      
      bodyContent = xlsx.write(workbook, { type: "buffer", bookType: "csv" });
      contentType = "text/csv";
    } else if (format === "json") {
      bodyContent = JSON.stringify(groupedData, null, 2);
      contentType = "application/json";
    } else if (format === "pdf") {
      const doc = new jsPDF({ orientation: "landscape" });
      let fontName = "helvetica";
      const fontPath = path.join(process.cwd(), "public", "fonts", "Amiri-Regular.ttf");
      if (fs.existsSync(fontPath)) {
        const fontBuffer = fs.readFileSync(fontPath);
        const base64Font = fontBuffer.toString("base64");
        doc.addFileToVFS("Amiri-Regular.ttf", base64Font);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
        fontName = "Amiri";
      }

      doc.setProperties({ title: exportTitle });
      
      let startY = 14;
      let firstGroup = true;

      for (const [groupName, rows] of Object.entries(groupedData)) {
        if (!firstGroup) {
          doc.addPage();
          startY = 14;
        }
        firstGroup = false;

        doc.setFont(fontName);
        doc.setFontSize(16);
        doc.text(groupName, 14, startY + 4);
        doc.setFontSize(10);
        startY += 12;

        const headers = Array.from(
          rows.reduce<Set<string>>((keys, row) => {
            Object.keys(row).forEach((k) => keys.add(k));
            return keys;
          }, new Set<string>())
        );
        const pdfBody = rows.map((row) => headers.map((h) => String(row[h] ?? "")));

        autoTable(doc, {
          head: [headers],
          body: pdfBody,
          startY: startY,
          styles: { font: fontName, fontStyle: "normal", fontSize: headers.length > 12 ? 7 : 9, overflow: "linebreak", cellWidth: "wrap" },
          headStyles: { fontSize: headers.length > 12 ? 7 : 9 },
          horizontalPageBreak: true,
          horizontalPageBreakRepeat: 0,
          margin: { top: 14, left: 8, right: 8 },
        });
      }

      bodyContent = Buffer.from(doc.output("arraybuffer"));
      contentType = "application/pdf";
    } else {
      return NextResponse.json({ error: `Unsupported format: ${format}` }, { status: 400 });
    }

    const filename = `${exportTitle} data.${format}`;
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(bodyContent as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    logger.error(`Export failed for collection: ${error}`);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
