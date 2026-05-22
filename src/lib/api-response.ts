import { NextResponse } from "next/server";

type ErrorDetails = Record<string, unknown> | unknown;

interface ErrorBody {
  success: false;
  error: string;
  code?: string;
  details?: ErrorDetails;
}

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  error: string,
  status = 500,
  code?: string,
  details?: ErrorDetails
): NextResponse<ErrorBody> {
  const body: ErrorBody = {
    success: false,
    error,
    ...(code ? { code } : {}),
    ...(details !== undefined ? { details } : {}),
  };

  return NextResponse.json(body, { status });
}

export function unauthorizedResponse(message = "Unauthorized"): NextResponse<ErrorBody> {
  return errorResponse(message, 401, "UNAUTHORIZED");
}

export function badRequestResponse(
  message = "Bad request",
  details?: ErrorDetails
): NextResponse<ErrorBody> {
  return errorResponse(message, 400, "BAD_REQUEST", details);
}
