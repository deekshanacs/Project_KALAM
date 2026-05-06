# Deployment Architecture — Unit 4: Backend AI, Chat & Documents
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 4 deployment architecture covers the `/uploads` directory persistence on Railway/Render, the `ANTHROPIC_API_KEY` environment variable management, file size limits, and the recommendation to migrate to S3 for production file storage.

---

## 2. /uploads Directory on Railway/Render

### 2.1 Current State: Ephemeral Storage

**Railway and Render free/hobby tiers use ephemeral filesystems.** This means:
- The `/uploads` directory is created fresh on each deployment
- All uploaded files are lost when the service restarts or redeploys
- This is a significant limitation for production use

### 2.2 Mitigation for MVP

For MVP, the ephemeral storage limitation is acceptable because:
- The system is in development/demo mode
- File URLs stored in the database will return 404 after a redeploy (known limitation)
- The README documents this limitation clearly

### 2.3 Railway Volume (Paid Feature)

Railway offers persistent volumes on paid plans:

```toml
# railway.toml (with volume)
[deploy]
startCommand = "..."

[[volumes]]
mountPath = "/app/uploads"
```

With a volume, the `/uploads` directory persists across deployments and restarts.

### 2.4 Render Persistent Disk (Paid Feature)

Render offers persistent disks on paid plans:

```yaml
# render.yaml (with disk)
services:
  - type: web
    name: tms-backend
    disk:
      name: uploads
      mountPath: /opt/render/project/src/uploads
      sizeGB: 10
```

### 2.5 Future Enhancement: S3 Migration

For production, the recommended approach is to migrate file storage to Amazon S3 or compatible object storage (Cloudflare R2, Backblaze B2):

**Migration plan**:
1. Install `@aws-sdk/client-s3` or `@aws-sdk/lib-storage`
2. Replace `multer.diskStorage` with `multer-s3` or a custom storage engine
3. Update file URLs to S3 presigned URLs or public bucket URLs
4. Remove the `/uploads` static file serving middleware
5. Update `UPLOAD_DIR` env var to S3 bucket configuration

**This is documented as a future enhancement and is NOT implemented in MVP.**

---

## 3. ANTHROPIC_API_KEY Environment Variable

### 3.1 Setting in Railway

In the Railway dashboard:
1. Navigate to your service
2. Click "Variables"
3. Add `ANTHROPIC_API_KEY` with your production API key
4. Railway encrypts the value at rest

### 3.2 Setting in Render

In the Render dashboard:
1. Navigate to your service
2. Click "Environment"
3. Add `ANTHROPIC_API_KEY` as a secret environment variable
4. Mark it as "Secret" to prevent it from appearing in logs

In `render.yaml`:
```yaml
envVars:
  - key: ANTHROPIC_API_KEY
    sync: false  # Must be set manually in dashboard (not in render.yaml)
```

**Why `sync: false`?** The `render.yaml` is committed to source control. Setting `sync: false` means the value is NOT stored in the YAML file — it must be set manually in the Render dashboard. This prevents the API key from appearing in source control.

### 3.3 API Key Rotation

When rotating the Anthropic API key:
1. Generate a new key in the Anthropic console
2. Update the environment variable in Railway/Render
3. Trigger a redeploy (the new key takes effect on restart)
4. Revoke the old key in the Anthropic console

There is no downtime during rotation because the new key is set before the old one is revoked.

---

## 4. File Size Limits

### 4.1 Express Body Parser Limit

```typescript
// backend/src/app.ts
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

This limits JSON request bodies to 10MB. This is relevant for the document content (TipTap JSON) which could be large for complex documents.

### 4.2 Multer File Size Limit

```typescript
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB
  },
});
```

This limits individual file uploads to 10MB.

### 4.3 Railway/Render Request Size Limits

Railway and Render have their own request size limits at the load balancer level:
- Railway: 100MB default (configurable)
- Render: 100MB default

The application-level 10MB limit is more restrictive than the platform limit, so the application limit takes effect first.

### 4.4 Nginx Buffering

Railway and Render use nginx as a reverse proxy. For streaming responses, nginx buffering must be disabled:

```typescript
res.setHeader('X-Accel-Buffering', 'no');
```

For file uploads, nginx buffers the entire request before forwarding to the application. This means large file uploads may appear slow — the client uploads to nginx first, then nginx forwards to the application.

---

## 5. Environment Variables for Unit 4

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes (for AI routes) | Anthropic Claude API key |
| `UPLOAD_DIR` | No (default: `./uploads`) | Directory for uploaded files |

All other environment variables are inherited from Unit 2.

---

## 6. Deployment Checklist (Unit 4)

- [ ] `ANTHROPIC_API_KEY` set in Railway/Render dashboard (not in source code)
- [ ] `UPLOAD_DIR` set to absolute path on Railway/Render (e.g., `/app/uploads`)
- [ ] Express body parser limit set to 10MB
- [ ] Multer file size limit set to 10MB
- [ ] `X-Accel-Buffering: no` header set on streaming responses
- [ ] `/uploads` directory created on startup (startup script)
- [ ] Ephemeral storage limitation documented in README
- [ ] AI routes return 503 if `ANTHROPIC_API_KEY` is not set
- [ ] File cleanup after AI processing (temp files deleted)
- [ ] DOCX generation tested with various page sizes and fonts
- [ ] WebRTC signaling tested with two browser clients

---

## 7. Production Limitations Summary

| Feature | MVP State | Production Recommendation |
|---|---|---|
| File storage | Ephemeral (lost on redeploy) | Migrate to S3/R2 |
| AI file processing | Temp files deleted after use | No change needed |
| DOCX generation | In-memory, no persistence | No change needed |
| Notifications | In-memory, lost on refresh | Add DB persistence |
| Login attempt tracking | In-memory, lost on restart | Migrate to Redis |
| Socket.io rooms | Single instance | Add Redis adapter |

All limitations are documented and acceptable for MVP. The architecture is designed to be incrementally improved without major refactoring.
