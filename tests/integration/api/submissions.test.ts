import { GET, PATCH, POST } from "@/app/api/submissions/[token]/route";
import { MongoSubmissionRepository } from "@/data/repositories/mongo-submission-repository";
import { auth } from "@/lib/auth";

jest.mock("@/lib/auth");
jest.mock("@/data/repositories/mongo-submission-repository");

describe("Submissions API Endpoints", () => {
  beforeEach(() => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/submissions/[token] handles errors", async () => {
    (MongoSubmissionRepository.prototype.findByToken as jest.Mock).mockRejectedValue(new Error("Test error"));
    const req = new Request("http://localhost:3000/api/submissions/token123");
    const res = await GET(req, { params: Promise.resolve({ token: "token123" }) });
    expect(res.status).toBe(500);
  });

  it("POST /api/submissions/[token] rejects malformed body", async () => {
    const req = new Request("http://localhost:3000/api/submissions/token123", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req, { params: Promise.resolve({ token: "token123" }) });
    expect([400, 500]).toContain(res.status);
  });

  it("PATCH /api/submissions/[token] rejects malformed body", async () => {
    const req = new Request("http://localhost:3000/api/submissions/token123", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await PATCH(req, { params: Promise.resolve({ token: "token123" }) });
    expect([400, 500]).toContain(res.status);
  });

  it("PATCH /api/submissions/[token] with stale precondition does not return success", async () => {
    const req = new Request("http://localhost:3000/api/submissions/token123", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "if-match-form-version": "1970-01-01T00:00:00.000Z",
      },
      body: JSON.stringify({
        clientName: "client",
        clientContact: "",
        contactRecords: [],
        fieldValues: [],
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ token: "token123" }) });
    expect(res.status).not.toBe(200);
  });

  it.todo("POST /api/submissions/[token] supports If-Match-Form-Version precondition checks");
  it.todo("PATCH /api/submissions/[token] returns stale-write conflicts for outdated versions");
});
