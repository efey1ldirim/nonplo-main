# Production Migration Guide

## Adım 1: Environment Variables Setup

### Replit Secrets Tool ile Environment Variables Ekleme

1. **Replit workspace'de Secrets tool'unu aç**
2. **Aşağıdaki secret'ları ekle:**

```bash
# Google Calendar OAuth
GOOGLE_CALENDAR_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CALENDAR_CLIENT_SECRET=your-google-oauth-client-secret  
GOOGLE_CALENDAR_REDIRECT_URI=https://your-domain.replit.app/auth/google/callback

# Calendar Encryption Key (generate new)
CALENDAR_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Production Environment
NODE_ENV=production
```

### Encryption Key Generation

```bash
# Local'de encryption key oluştur:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Adım 2: Google OAuth Setup

### Google Cloud Console Configuration

1. **Google Cloud Console'a git:** https://console.cloud.google.com
2. **Proje seç veya yeni proje oluştur**
3. **APIs & Services > Credentials**
4. **OAuth 2.0 Client IDs oluştur:**
   - Application type: Web application
   - Authorized redirect URIs: `https://your-domain.replit.app/auth/google/callback`
5. **Scopes ekle:**
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`

## Adım 3: Database Migration

### Mevcut Schema Deploy

```bash
# Schema değişikliklerini push et
npm run db:push

# Eğer data-loss warning alırsan:
npm run db:push --force
```

### Index Optimizations Apply

```bash
# Production indexes uygula (PostgreSQL console'dan)
psql $DATABASE_URL -f server/migrations/production-indexes.sql
```

### Verify Migration

```bash
# Tabloları kontrol et
npm run db:studio

# Index'leri kontrol et (PostgreSQL console)
\di user_google_calendars*
\di calendar_operations*
```

## Adım 4: Production Configuration

### Environment Verification

```bash
# Production config'i test et
node -e "
const { createProductionConfig } = require('./server/config/production.ts');
try {
  const config = createProductionConfig();
  console.log('✅ Configuration valid');
} catch (e) {
  console.error('❌ Configuration error:', e.message);
}
"
```

### Rate Limiting Test

```bash
# Rate limiting middleware test
curl -X GET "https://your-domain.replit.app/api/calendar/status" \
  -H "Authorization: Bearer your-token"
```

## Adım 5: Monitoring Setup

### Analytics Endpoints Test

```bash
# Calendar analytics
curl "https://your-domain.replit.app/api/calendar/analytics?days=7" \
  -H "Authorization: Bearer your-token"

# Health check
curl "https://your-domain.replit.app/api/calendar/health?agentId=uuid" \
  -H "Authorization: Bearer your-token"
```

### Error Alerting Verification

```bash
# Error metrics kontrolü
curl "https://your-domain.replit.app/api/calendar/analytics" \
  -H "Authorization: Bearer your-token" | jq '.alertStatus'
```

## Adım 6: Security Verification

### CORS Configuration

- Google OAuth domains CSP'ye eklenmiş olmalı
- Rate limiting aktif olmalı
- Request sanitization çalışıyor olmalı

### Token Encryption Test

```bash
# Token'ların encrypt edildiğini doğrula
psql $DATABASE_URL -c "SELECT google_access_token FROM user_google_calendars LIMIT 1;"
# Encrypted base64 string gözükmeli, plain text olmamalı
```

## Adım 7: Performance Monitoring

### Database Performance

```sql
-- Index kullanım stats
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read 
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(tablename) DESC;
```

### API Response Times

```bash
# Calendar API response time test
time curl "https://your-domain.replit.app/api/calendar/status" \
  -H "Authorization: Bearer your-token"
```

## Adım 8: Backup Strategy

### Database Backup

```bash
# Manuel backup (production'da automated olmalı)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Supabase'de automatic backups aktif
# Point-in-time recovery 7 gün
```

### Code Backup

- Replit otomatik git history tutuyor
- Critical changes için manual git commits
- Production deployment öncesi snapshot al

## Adım 9: Deployment Checklist

### Pre-deployment

- [ ] Environment variables set
- [ ] Google OAuth configured  
- [ ] Database migrated
- [ ] Indexes applied
- [ ] Configuration tested
- [ ] Security verified

### Post-deployment

- [ ] Calendar connection test
- [ ] OAuth flow test
- [ ] Event creation test
- [ ] Monitoring endpoints test
- [ ] Error alerting test
- [ ] Performance metrics check

### Rollback Plan

1. **Replit checkpoint kullan** (automatic)
2. **Database restore** (Supabase point-in-time)
3. **Environment variables revert**
4. **DNS/domain rollback** (if needed)

## Production Troubleshooting

### Common Issues

1. **OAuth callback 403:**
   - Google Console redirect URI kontrol et
   - HTTPS requirement verify et

2. **Token encryption errors:**
   - CALENDAR_ENCRYPTION_KEY format kontrol et
   - 64 hex chars olması gerekli

3. **Rate limiting false positives:**
   - User IP whitelist kontrol et
   - Rate limit thresholds adjust et

4. **Database connection issues:**
   - Supabase connection pool kontrol et
   - Max connections ayarı kontrol et

### Monitoring Commands

```bash
# Live logs
tail -f /var/log/replit.log

# Database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Memory usage
free -h

# Calendar operations success rate
psql $DATABASE_URL -c "
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE success = true) as successful,
  ROUND(COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*), 2) as success_rate
FROM calendar_operations 
WHERE created_at > NOW() - INTERVAL '24 hours';
"
```