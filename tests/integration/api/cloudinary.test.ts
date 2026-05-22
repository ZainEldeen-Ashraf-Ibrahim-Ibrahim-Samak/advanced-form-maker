import { POST } from "@/app/api/cloudinary/sign/route";
import { signUploadRequest } from "@/data/services/cloudinary-service";

jest.mock("@/data/services/cloudinary-service");

describe("Cloudinary Sign API", () => {
  beforeEach(() => {
    (signUploadRequest as jest.Mock).mockReturnValue({ signature: "abc", timestamp: 123456 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("POST /api/cloudinary/sign returns signature", async () => {
    const req = new Request("http://localhost:3000/api/cloudinary/sign", {
      method: "POST",
      body: JSON.stringify({ timestamp: 123456 }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.signature).toBe("abc");
  });
});
