const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function saveAs(url: string, filename?: string): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Failed to download file (${res.status})`);
  }
  
  // Validate content type to prevent downloading HTML error pages
  const contentType = res.headers.get('content-type') || '';
  if (!VALID_IMAGE_TYPES.some(type => contentType.includes(type))) {
    throw new Error(`Invalid file type received: ${contentType}. Expected image or PDF.`);
  }
  
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename || "document";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
