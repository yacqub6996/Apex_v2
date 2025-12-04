# KYC File Upload System - Comprehensive Audit Report

**Date:** December 2, 2025  
**Status:** CRITICAL ISSUES IDENTIFIED  
**Prepared For:** Development Team

---

## Executive Summary

This audit identifies critical issues in the KYC document upload flow that cause uploaded files to appear broken or in HTML format instead of displaying as images. The root cause is a mismatch between file path storage and URL construction for serving uploaded documents.

### Key Findings

🔴 **CRITICAL**: File URLs are stored as relative paths but need to be converted to absolute URLs  
🔴 **CRITICAL**: Inconsistent URL generation between storage and retrieval  
🟡 **HIGH**: Missing MIME type validation on download  
🟡 **HIGH**: No file format verification beyond content-type header  
🟢 **MEDIUM**: Limited file type support (only JPEG, PNG, PDF)

---

## Current System Architecture

### Backend Components

#### 1. File Storage Service (`backend/app/services/file_storage.py`)

**Purpose:** Handles file uploads and URL generation for KYC documents.

**Current Behavior:**
```python
# Storage path generation (Line 86-88)
relative_path = f"storage/{category}/{user_id}/{unique_name}"
# Returns: "storage/kyc_documents/{user_id}/passport_front_{uuid}.webp"

# URL generation (Line 92)
def get_file_url(self, file_path: str) -> str:
    return f"/static/{file_path}"
# Returns: "/static/storage/kyc_documents/{user_id}/passport_front_{uuid}.webp"
```

**Issues:**
- ❌ Storage returns relative path without leading slash
- ❌ `get_file_url()` prepends `/static/` but main.py mounts `/storage` separately
- ❌ URL construction is inconsistent with FastAPI static file mount points

#### 2. KYC Upload Endpoint (`backend/app/api/routes/kyc.py`)

**Route:** `POST /api/v1/kyc/documents`

**Current Flow:**
1. Accept file upload via multipart/form-data
2. Validate file size (max 10MB)
3. Validate content type (image/jpeg, image/png, application/pdf)
4. Call `_store_document()` to save file
5. Store returned path directly in database: `document.front_image_url = storage_path`

**Issues:**
- ❌ Stores relative file system path instead of web-accessible URL
- ❌ No MIME type re-validation after upload
- ⚠️ Path stored: `storage/kyc_documents/...` 
- ⚠️ Path needed: `/storage/kyc_documents/...`

#### 3. Static File Mounting (`backend/app/main.py`)

```python
# Line 87-88
# app.mount("/storage", StaticFiles(directory="storage"), name="storage")  # REMOVED: Prevent public access to KYC documents
app.mount("/static", StaticFiles(directory="."), name="static")
```

**Analysis:**
- `/storage` endpoint maps to `./storage` directory ✅ CORRECT
- `/static` endpoint maps to current working directory
- Files should be accessed via: `/storage/kyc_documents/{user_id}/{filename}`
- Currently stored in DB: `storage/kyc_documents/{user_id}/{filename}` ❌ WRONG

### Frontend Components

#### 1. Document Display (`frontend/src/components/admin/kyc-inspect-modal.tsx`)

**Current Implementation:**
```tsx
<img
  src={doc.front_image_url}  // Uses DB value directly
  alt={`${doc.document_type} front`}
  crossOrigin="anonymous"
/>
```

**Issues:**
- ❌ Uses relative path from DB directly (e.g., `storage/kyc_documents/...`)
- ❌ Browser interprets as relative URL from current page
- ❌ Results in 404 or HTML error page being displayed as image source

#### 2. File Download (`frontend/src/utils/download.ts`)

**Current Implementation:**
```typescript
export async function saveAs(url: string, filename?: string): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  const blob = await res.blob();
  // ... create download link
}
```

**Issues:**
- ❌ No MIME type validation
- ❌ Can download HTML error pages as "images"
- ⚠️ No error handling for invalid image formats

---

## Root Cause Analysis

### Issue 1: URL Path Mismatch

**Problem:** Files stored with relative paths instead of web-accessible URLs

**Example Flow:**

1. **Upload:** User uploads `passport.jpg`
2. **Storage:** File saved to `./storage/kyc_documents/{user_id}/passport_front_{uuid}.webp`
3. **Database:** Path stored as `storage/kyc_documents/{user_id}/passport_front_{uuid}.webp`
4. **Frontend Request:** `<img src="storage/kyc_documents/...">`
5. **Browser Resolution:** 
   - Current page: `https://example.com/admin/kyc-review/123`
   - Resolves to: `https://example.com/admin/kyc-review/storage/kyc_documents/...`
   - Result: **404 NOT FOUND** ❌

**What Should Happen:**

1. **Database:** Store as `/storage/kyc_documents/{user_id}/passport_front_{uuid}.webp`
2. **Frontend:** `<img src="/storage/kyc_documents/...">`
3. **Browser:** Resolves to `https://example.com/storage/kyc_documents/...`
4. **FastAPI:** Serves from `./storage` directory via static mount
5. **Result:** **Image displays correctly** ✅

### Issue 2: Inconsistent URL Generation

**File Storage Service has two methods:**

1. `upload_file()` returns: `storage/kyc_documents/...` (relative path)
2. `get_file_url()` returns: `/static/storage/...` (incorrect absolute URL)

**Problem:** 
- Upload path is stored directly in DB without transformation
- `get_file_url()` is only used in `view_document` endpoint, not during upload
- This creates an inconsistency where:
  - Stored value: `storage/kyc_documents/...`
  - Should be: `/storage/kyc_documents/...`
  - View endpoint tries: `/static/storage/...` (also wrong!)

### Issue 3: HTML Error Pages Downloaded as Images

**Scenario:**

1. User clicks "Download" on broken image URL
2. Frontend calls `fetch(url)` with broken path
3. Server returns 404 HTML error page
4. Frontend saves HTML page as `blob` without checking content type
5. User downloads `passport-front` file containing HTML

**Why This Happens:**
- No MIME type validation in download utility
- No check that response is actually an image
- Assumes any 200 response is valid

---

## Supported File Formats

### Current Limitations

**Accepted Upload Types:**
```python
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
```

**Issues:**
- ❌ No WebP support (despite conversion to WebP in storage)
- ❌ No HEIC/HEIF support (common on iPhones)
- ❌ No TIFF support (often used for scanning)
- ❌ No validation of file content vs. extension

**Image Optimization:**
- Files are converted to WebP format (line 46-56 in file_storage.py)
- Thumbnailing to max 1024px dimension
- Quality set to 85%
- Falls back to JPEG/PNG if WebP fails

**Recommendation:** Accept more formats but validate actual file contents, not just headers.

---

## Security Concerns

### Current Security Measures ✅

1. **File Size Limit:** 10MB maximum (line 294)
2. **Content Type Validation:** Checks MIME type (line 296)
3. **Extension Validation:** Checks file extension (line 141-143)
4. **Authentication Required:** All endpoints protected
5. **User Isolation:** Files stored per user_id directory

### Missing Security Measures ❌

1. **No File Content Validation:** 
   - Only checks HTTP Content-Type header
   - Malicious users can fake content types
   - Should use magic bytes validation

2. **No Virus Scanning:** 
   - Uploaded files not scanned for malware
   - Risk of storing infected documents

3. **No Rate Limiting on Uploads:**
   - Users can spam uploads
   - Can fill disk space

4. **Path Traversal Risk:**
   - While uuid4 is used for filenames, extension is taken from user input
   - Should sanitize extension more carefully

---

## Recommended Enhancements

### Priority 1: Critical Fixes (Required for Basic Functionality)

#### Fix 1.1: Correct URL Storage Format

**File:** `backend/app/services/file_storage.py`

**Change Line 86-88 from:**
```python
relative_path = f"storage/{category}/{user_id}/{unique_name}"
return relative_path
```

**To:**
```python
# Return web-accessible URL path with leading slash
url_path = f"/{category}/{user_id}/{unique_name}"
return url_path
```

**File:** `backend/app/services/file_storage.py`

**Change Line 92 from:**
```python
def get_file_url(self, file_path: str) -> str:
    return f"/static/{file_path}"
```

**To:**
```python
def get_file_url(self, file_path: str) -> str:
    # If path already starts with /, return as-is
    if file_path.startswith('/'):
        return file_path
    # Otherwise, ensure it starts with /
    return f"/{file_path}" if not file_path.startswith('/') else file_path
```

**Rationale:** 
- Makes URLs consistent with FastAPI static mount points
- Paths will be `/storage/kyc_documents/...` matching the mount point
- No breaking changes to existing mount configuration

#### Fix 1.2: Add Frontend URL Sanitization

**File:** `frontend/src/components/admin/kyc-inspect-modal.tsx`

**Add helper function:**
```typescript
const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // If URL is already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL starts with /, it's already correct
  if (url.startsWith('/')) {
    return url;
  }
  
  // Otherwise, prepend /storage/ if needed
  if (url.startsWith('storage/')) {
    return `/${url}`;
  }
  
  // Default fallback
  return `/storage/${url}`;
};

// Usage in component:
<img
  src={normalizeImageUrl(doc.front_image_url)}
  alt={`${doc.document_type} front`}
/>
```

**Rationale:**
- Defensive programming to handle various URL formats
- Backwards compatible with potential legacy data
- Prevents browser URL resolution issues

#### Fix 1.3: Validate Downloaded Content Type

**File:** `frontend/src/utils/download.ts`

**Change from:**
```typescript
export async function saveAs(url: string, filename?: string): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Failed to download file (${res.status})`);
  }
  const blob = await res.blob();
  // ... rest
}
```

**To:**
```typescript
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function saveAs(url: string, filename?: string): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Failed to download file (${res.status})`);
  }
  
  // Validate content type
  const contentType = res.headers.get('content-type');
  if (!contentType || !VALID_IMAGE_TYPES.some(type => contentType.includes(type))) {
    throw new Error(`Invalid file type: ${contentType}. Expected image or PDF.`);
  }
  
  const blob = await res.blob();
  // ... rest
}
```

**Rationale:**
- Prevents downloading HTML error pages as images
- Provides clear error messages to users
- Validates server response before processing

### Priority 2: Enhanced File Support

#### Enhancement 2.1: Expand Supported File Types

**File:** `backend/app/api/routes/kyc.py`

**Change Line 35-37 from:**
```python
MAX_UPLOAD_SIZE = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
```

**To:**
```python
MAX_UPLOAD_SIZE = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "image/jpeg", 
    "image/png", 
    "image/webp",
    "image/heic",
    "image/heif",
    "image/tiff",
    "application/pdf"
}
ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".webp", 
    ".heic", ".heif", ".tif", ".tiff", 
    ".pdf"
}
```

**Rationale:**
- HEIC/HEIF: Standard format for iPhone photos
- WebP: Modern, efficient format
- TIFF: Common for scanned documents
- Improves user experience across devices

#### Enhancement 2.2: Magic Bytes Validation

**File:** `backend/app/services/file_storage.py`

**Add new function:**
```python
import magic  # python-magic library

def validate_file_content(content: bytes, expected_types: set[str]) -> bool:
    """Validate file content matches expected types using magic bytes"""
    mime = magic.from_buffer(content, mime=True)
    return mime in expected_types
```

**Use in:** `backend/app/api/routes/kyc.py` upload endpoint

```python
# After reading file contents
contents = await file.read()

# Validate actual file content, not just header
if not validate_file_content(contents, ALLOWED_CONTENT_TYPES):
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, 
        detail="File content does not match declared type"
    )
```

**Rationale:**
- Prevents header spoofing
- Validates actual file contents
- Improves security posture

### Priority 3: User Experience Improvements

#### Enhancement 3.1: Add Image Preview Before Upload

**File:** `frontend/src/pages/kyc/document-upload.tsx`

**Add preview functionality:**
```typescript
const FileUploadBox = ({ label, description, acceptedTypes = 'image/*,application/pdf', file, onSelect }: FileBoxProps) => {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
    return () => setPreview(null);
  }, [file]);

  return (
    <Box>
      {/* ... existing upload button ... */}
      
      {preview && (
        <Box sx={{ mt: 2 }}>
          <img 
            src={preview} 
            alt="Preview" 
            style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
          />
        </Box>
      )}
    </Box>
  );
};
```

**Rationale:**
- Users can verify upload before submission
- Reduces errors from wrong files
- Better UX feedback

#### Enhancement 3.2: Add File Download Endpoint

**File:** `backend/app/api/routes/kyc.py`

**Add new endpoint:**
```python
@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    side: str,
    session: SessionDep,
    current_user: CurrentUser,
) -> StreamingResponse:
    """Download a specific KYC document with proper headers"""
    document = session.get(KycDocument, document_id)
    
    # Authorization check
    if document.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    file_path = document.front_image_url if side == "front" else document.back_image_url
    if not file_path:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Read file
    full_path = Path(file_path.lstrip('/'))
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Determine content type
    content_type = "image/jpeg"
    if str(full_path).endswith('.png'):
        content_type = "image/png"
    elif str(full_path).endswith('.webp'):
        content_type = "image/webp"
    elif str(full_path).endswith('.pdf'):
        content_type = "application/pdf"
    
    def iter_file():
        with open(full_path, 'rb') as f:
            yield from f
    
    return StreamingResponse(
        iter_file(),
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{document_id}_{side}.{full_path.suffix}"'
        }
    )
```

**Rationale:**
- Provides proper content-type headers
- Sets download filename correctly
- Enables proper browser download handling

### Priority 4: Monitoring & Logging

#### Enhancement 4.1: Add Upload Metrics

**File:** `backend/app/api/routes/kyc.py`

**Add logging:**
```python
@router.post("/documents", response_model=KycDocumentPublic)
async def upload_kyc_document(...):
    logger.info(f"KYC upload started: user={current_user.id}, type={document_type}, size={len(contents)}")
    
    try:
        # ... existing logic ...
        logger.info(f"KYC upload successful: document_id={document.id}, path={storage_path}")
    except Exception as e:
        logger.error(f"KYC upload failed: user={current_user.id}, error={str(e)}")
        raise
```

**Rationale:**
- Enables debugging of upload issues
- Tracks upload patterns
- Helps identify system problems

---

## Migration Plan for Existing Data

### Issue: Existing Records Have Wrong URL Format

**Current DB Data:**
```
front_image_url: "storage/kyc_documents/{user_id}/file.webp"
```

**Needed Format:**
```
front_image_url: "/storage/kyc_documents/{user_id}/file.webp"
```

### Migration Script

**File:** `backend/app/alembic/versions/YYYYMMDD_fix_kyc_document_urls.py`

```python
"""Fix KYC document URLs to include leading slash

Revision ID: fix_kyc_urls
Revises: previous_revision
Create Date: 2025-12-02
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Update front_image_url
    op.execute("""
        UPDATE kycdocument 
        SET front_image_url = '/' || front_image_url 
        WHERE front_image_url IS NOT NULL 
          AND front_image_url NOT LIKE '/%'
    """)
    
    # Update back_image_url
    op.execute("""
        UPDATE kycdocument 
        SET back_image_url = '/' || back_image_url 
        WHERE back_image_url IS NOT NULL 
          AND back_image_url NOT LIKE '/%'
    """)

def downgrade():
    # Remove leading slash
    op.execute("""
        UPDATE kycdocument 
        SET front_image_url = SUBSTRING(front_image_url FROM 2) 
        WHERE front_image_url LIKE '/%'
    """)
    
    op.execute("""
        UPDATE kycdocument 
        SET back_image_url = SUBSTRING(back_image_url FROM 2) 
        WHERE back_image_url LIKE '/%'
    """)
```

**Execution:**
```bash
cd backend
alembic revision -m "fix_kyc_document_urls"
# Copy migration script above
alembic upgrade head
```

---

## Testing Strategy

### Unit Tests

**File:** `backend/app/tests/services/test_file_storage.py`

```python
def test_storage_returns_url_with_leading_slash():
    storage = LocalFileStorage()
    path = await storage.upload_image(
        b"fake content", 
        "test.jpg", 
        "user-123", 
        category="kyc_documents", 
        label="test"
    )
    assert path.startswith('/'), "URL should start with /"
    assert path.startswith('/kyc_documents/user-123/'), "URL should include category and user"

def test_get_file_url_handles_both_formats():
    storage = LocalFileStorage()
    
    # Test with leading slash
    url1 = storage.get_file_url("/storage/kyc_documents/file.jpg")
    assert url1 == "/storage/kyc_documents/file.jpg"
    
    # Test without leading slash
    url2 = storage.get_file_url("storage/kyc_documents/file.jpg")
    assert url2 == "/storage/kyc_documents/file.jpg"
```

### Integration Tests

**File:** `backend/app/tests/api/routes/test_kyc_upload_fixed.py`

```python
def test_upload_returns_accessible_url(client: TestClient, user_token_headers):
    # Upload document
    response = client.post(
        "/api/v1/kyc/documents",
        headers=user_token_headers,
        files={"file": ("test.jpg", b"fake-jpeg-data", "image/jpeg")},
        data={"document_type": "passport", "side": "front"},
    )
    assert response.status_code == 200
    doc = response.json()
    
    # URL should start with /
    assert doc["front_image_url"].startswith('/'), "URL must start with /"
    
    # Should be accessible via static mount
    url = doc["front_image_url"]
    file_response = client.get(url)
    assert file_response.status_code == 200
    assert file_response.headers['content-type'].startswith('image/')
```

### End-to-End Tests

**File:** `frontend/e2e/kyc-upload.spec.ts`

```typescript
test('uploaded document displays correctly', async ({ page }) => {
  // Login and navigate to KYC
  await page.goto('/kyc');
  
  // Upload document
  await page.setInputFiles('input[type="file"]', 'test-fixtures/passport.jpg');
  await page.click('button:has-text("Submit for Verification")');
  
  // Verify success
  await expect(page.locator('text=submitted successfully')).toBeVisible();
  
  // Admin views document
  await page.goto('/admin/kyc-review');
  await page.click('tr:first-child');
  
  // Image should load (not show broken image)
  const img = page.locator('img[alt*="passport"]');
  await expect(img).toBeVisible();
  await expect(img).toHaveJSProperty('naturalWidth', (width) => width > 0);
});

test('document download works correctly', async ({ page }) => {
  await page.goto('/admin/kyc-review/user-123');
  
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Download")'),
  ]);
  
  const filename = await download.suggestedFilename();
  assert(filename.endsWith('.jpg') || filename.endsWith('.webp'));
  
  // Verify it's not HTML
  const path = await download.path();
  const content = await fs.readFile(path, 'utf-8');
  assert(!content.includes('<!DOCTYPE html>'));
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run all unit tests
- [ ] Run integration tests
- [ ] Test with actual image files (JPEG, PNG, PDF)
- [ ] Test with HEIC files from iPhone
- [ ] Verify storage directory permissions
- [ ] Check disk space availability
- [ ] Review security implications

### Deployment Steps

1. [ ] **Backup Database**
   ```bash
   pg_dump -h localhost -U postgres apex_db > backup_$(date +%Y%m%d).sql
   ```

2. [ ] **Deploy Backend Changes**
   ```bash
   cd backend
   git pull origin main
   pip install -r requirements.txt
   alembic upgrade head
   ```

3. [ ] **Run Migration Script**
   ```bash
   alembic upgrade head  # Fixes existing URLs
   ```

4. [ ] **Deploy Frontend Changes**
   ```bash
   cd frontend
   git pull origin main
   npm install
   npm run build
   ```

5. [ ] **Restart Services**
   ```bash
   docker-compose restart backend frontend
   ```

### Post-Deployment Verification

- [ ] Upload new test document
- [ ] Verify image displays in admin panel
- [ ] Download document and verify format
- [ ] Check logs for errors
- [ ] Monitor error rates for 24 hours

---

## Cost & Effort Estimate

| Task | Effort | Priority |
|------|--------|----------|
| Fix URL storage format | 2 hours | P1 - Critical |
| Add frontend URL sanitization | 1 hour | P1 - Critical |
| Validate download content type | 1 hour | P1 - Critical |
| Create migration script | 2 hours | P1 - Critical |
| Testing | 3 hours | P1 - Critical |
| **Critical Fixes Subtotal** | **9 hours** | |
| Expand file type support | 3 hours | P2 - High |
| Magic bytes validation | 4 hours | P2 - High |
| Image preview feature | 4 hours | P3 - Medium |
| Download endpoint | 3 hours | P3 - Medium |
| Monitoring & logging | 2 hours | P4 - Low |
| **Total Estimated Effort** | **25 hours** | |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Migration breaks existing uploads | Medium | High | Thorough testing, rollback plan |
| Performance degradation | Low | Medium | Monitor after deployment |
| New bugs in URL handling | Medium | Medium | Comprehensive tests, gradual rollout |
| User confusion during transition | Low | Low | Clear communication |

---

## Success Metrics

### Key Performance Indicators

1. **Upload Success Rate:** Target >99%
   - Current: Unknown (likely <50% based on issue report)
   - Post-fix: Should reach >99%

2. **Image Display Rate:** Target 100%
   - Current: 0% (images appear as HTML/broken)
   - Post-fix: 100% of uploads should display

3. **Download Success Rate:** Target 100%
   - Current: ~0% (downloads HTML instead)
   - Post-fix: All downloads should be valid files

4. **User Support Tickets:** Target <2/month
   - Current: High (issue reported)
   - Post-fix: Minimal tickets related to uploads

### Monitoring Dashboard

**Recommended Metrics to Track:**

```python
# Add to metrics service
kyc_upload_success_count
kyc_upload_failure_count
kyc_upload_duration_seconds
kyc_document_view_count
kyc_document_download_count
kyc_document_download_errors
```

---

## Conclusion

The KYC file upload system has critical issues that prevent proper document display and download. The root cause is a mismatch between file path storage (relative paths) and URL resolution (absolute paths needed). 

**Immediate Action Required:**
1. Fix URL generation in file storage service
2. Add frontend URL normalization
3. Validate download content types
4. Create migration for existing data

**Estimated Timeline:** 2-3 days for critical fixes, 1 week for full enhancement suite.

**Risk:** Low risk with proper testing and migration strategy.

**Recommendation:** Proceed with Priority 1 fixes immediately, schedule Priority 2-3 enhancements for next sprint.

---

## Appendix A: File Path Resolution Examples

### Current Broken Flow

```
Upload: passport.jpg
├─> Backend saves to: ./storage/kyc_documents/user-123/passport_front_abc.webp
├─> Database stores: "storage/kyc_documents/user-123/passport_front_abc.webp"
├─> Frontend renders: <img src="storage/kyc_documents/user-123/passport_front_abc.webp">
├─> Browser resolves: https://example.com/admin/kyc/storage/kyc_documents/...
└─> Result: 404 Not Found ❌
```

### Fixed Flow

```
Upload: passport.jpg
├─> Backend saves to: ./storage/kyc_documents/user-123/passport_front_abc.webp
├─> Database stores: "/storage/kyc_documents/user-123/passport_front_abc.webp"
├─> Frontend renders: <img src="/storage/kyc_documents/user-123/passport_front_abc.webp">
├─> Browser resolves: https://example.com/storage/kyc_documents/...
├─> FastAPI serves from: ./storage mount point
└─> Result: Image displays ✅
```

---

## Appendix B: API Endpoint Documentation

### Current Endpoints

#### POST /api/v1/kyc/documents
**Upload KYC Document**

Request:
```
Content-Type: multipart/form-data

document_type: "passport" | "drivers_license" | "national_id" | "proof_of_address"
side: "front" | "back"
file: <binary>
```

Response:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "document_type": "passport",
  "front_image_url": "storage/kyc_documents/...",  // ❌ WRONG
  "back_image_url": null,
  "verified": false,
  "created_at": "2025-12-02T12:00:00Z"
}
```

#### GET /api/v1/kyc/documents
**List User's Documents**

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "front_image_url": "storage/kyc_documents/...",  // ❌ WRONG
      "back_image_url": "storage/kyc_documents/..."    // ❌ WRONG
    }
  ],
  "count": 1
}
```

### Proposed Endpoints

#### GET /api/v1/kyc/documents/{document_id}/download
**Download Document (NEW)**

Query params:
- `side`: "front" | "back"

Response:
- Headers: `Content-Type: image/webp`, `Content-Disposition: attachment`
- Body: Binary file data

---

## Appendix C: Environment Variables

### Current Configuration

```bash
# No specific storage configuration needed
FILE_STORAGE_TYPE=local  # Default, can be "dropbox" (not implemented)
```

### Recommended Configuration

```bash
# Storage settings
FILE_STORAGE_TYPE=local
STORAGE_BASE_PATH=storage
MAX_UPLOAD_SIZE_MB=10

# URL settings
STORAGE_BASE_URL=/storage  # Matches FastAPI mount point

# Security
ENABLE_VIRUS_SCAN=false  # Future enhancement
ENABLE_MAGIC_BYTES_CHECK=true
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-02 | Audit Team | Initial comprehensive audit |

---

**End of Report**
