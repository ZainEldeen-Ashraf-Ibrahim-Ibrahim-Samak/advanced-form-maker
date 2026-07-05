export interface UploadImageResult {
  secure_url: string;
  public_id: string;
}

export async function uploadImageToCloudinary(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<UploadImageResult> {
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fieldType: "image",
      folder,
      timestamp: Math.round(Date.now() / 1000),
    }),
  });
  const signData = await signRes.json();
  if (!signRes.ok || !signData.success) {
    throw new Error("Failed to get upload signature");
  }

  const { signature, timestamp, apikey, cloudname, folder: resolvedFolder, uploadPreset, resourceType } = signData.data;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apikey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", resolvedFolder);
  if (uploadPreset) formData.append("upload_preset", uploadPreset);
  formData.append("resource_type", resourceType || "image");

  const cloudUrl = `https://api.cloudinary.com/v1_1/${cloudname}/${resourceType || "image"}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", cloudUrl);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress?.(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ secure_url: parsed.secure_url, public_id: parsed.public_id });
        } else {
          reject(new Error(parsed.error?.message || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}
