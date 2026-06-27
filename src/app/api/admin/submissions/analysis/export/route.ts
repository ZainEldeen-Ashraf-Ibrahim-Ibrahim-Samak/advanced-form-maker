import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/dev-logger";
import { SubmissionModel } from "@/data/models/submission.model";
import { FormTemplateModel } from "@/data/models/form-template.model";
import { MongoFieldValueRepository } from "@/data/repositories/mongo-field-value-repository";
import { analyzeFormSubmissions } from "@/data/services/ai-form-analysis-service";
import mongoose from "mongoose";
import * as xlsx from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

const fieldValueRepo = new MongoFieldValueRepository();

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");
    const status = searchParams.get("status") || "all";
    const adminName = searchParams.get("admin") || "all";
    const formId = searchParams.get("formId") || "all";
    const locale = searchParams.get("locale") || "ar";

    if (!format || !["pdf", "csv", "xlsx", "json"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format parameter", code: "INVALID_FORMAT" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 1. Fetch Form Templates to map Form Names
    const templates = await FormTemplateModel.find({}).lean().exec();
    const formNamesById: Record<string, string> = {};
    for (const t of templates) {
      formNamesById[t._id.toString()] = t.name;
    }

    // 2. Fetch Submissions
    const filter: mongoose.FilterQuery<Record<string, unknown>> = {};
    
    if (status && status !== "all") {
      filter.status = status;
    }

    if (formId && formId !== "all") {
      filter.formTemplateId = formId;
    }

    let docs = await SubmissionModel.find(filter)
      .sort({ submittedAt: -1 })
      .limit(500)
      .lean();

    // Post-filter by admin updater if needed
    if (adminName && adminName !== "all") {
      docs = docs.filter((doc) => {
        const auditTrail = doc.auditTrail || [];
        if (auditTrail.length > 0) {
          const updatedEntry = [...auditTrail]
            .reverse()
            .find((entry: any) => entry.newStatus === doc.status);
          if (updatedEntry) {
            return updatedEntry.adminName === adminName;
          }
        }
        return false;
      });
    }

    if (docs.length === 0) {
      return NextResponse.json(
        { error: "No submissions found for the current filters.", code: "NO_SUBMISSIONS" },
        { status: 400 }
      );
    }

    // 3. Fetch Field Values & Reconstruct rows
    const detailedSubmissions = await Promise.all(
      docs.map(async (doc) => {
        const values = await fieldValueRepo.findBySubmissionId(doc._id.toString());
        const fieldValues: Record<string, any> = {};
        
        for (const fv of values) {
          const fieldName = fv.fieldNameSnapshot || fv.fieldDefinitionId;
          if (fv.mediaUrl) {
            fieldValues[fieldName] = { value: fv.mediaUrl };
          } else if (fv.mediaItems && fv.mediaItems.length > 0) {
            fieldValues[fieldName] = { value: fv.mediaItems.map((item) => item.url).join(", ") };
          } else {
            fieldValues[fieldName] = { value: fv.value };
          }
        }

        const contactRecords = doc.contactRecords || [];
        return {
          _id: doc._id.toString(),
          contactData: {
            name: doc.clientName || "",
            phone: doc.clientContact || "",
            email: contactRecords[0]?.email || "",
            address: contactRecords[0]?.contact || "",
          },
          fieldValues,
          createdAt: doc.submittedAt || new Date(),
        };
      })
    );

    // 4. Run AI Analysis
    const aiResult = await analyzeFormSubmissions(detailedSubmissions, locale);

    // Compute Date Range
    let earliest = docs[0].submittedAt || new Date();
    let latest = docs[0].submittedAt || new Date();
    for (const sub of docs) {
      const date = sub.submittedAt || new Date();
      if (date < earliest) earliest = date;
      if (date > latest) latest = date;
    }
    const submissionDateRange = { earliest, latest };

    // Format raw rows for export
    const rawRows: Record<string, any>[] = docs.map((sub: any, index: number) => {
      const contactRecords = sub.contactRecords || [];
      const contact = contactRecords.find((record: any) => record.email || record.phone || record.contact) || {};
      const primaryContactName = (contactRecords[0] as any)?.name || "";

      return {
        "#": index + 1,
        "Form Name": formNamesById[sub.formTemplateId?.toString()] || "—",
        "Client Name": sub.clientName || primaryContactName || "—",
        "Email": contact.email || "—",
        "Phone": contact.phone || sub.clientContact || "—",
        "Address": contact.contact || "—",
        "Status": sub.status || "—",
        "Submitted At": sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : "—",
      };
    });

    let bodyContent: Buffer | string;
    let contentType: string;

    const filename = `submissions analysis report.${format}`;
    const encodedFilename = encodeURIComponent(filename);

    if (format === "json") {
      const combinedReport = {
        title: "Submissions AI Analysis Report",
        stats: {
          totalSubmissions: docs.length,
          dateRange: {
            earliest: submissionDateRange.earliest,
            latest: submissionDateRange.latest,
          },
        },
        aiNarrative: {
          summary: aiResult.summary,
          patterns: aiResult.patterns,
          findings: aiResult.findings,
          sentimentOverview: aiResult.sentimentOverview,
        },
        submissions: rawRows,
      };
      bodyContent = JSON.stringify(combinedReport, null, 2);
      contentType = "application/json";
    } 
    else if (format === "xlsx" || format === "csv") {
      const sheetData: any[][] = [];
      sheetData.push(["Submissions AI Analysis Report"]);
      sheetData.push([]);
      
      sheetData.push(["Computed Statistics"]);
      sheetData.push(["Total Submissions", docs.length]);
      sheetData.push([
        "Date Range",
        `${new Date(submissionDateRange.earliest).toLocaleDateString()} - ${new Date(submissionDateRange.latest).toLocaleDateString()}`,
      ]);
      sheetData.push([]);

      sheetData.push(["AI Analysis Narrative"]);
      sheetData.push(["Summary", aiResult.summary]);
      sheetData.push(["Sentiment Overview", aiResult.sentimentOverview]);
      
      if (aiResult.patterns.length > 0) {
        sheetData.push(["Patterns"]);
        aiResult.patterns.forEach((p: string) => {
          sheetData.push(["", p]);
        });
      }
      
      if (aiResult.findings.length > 0) {
        sheetData.push(["Findings"]);
        aiResult.findings.forEach((f: string) => {
          sheetData.push(["", f]);
        });
      }
      sheetData.push([]);
      sheetData.push([]);

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
      doc.setProperties({ title: "Submissions AI Analysis Report" });

      doc.setFontSize(18);
      doc.text("Submissions AI Analysis Report", 14, 15);

      doc.setFontSize(14);
      doc.text("Computed Statistics", 14, 25);
      
      doc.setFontSize(10);
      doc.text(`Total Submissions: ${docs.length}`, 14, 32);
      
      const dateRangeStr = `${new Date(submissionDateRange.earliest).toLocaleDateString()} - ${new Date(submissionDateRange.latest).toLocaleDateString()}`;
      doc.text(`Date Range: ${dateRangeStr}`, 14, 38);

      let currentY = 48;
      doc.setFontSize(14);
      doc.text("AI Analysis Narrative", 14, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.text("Summary:", 14, currentY);
      currentY += 5;
      const splitSummary = doc.splitTextToSize(aiResult.summary, 180);
      doc.text(splitSummary, 14, currentY);
      currentY += splitSummary.length * 5 + 4;

      doc.text("Sentiment Overview:", 14, currentY);
      currentY += 5;
      const splitSentiment = doc.splitTextToSize(aiResult.sentimentOverview, 180);
      doc.text(splitSentiment, 14, currentY);
      currentY += splitSentiment.length * 5 + 4;

      if (aiResult.patterns.length > 0) {
        doc.text("Key Patterns:", 14, currentY);
        currentY += 5;
        aiResult.patterns.forEach((p: string) => {
          const splitP = doc.splitTextToSize(`• ${p}`, 175);
          doc.text(splitP, 16, currentY);
          currentY += splitP.length * 5;
        });
      }

      if (aiResult.findings.length > 0) {
        currentY += 4;
        doc.text("Marketing Findings:", 14, currentY);
        currentY += 5;
        aiResult.findings.forEach((f: string) => {
          const splitF = doc.splitTextToSize(`• ${f}`, 175);
          doc.text(splitF, 16, currentY);
          currentY += splitF.length * 5;
        });
      }

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
    logger.error("Failed to export submissions analysis", error);
    return NextResponse.json({ error: "Failed to export submissions analysis" }, { status: 500 });
  }
}
