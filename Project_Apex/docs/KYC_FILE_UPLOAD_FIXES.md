# KYC File Upload - Quick Fix Guide

**For Immediate Implementation**

---

## Problem Summary

Users upload KYC documents, but:
- ❌ Images appear broken in admin review panel
- ❌ Downloaded files contain HTML error pages instead of images
- ❌ Files stored correctly on disk but URLs are wrong

**Root Cause:** File paths stored without leading `/`, causing browser URL resolution to fail.

---

## Quick Fix (30 Minutes)

### Step 1: Fix Backend URL Generation

**File:** `backend/app/services/file_storage.py`

**Line 86-88, change from:**
```python
relative_path = f"storage/{category}/{user_id}/{unique_name}"
logger.info(f"Returning relative_path: {relative_path}")
return relative_path
```

**To:**
```python
url_path = f"/{category}/{user_id}/{unique_name}"
logger.info(f"Returning url_path: {url_path}")
return url_path
```

**Line 92, change from:**
```python
def get_file_url(self, file_path: str) -> str:
    """Get local file URL (for development)"""
    return f"/static/{file_path}"
```

**To:**
```python
def get_file_url(self, file_path: str) -> str:
    """Get local file URL (for development)"""
    # Ensure path starts with /
    if file_path.startswith('/'):
        return file_path
    return f"/{file_path}"
```

### Step 2: Create Database Migration

**File:** `backend/app/alembic/versions/20251202_fix_kyc_document_urls.py`

```python
"""Fix KYC document URLs to include leading slash

Revision ID: fix_kyc_urls
Revises: <current_head>
Create Date: 2025-12-02
"""
from alembic import op

revision = 'fix_kyc_urls'
down_revision = '<insert_current_head_revision_here>'
branch_labels = None
depends_on = None

def upgrade():
    # Update front_image_url - prepend / to paths that don't start with /
    op.execute("""
        UPDATE kycdocument 
        SET front_image_url = '/' || front_image_url 
        WHERE front_image_url IS NOT NULL 
          AND front_image_url NOT LIKE '/%'
          AND front_image_url LIKE 'storage/%'
    """)
    
    # Update back_image_url - prepend / to paths that don't start with /
    op.execute("""
        UPDATE kycdocument 
        SET back_image_url = '/' || back_image_url 
        WHERE back_image_url IS NOT NULL 
          AND back_image_url NOT LIKE '/%'
          AND back_image_url LIKE 'storage/%'
    """)

def downgrade():
    # Remove leading slash from paths
    op.execute("""
        UPDATE kycdocument 
        SET front_image_url = SUBSTRING(front_image_url FROM 2) 
        WHERE front_image_url LIKE '/storage/%'
    """)
    
    op.execute("""
        UPDATE kycdocument 
        SET back_image_url = SUBSTRING(back_image_url FROM 2) 
        WHERE back_image_url LIKE '/storage/%'
    """)
```

### Step 3: Run Migration

```bash
cd backend
alembic upgrade head
```

### Step 4: Restart Backend

```bash
docker compose restart backend
# or
systemctl restart apex-backend
```

---

## Testing

### Test 1: Upload New Document

```bash
# Upload via API
curl -X POST http://localhost:8000/api/v1/kyc/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "document_type=passport" \
  -F "side=front" \
  -F "file=@test.jpg"
```

**Expected Response:**
```json
{
  "front_image_url": "/storage/kyc_documents/user-123/...",  // ✅ Starts with /
  ...
}
```

### Test 2: View in Browser

1. Login as admin
2. Go to `/admin/kyc-review`
3. Click on any pending application
4. **Expected:** Images display correctly
5. **Expected:** Download button saves actual image file

---

## Verification Checklist

- [ ] New uploads have URLs starting with `/storage/`
- [ ] Images display in admin panel
- [ ] Downloads provide actual image files (not HTML)
- [ ] No errors in backend logs
- [ ] Existing documents also work (after migration)

---

## Rollback Plan

If issues occur:

```bash
cd backend
alembic downgrade -1  # Roll back the migration
git checkout HEAD~1 -- app/services/file_storage.py
docker compose restart backend
```

---

## Additional Enhancements (Optional)

### Add Content-Type Validation to Downloads

**File:** `frontend/src/utils/download.ts`

```typescript
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function saveAs(url: string, filename?: string): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Failed to download file (${res.status})`);
  }
  
  // Validate content type
  const contentType = res.headers.get('content-type') || '';
  if (!VALID_TYPES.some(type => contentType.includes(type))) {
    throw new Error(`Invalid file type received: ${contentType}`);
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
```

### Add URL Sanitization Helper (Defensive)

**File:** `frontend/src/utils/url.ts`

```typescript
export function normalizeDocumentUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Already absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Already has leading slash
  if (url.startsWith('/')) {
    return url;
  }
  
  // Add leading slash to storage paths
  if (url.startsWith('storage/')) {
    return `/${url}`;
  }
  
  // Default: assume it needs /storage/ prefix
  return `/storage/${url}`;
}
```

**Usage in component:**
```typescript
import { normalizeDocumentUrl } from '@/utils/url';

<img src={normalizeDocumentUrl(doc.front_image_url)} alt="..." />
```

---

## Timeline

| Step | Time | Status |
|------|------|--------|
| 1. Backend code changes | 15 min | ⬜ |
| 2. Create migration | 10 min | ⬜ |
| 3. Run migration | 2 min | ⬜ |
| 4. Restart services | 3 min | ⬜ |
| 5. Testing | 15 min | ⬜ |
| **Total** | **45 min** | |

---

## Support

If issues arise:
1. Check backend logs: `docker compose logs backend | grep -i kyc`
2. Check migration status: `cd backend && alembic current`
3. Verify static mount: Check `app/main.py` line 87-88
4. Test file access: `curl http://localhost:8000/storage/kyc_documents/...`

---

**For full context, see:** [KYC_FILE_UPLOAD_AUDIT.md](./KYC_FILE_UPLOAD_AUDIT.md)
