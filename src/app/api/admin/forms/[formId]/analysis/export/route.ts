import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/dev-logger";
import { FormTemplateModel } from "@/data/models/form-template.model";
import { FormAnalysisModel } from "@/data/models/form-analysis.model";
import mongoose from "mongoose";
import * as xlsx from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

// Import models to register them
import "@/data/models/submission.model";
import "@/data/models/field-value.model";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { formId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    if (!format || !["pdf", "csv", "xlsx", "json"].includes(format)) {
      return NextResponse.json({ error: "Invalid format parameter", code: "INVALID_FORMAT" }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Fetch Form Template
    const formTemplate = await FormTemplateModel.findById(formId).lean().exec();
    if (!formTemplate) {
      return NextResponse.json({ error: "Form template not found", code: "FORM_NOT_FOUND" }, { status: 404 });
    }

    // 2. Fetch Submissions
    const SubmissionModel = mongoose.model("Submission");
    const FieldValueModel = mongoose.model("FieldValue");

    const submissions = await SubmissionModel.find({ formTemplateId: formTemplate._id })
      .sort({ submittedAt: -1 })
      .lean()
      .exec();

    // 3. Fetch/Compute Stats & Narrative
    let analysis = (await FormAnalysisModel.findOne({ formTemplateId: formTemplate._id }).lean().exec()) as any;

    let submissionCount = submissions.length;
    let submissionDateRange = analysis?.submissionDateRange || null;
    let topAnswers = analysis?.topAnswers || null;

    // If no analysis exists, or stats are not computed, compute them on-the-fly
    if (!submissionDateRange || !topAnswers) {
      if (submissionCount > 0) {
        let earliest = submissions[0].submittedAt;
        let latest = submissions[0].submittedAt;
        for (const sub of submissions) {
          const date = sub.submittedAt;
          if (date < earliest) earliest = date;
          if (date > latest) latest = date;
        }
        submissionDateRange = { earliest, latest };

        // Compute top answers
        const submissionIds = submissions.map((s) => s._id);
        const allFieldValues = await FieldValueModel.find({ submissionId: { $in: submissionIds } }).lean().exec();
        const valueCountsMap = new Map<string, Map<string, number>>();
        for (const fv of allFieldValues) {
          const fieldName = fv.fieldNameSnapshot || fv.fieldDefinitionId;
          let valStr = "";
          if (fv.mediaUrl) {
            valStr = "[File/Image]";
          } else if (fv.mediaItems && fv.mediaItems.length > 0) {
            valStr = `[${fv.mediaItems.length} File(s)]`;
          } else if (Array.isArray(fv.value)) {
            valStr = fv.value.join(", ");
          } else if (fv.value !== null && fv.value !== undefined) {
            valStr = String(fv.value).trim();
          }

          if (valStr) {
            if (!valueCountsMap.has(fieldName)) {
              valueCountsMap.set(fieldName, new Map<string, number>());
            }
            const counts = valueCountsMap.get(fieldName)!;
            counts.set(valStr, (counts.get(valStr) || 0) + 1);
          }
        }

        const computedTopAnswers: any[] = [];
        for (const [fieldLabel, counts] of valueCountsMap.entries()) {
          const sorted = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          
          for (const [topValue, count] of sorted) {
            computedTopAnswers.push({
              fieldLabel,
              topValue,
              count,
            });
          }
        }
        topAnswers = computedTopAnswers;
      }
    }

    const aiSummary = analysis?.summary || "No AI analysis has been run yet";
    const aiPatterns = analysis?.patterns || [];
    const aiFindings = analysis?.findings || [];
    const aiSentiment = analysis?.sentimentOverview || "No AI analysis has been run yet";

    // 4. Fetch field values for table data
    const submissionIds = submissions.map((s) => s._id);
    const fieldValues = await FieldValueModel.find({ submissionId: { $in: submissionIds } }).lean().exec();
    const fieldValuesBySubmission = new Map<string, any[]>();
    for (const val of fieldValues) {
      const subId = val.submissionId.toString();
      if (!fieldValuesBySubmission.has(subId)) {
        fieldValuesBySubmission.set(subId, []);
      }
      fieldValuesBySubmission.get(subId)!.push(val);
    }

    // Reconstruct raw submissions rows
    const rawRows = submissions.map((sub: any, index: number) => {
      const contactRecords = sub.contactRecords || [];
      const contact = contactRecords.find((record: any) => record.email || record.phone || record.contact) || {};
      const primaryContactName = contactRecords[0]?.name || "";

      const row: Record<string, any> = {
        "#": index + 1,
        "Client Name": sub.clientName || primaryContactName || "—",
        "Email": contact.email || "—",
        "Phone": contact.phone || sub.clientContact || "—",
        "Address": contact.contact || "—",
        "Status": sub.status || "—",
        "Submitted At": sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : "—",
      };

      const customFields = fieldValuesBySubmission.get(sub._id.toString()) || [];
      for (const fv of customFields) {
        const columnName = fv.fieldNameSnapshot || `Field_${fv.fieldDefinitionId}`;
        if (fv.mediaUrl) {
          row[columnName] = fv.mediaUrl;
        } else if (fv.mediaItems && fv.mediaItems.length > 0) {
          row[columnName] = fv.mediaItems.map((item: any) => item.url).join(", ");
        } else {
          row[columnName] = fv.value !== undefined && fv.value !== null ? String(fv.value) : "";
        }
      }

      return row;
    });

    let bodyContent: Buffer | string;
    let contentType: string;

    const filename = `${formTemplate.name} analysis.${format}`;
    const encodedFilename = encodeURIComponent(filename);

    if (format === "json") {
      const combinedReport = {
        formName: formTemplate.name,
        stats: {
          totalSubmissions: submissionCount,
          dateRange: submissionDateRange ? {
            earliest: submissionDateRange.earliest,
            latest: submissionDateRange.latest
          } : null,
          topAnswers: topAnswers || []
        },
        aiNarrative: {
          summary: aiSummary,
          patterns: aiPatterns,
          findings: aiFindings,
          sentimentOverview: aiSentiment
        },
        submissions: rawRows
      };
      bodyContent = JSON.stringify(combinedReport, null, 2);
      contentType = "application/json";
    } 
    else if (format === "xlsx" || format === "csv") {
      // Create a sheet content as array of arrays
      const sheetData: any[][] = [];
      sheetData.push([`Analysis Report: ${formTemplate.name}`]);
      sheetData.push([]);
      
      // Stats Section
      sheetData.push(["Computed Statistics"]);
      sheetData.push(["Total Submissions", submissionCount]);
      sheetData.push([
        "Date Range", 
        submissionDateRange 
          ? `${new Date(submissionDateRange.earliest).toLocaleDateString()} - ${new Date(submissionDateRange.latest).toLocaleDateString()}` 
          : "No submissions yet"
      ]);
      
      if (topAnswers && topAnswers.length > 0) {
        sheetData.push(["Top Answers"]);
        topAnswers.forEach((ta: any) => {
          sheetData.push(["", `${ta.fieldLabel}: ${ta.topValue} (${ta.count} times)`]);
        });
      }
      sheetData.push([]);

      // AI Narrative Section
      sheetData.push(["AI Analysis Narrative"]);
      sheetData.push(["Summary", aiSummary]);
      sheetData.push(["Sentiment Overview", aiSentiment]);
      
      if (aiPatterns.length > 0) {
        sheetData.push(["Patterns"]);
        aiPatterns.forEach((p: string) => {
          sheetData.push(["", p]);
        });
      }
      
      if (aiFindings.length > 0) {
        sheetData.push(["Findings"]);
        aiFindings.forEach((f: string) => {
          sheetData.push(["", f]);
        });
      }
      sheetData.push([]);
      sheetData.push([]);

      // Raw Submissions Section
      sheetData.push(["Raw Submissions Data"]);
      
      if (rawRows.length > 0) {
        const headers = Object.keys(rawRows[0]);
        sheetData.push(headers);
        rawRows.forEach((row) => {
          sheetData.push(headers.map((h) => row[h]));
        });
      } else {
        sheetData.push(["No submissions found"]);
      }

      const worksheet = xlsx.utils.aoa_to_sheet(sheetData);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Analysis");

      if (format === "xlsx") {
        bodyContent = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else {
        bodyContent = xlsx.write(workbook, { type: "buffer", bookType: "csv" });
        contentType = "text/csv";
      }
    } 
    else if (format === "pdf") {
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

      doc.setFont(fontName);
      doc.setProperties({ title: `${formTemplate.name} Analysis` });

      // Title
      doc.setFontSize(18);
      doc.text(`Analysis Report: ${formTemplate.name}`, 14, 15);

      // Section: Computed Stats
      doc.setFontSize(14);
      doc.text("Computed Statistics", 14, 25);
      
      doc.setFontSize(10);
      doc.text(`Total Submissions: ${submissionCount}`, 14, 32);
      
      const dateRangeStr = submissionDateRange 
        ? `${new Date(submissionDateRange.earliest).toLocaleDateString()} - ${new Date(submissionDateRange.latest).toLocaleDateString()}`
        : "No submissions yet";
      doc.text(`Date Range: ${dateRangeStr}`, 14, 38);

      let currentY = 44;
      if (topAnswers && topAnswers.length > 0) {
        doc.text("Top Answers:", 14, currentY);
        currentY += 6;
        topAnswers.slice(0, 5).forEach((ta: any) => {
          doc.text(`• ${ta.fieldLabel}: ${ta.topValue} (${ta.count} times)`, 20, currentY);
          currentY += 5;
        });
      }

      // Section: AI Narrative
      currentY += 5;
      doc.setFontSize(14);
      doc.text("AI Analysis Narrative", 14, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.text("Summary:", 14, currentY);
      currentY += 5;
      const splitSummary = doc.splitTextToSize(aiSummary, 180);
      doc.text(splitSummary, 14, currentY);
      currentY += splitSummary.length * 5;

      doc.text("Sentiment Overview:", 14, currentY);
      currentY += 5;
      const splitSentiment = doc.splitTextToSize(aiSentiment, 180);
      doc.text(splitSentiment, 14, currentY);
      currentY += splitSentiment.length * 5;

      if (aiPatterns.length > 0) {
        doc.text("Key Patterns:", 14, currentY);
        currentY += 5;
        aiPatterns.forEach((p: string) => {
          const splitP = doc.splitTextToSize(`• ${p}`, 175);
          doc.text(splitP, 16, currentY);
          currentY += splitP.length * 5;
        });
      }

      if (aiFindings.length > 0) {
        doc.text("Marketing Findings:", 14, currentY);
        currentY += 5;
        aiFindings.forEach((f: string) => {
          const splitF = doc.splitTextToSize(`• ${f}`, 175);
          doc.text(splitF, 16, currentY);
          currentY += splitF.length * 5;
        });
      }

      // Section: Raw Submissions
      currentY += 10;
      doc.setFontSize(14);
      doc.text("Raw Submissions Data", 14, currentY);
      
      const headers = Object.keys(rawRows[0] || {});
      const pdfBody = rawRows.map((row) => headers.map((h) => String(row[h] || "")));

      autoTable(doc, {
        head: [headers],
        body: pdfBody,
        startY: currentY + 5,
        styles: { font: fontName, fontStyle: "normal", fontSize: 9 },
      });

      bodyContent = Buffer.from(doc.output("arraybuffer"));
      contentType = "application/pdf";
    } else {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    return new NextResponse(bodyContent as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    logger.error("Failed to export analysis", error);
    return NextResponse.json({ error: "Failed to export analysis" }, { status: 500 });
  }
}
