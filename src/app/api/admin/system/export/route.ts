import { NextResponse } from "next/server";
import { flattenNestedData } from "@/lib/utils/exportUtils";
import * as xlsx from "xlsx";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/dev-logger";

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

    // Query filter (e.g. filter submissions by formId if provided)
    const queryFilter: Record<string, any> = {};
    if (targetModelName === "Submission" && formId) {
      try {
        queryFilter.formTemplateId = new mongoose.Types.ObjectId(formId);
      } catch (e) {
        queryFilter.formTemplateId = formId;
      }
    }

    const Model = mongoose.model(targetModelName);
    const data = await Model.find(queryFilter).lean().exec();

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No data found for collection" }, { status: 404 });
    }

    let flattenedData: Record<string, any>[] = [];
    let exportTitle = targetModelName;

    // Special handling for Submission to merge custom fields and form names
    if (targetModelName === "Submission") {
      const FieldValue = mongoose.model("FieldValue");
      const FormTemplate = mongoose.model("FormTemplate");

      const [fieldValues, templates] = await Promise.all([
        FieldValue.find({}).lean().exec(),
        FormTemplate.find({}).lean().exec(),
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
      const uniqueFormIds = Array.from(
        new Set(data.map((doc: any) => doc.formTemplateId?.toString()).filter(Boolean))
      );
      if (uniqueFormIds.length === 1) {
        exportTitle = templatesMap.get(uniqueFormIds[0]) || "Submissions";
      } else {
        exportTitle = "Submissions";
      }

      flattenedData = data.map((doc: any, index: number) => {
        const { _id, __v, ...rest } = doc;
        const flat: Record<string, any> = {};

        // Merge Form Template Name
        const templateIdStr = doc.formTemplateId?.toString();
        flat["Form Template"] = templatesMap.get(templateIdStr) || "—";

        // Flatten normal submission fields
        for (const [key, value] of Object.entries(rest)) {
          Object.assign(flat, flattenNestedData(value, key));
        }

        // Merge custom field values
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
    } else {
      // General flattening for other collections
      flattenedData = data.map((doc: any, index: number) => {
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

    // Clean sheet name to fit 31-char limit and exclude invalid characters (like :, ?, *, /, \)
    const cleanSheetName = exportTitle
      .replace(/[:\?\*\/\\\[\]]/g, "")
      .substring(0, 31) || "Sheet1";

    // Generate XLSX workbook
    const worksheet = xlsx.utils.json_to_sheet(flattenedData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Clean filename for the Content-Disposition header
    const safeFilename = exportTitle
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\u0600-\u06FF-_]/g, "");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeFilename)}-data.xlsx"`,
      },
    });
  } catch (error) {
    logger.error(`Export failed for collection: ${error}`);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
