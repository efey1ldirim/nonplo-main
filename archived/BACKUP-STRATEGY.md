# Production Backup & Recovery Strategy

## Database Backup Strategy

### Supabase Automatic Backups

✅ **Point-in-Time Recovery (PITR)**
- **Retention:** 7 gün
- **Frequency:** Continuous (transaction log streaming)
- **Recovery granularity:** Any point in time
- **Location:** Supabase managed, multi-region

✅ **Daily Full Backups**
- **Frequency:** Her gün 02:00 UTC
- **Retention:** 30 gün
- **Location:** Supabase managed storage
- **Encryption:** AES-256 at rest

### Manual Backup Procedures

```bash
# 1. Emergency Manual Backup
pg_dump $DATABASE_URL > backup-emergency-$(date +%Y%m%d-%H%M).sql

# 2. Calendar Data Specific Backup
pg_dump $DATABASE_URL \
  --table=user_google_calendars \
  --table=calendar_operations \
  --data-only > calendar-backup-$(date +%Y%m%d).sql

# 3. Schema-Only Backup
pg_dump $DATABASE_URL --schema-only > schema-backup-$(date +%Y%m%d).sql

# 4. Full Compressed Backup
pg_dump $DATABASE_URL | gzip > full-backup-$(date +%Y%m%d).sql.gz
```

### Backup Verification

```bash
# Test backup integrity
pg_restore --list backup-file.sql | head -20

# Verify table counts
psql $DATABASE_URL -c "
SELECT 
  'user_google_calendars' as table_name, COUNT(*) as row_count
FROM user_google_calendars
UNION ALL
SELECT 
  'calendar_operations' as table_name, COUNT(*) as row_count  
FROM calendar_operations
UNION ALL
SELECT 
  'agents' as table_name, COUNT(*) as row_count
FROM agents;
"
```

## Application Code Backup

### Replit Automatic Version Control

✅ **Git History**
- **Location:** Replit integrated git
- **Retention:** Unlimited (unless manually deleted)
- **Frequency:** Every code change auto-committed
- **Granularity:** File-level diffs

✅ **Checkpoint System**
- **Frequency:** Major changes automated
- **Retention:** Based on Replit plan
- **Recovery:** One-click rollback
- **Scope:** Full workspace state

### Manual Code Backups

```bash
# 1. Critical Changes Git Backup
git add .
git commit -m "BACKUP: Before production calendar integration deploy"
git tag "prod-deploy-$(date +%Y%m%d)"

# 2. Configuration Files Backup
mkdir -p backups/config-$(date +%Y%m%d)
cp server/config/production.ts backups/config-$(date +%Y%m%d)/
cp production.env.example backups/config-$(date +%Y%m%d)/
cp server/migrations/production-indexes.sql backups/config-$(date +%Y%m%d)/

# 3. Critical Business Logic Backup
mkdir -p backups/services-$(date +%Y%m%d)
cp server/services/CalendarService.ts backups/services-$(date +%Y%m%d)/
cp server/middleware/calendarMonitoring.ts backups/services-$(date +%Y%m%d)/
```

## Environment Configuration Backup

### Secrets Backup Strategy

⚠️ **CRITICAL:** Secrets asla plain text olarak store edilmez!

✅ **Recommended Approach:**
1. **Secure key management system** (production'da)
2. **Encrypted configuration store**
3. **Team access documentation** (who has what keys)
4. **Recovery procedure documentation**

```bash
# Secrets backup checklist (NEVER store actual values)
echo "Production Secrets Checklist:
- [ ] GOOGLE_CALENDAR_CLIENT_ID (Google Console)
- [ ] GOOGLE_CALENDAR_CLIENT_SECRET (Google Console) 
- [ ] CALENDAR_ENCRYPTION_KEY (32 bytes hex)
- [ ] SUPABASE_DB_PASSWORD (Supabase dashboard)
- [ ] NODE_ENV=production

Backup locations:
- Google OAuth: Google Cloud Console > Credentials
- Encryption keys: Secure password manager
- Database: Supabase project settings
" > secrets-backup-checklist.md
```

### Environment Recovery

```bash
# Production environment verification script
cat << 'EOF' > verify-production-env.sh
#!/bin/bash

echo "🔍 Production Environment Verification"
echo "======================================"

# Check critical environment variables
REQUIRED_VARS=(
  "GOOGLE_CALENDAR_CLIENT_ID"
  "GOOGLE_CALENDAR_CLIENT_SECRET" 
  "GOOGLE_CALENDAR_REDIRECT_URI"
  "CALENDAR_ENCRYPTION_KEY"
  "DATABASE_URL"
  "NODE_ENV"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "❌ Missing: $var"
  else
    echo "✅ Found: $var"
  fi
done

# Test database connection
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ Database connection: OK"
else
  echo "❌ Database connection: FAILED"
fi

# Test Google OAuth config
if [[ "$GOOGLE_CALENDAR_CLIENT_ID" =~ ^[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$ ]]; then
  echo "✅ Google Client ID format: OK"
else
  echo "❌ Google Client ID format: INVALID"
fi

echo "======================================"
EOF

chmod +x verify-production-env.sh
```

## Disaster Recovery Procedures

### Scenario 1: Database Corruption/Loss

```bash
# 1. Stop application
# 2. Create new Supabase database (if needed)
# 3. Restore from backup

# Full restore from PITR
# Supabase Dashboard > Database > Backups > Point-in-time recovery

# Manual restore from dump
createdb new_database
psql new_database < backup-file.sql

# Update DATABASE_URL
# Restart application
```

### Scenario 2: Application Code Issues

```bash
# 1. Replit Checkpoint Rollback
# Replit UI > Version History > Select checkpoint > Restore

# 2. Git-based rollback
git log --oneline -10  # Find last good commit
git reset --hard <commit-hash>

# 3. File-specific restore
git checkout <commit-hash> -- server/services/CalendarService.ts
```

### Scenario 3: Calendar Integration Failure

```bash
# 1. Check Google OAuth status
curl "https://oauth2.googleapis.com/tokeninfo?access_token=$TOKEN"

# 2. Verify database calendar connections
psql $DATABASE_URL -c "
SELECT 
  user_id, 
  agent_id, 
  google_email, 
  is_active,
  created_at
FROM user_google_calendars 
WHERE is_active = true;
"

# 3. Test calendar API
curl "https://your-domain.replit.app/api/calendar/health?agentId=uuid" \
  -H "Authorization: Bearer token"

# 4. Reset calendar connections (if needed)
psql $DATABASE_URL -c "
UPDATE user_google_calendars 
SET is_active = false 
WHERE user_id = 'problematic-user-id';
"
```

### Scenario 4: Complete Infrastructure Loss

#### Priority Order:
1. **Database recovery** (highest priority - user data)
2. **Application deployment** (code restore)
3. **Environment configuration** (secrets, env vars)
4. **Calendar connections** (users can reconnect)

#### Recovery Steps:
```bash
# 1. New Replit deployment
# - Create new Repl from GitHub backup
# - Or restore from Replit checkpoint

# 2. Database restoration
# - Create new Supabase project
# - Restore from backup
# - Update DATABASE_URL

# 3. Environment variables
# - Restore from Replit Secrets
# - Verify using verify-production-env.sh

# 4. Test deployment
npm run dev
# Verify all endpoints respond
# Test calendar OAuth flow
```

## Monitoring & Alerting

### Backup Health Monitoring

```bash
# Database backup verification (daily)
psql $DATABASE_URL -c "
SELECT 
  'Database Size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value
UNION ALL
SELECT 
  'Calendar Connections' as metric,
  COUNT(*)::text || ' active' as value
FROM user_google_calendars 
WHERE is_active = true
UNION ALL
SELECT 
  'Calendar Operations (24h)' as metric,
  COUNT(*)::text || ' operations' as value
FROM calendar_operations 
WHERE created_at > NOW() - INTERVAL '24 hours';
"
```

### Recovery Testing Schedule

- **Weekly:** Test backup restoration process
- **Monthly:** Full disaster recovery simulation  
- **Quarterly:** Update recovery documentation
- **Annually:** Review and update backup strategy

## Security Considerations

### Encrypted Backups

```bash
# Encrypt sensitive backups
pg_dump $DATABASE_URL | gpg --symmetric --cipher-algo AES256 > backup-encrypted.sql.gpg

# Decrypt for restore
gpg --decrypt backup-encrypted.sql.gpg | psql new_database
```

### Access Control

- **Database backups:** Supabase admin access only
- **Code backups:** Replit workspace owners only  
- **Secrets recovery:** Designated team members only
- **Audit logging:** All backup/restore operations logged

### Compliance

- **GDPR:** User data backup/deletion procedures
- **Data retention:** Automatic cleanup of old backups
- **Encryption:** All backups encrypted at rest and in transit