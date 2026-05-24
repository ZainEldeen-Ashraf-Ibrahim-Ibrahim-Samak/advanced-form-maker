import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env.mjs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash");

  const expectedHash = env.NEXT_PUBLIC_GOOGLE_HTML_VERIFICATION;

  if (!expectedHash || hash !== expectedHash) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(`google-site-verification: google${hash}.html`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
