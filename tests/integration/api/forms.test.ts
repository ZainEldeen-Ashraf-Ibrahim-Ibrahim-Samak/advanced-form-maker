import { GET, POST } from "@/app/api/admin/forms/route";
import { GET as getForm } from "@/app/api/admin/forms/[formId]/route";
import { MongoFormTemplateRepository } from "@/data/repositories/mongo-form-template-repository";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

jest.mock("@/lib/auth");
jest.mock("@/data/repositories/mongo-form-template-repository");

describe("Forms API Endpoints", () => {
  beforeEach(() => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/admin/forms returns 200", async () => {
    (MongoFormTemplateRepository.prototype.findAll as jest.Mock).mockResolvedValue([]);
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
