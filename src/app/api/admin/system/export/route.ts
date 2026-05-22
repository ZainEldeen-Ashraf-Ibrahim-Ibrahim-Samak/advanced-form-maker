import { NextResponse } from "next/server";
import { flattenNestedData } from "@/lib/utils/exportUtils";
import * as xlsx from "xlsx";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/dev-logger";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const collection = searchParams.get("collection");

    if (!collection) {
      return NextResponse.json({ error: "Collection name is required" }, { status: 400 });
    }

    await connectToDatabase();
    
    // Ensure the model exists
    if (!mongoose.modelNames().includes(collection)) {
      return NextResponse.json({ error: "Invalid collection name" }, { status: 400 });
    }

    const Model = mongoose.model(collection);
    const data = await Model.find({}).lean().exec();

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No data found for collection" }, { status: 404 });
    }

    // Flatten nested data (like Map/transaction fields)
    const flattenedData = data.map((doc: any) => {
      // Removing MongoDB specific fields to make it cleaner
      const { _id, __v, ...rest } = doc;
      // We pass the document to flattenNestedData, but we want the keys to start empty
      const flat = {};
      for (const [key, value] of Object.entries(rest)) {
        Object.assign(flat, flattenNestedData(value, key));
      }
      return { id: _id?.toString(), ...flat };
    });

    // Generate XLSX workbook
    const worksheet = xlsx.utils.json_to_sheet(flattenedData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, collection.substring(0, 31)); // sheet names have a 31 char limit

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${collection}-export-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    logger.error(`Export failed for collection: ${error}`);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
