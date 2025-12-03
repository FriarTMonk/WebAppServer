# Database Connection Pooling Configuration

## Overview

Proper connection pool configuration is critical for production performance and stability. This document explains how to configure Prisma's connection pool for optimal performance.

---

## Understanding Connection Pooling

### What is Connection Pooling?

Connection pooling reuses database connections instead of creating new ones for each request. This significantly improves performance by:

- **Reducing latency:** Reusing existing connections (no TCP handshake, authentication overhead)
- **Managing resources:** Limiting total connections to prevent database overload
- **Improving throughput:** Serving more requests with fewer connections

### Prisma Connection Pool

Prisma uses a connection pool with these parameters:

| Parameter | Description | Default | Recommended |
|-----------|-------------|---------|-------------|
| `connection_limit` | Max connections in pool | Formula-based | 10 (dev), 20+ (prod) |
| `pool_timeout` | Max wait time for connection (seconds) | 10 | 20 |
| `connect_timeout` | Max time to establish connection (seconds) | 5 | 10 |

---

## Configuration

### Development Environment

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?connection_limit=10&pool_timeout=20&connect_timeout=10"
```

**Rationale:**
- `connection_limit=10`: Sufficient for local development
- `pool_timeout=20`: Generous timeout for debugging
- `connect_timeout=10`: Quick feedback if database is down

### Production Environment (AWS RDS)

```bash
DATABASE_URL="postgresql://user:password@rds-endpoint.amazonaws.com:5432/mydb?schema=public&sslmode=require&connection_limit=20&pool_timeout=20&connect_timeout=10"
```

**Additional requirements:**
- `sslmode=require`: Encrypt all database traffic
- `connection_limit=20`: Handle production load (2 ECS tasks × 10 connections)

### Calculating Connection Limit

#### Formula

```
connection_limit = (Number of ECS tasks) × (Connections per task)
```

#### Example Scenarios

**Small deployment (2 ECS tasks):**
```
connection_limit = 2 × 10 = 20
```

**Medium deployment (4 ECS tasks):**
```
connection_limit = 4 × 10 = 40
```

**Large deployment (10 ECS tasks):**
```
connection_limit = 10 × 10 = 100
```

#### RDS Connection Limits

AWS RDS limits connections based on instance size:

| Instance Type | Max Connections | Recommended App Pool |
|---------------|-----------------|---------------------|
| db.t4g.micro | 81 | 50 (62% of max) |
| db.t4g.small | 167 | 100 (60% of max) |
| db.t4g.medium | 335 | 200 (60% of max) |
| db.r6g.large | 677 | 400 (59% of max) |

**Rule of thumb:** Use 60% of max connections for application, reserve 40% for:
- Admin connections
- Background jobs
- Monitoring tools
- PgBouncer (if using)

---

## Monitoring Connection Usage

### Check Active Connections

```sql
-- Current active connections
SELECT COUNT(*) AS active_connections
FROM pg_stat_activity
WHERE datname = 'mychristiancounselor_production';

-- Connections by state
SELECT state, COUNT(*)
FROM pg_stat_activity
WHERE datname = 'mychristiancounselor_production'
GROUP BY state;

-- Long-running queries (> 1 minute)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE datname = 'mychristiancounselor_production'
  AND state = 'active'
  AND now() - pg_stat_activity.query_start > interval '1 minute'
ORDER BY duration DESC;
```

### CloudWatch Metrics

Monitor these RDS metrics:

- **DatabaseConnections:** Total active connections
- **DatabaseConnectionsBorrowTime:** Time waiting for connection
- **CPUUtilization:** Should stay under 70%
- **FreeableMemory:** Should not hit zero

### Alert Thresholds

Set up CloudWatch alarms:

```bash
# High connection usage (>80%)
aws cloudwatch put-metric-alarm \
  --alarm-name rds-high-connections \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 160 \  # 80% of db.t4g.small max (200)
  --comparison-operator GreaterThanThreshold

# Connection pool exhaustion
aws cloudwatch put-metric-alarm \
  --alarm-name prisma-pool-timeout \
  --metric-name PoolTimeout \
  --namespace Application \
  --statistic Sum \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

---

## Troubleshooting

### Problem: "Too many connections"

**Symptoms:**
```
Error: P1001: Can't reach database server
Error: remaining connection slots are reserved for non-replication superuser connections
```

**Diagnosis:**
```sql
-- Check total connections vs max
SELECT
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections,
  (SELECT count(*) FROM pg_stat_activity) AS current_connections,
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') -
  (SELECT count(*) FROM pg_stat_activity) AS available_connections;
```

**Solutions:**

1. **Immediate (reduce load):**
   ```bash
   # Scale down ECS tasks temporarily
   aws ecs update-service --desired-count 1
   ```

2. **Short-term (kill idle connections):**
   ```sql
   -- Kill idle connections older than 5 minutes
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE datname = 'mychristiancounselor_production'
     AND state = 'idle'
     AND state_change < current_timestamp - INTERVAL '5 minutes';
   ```

3. **Long-term (scale database):**
   - Upgrade RDS instance size
   - Add connection pooler (PgBouncer)
   - Reduce `connection_limit` per task

### Problem: "Timeout waiting for connection"

**Symptoms:**
```
Error: P1001: Can't reach database server
Error: Timed out fetching a new connection from the connection pool
```

**Diagnosis:**
```sql
-- Check for long-running queries
SELECT pid, query_start, state, query
FROM pg_stat_activity
WHERE datname = 'mychristiancounselor_production'
  AND state = 'active'
  AND query_start < NOW() - INTERVAL '30 seconds'
ORDER BY query_start;
```

**Solutions:**

1. **Increase pool timeout:**
   ```bash
   # Increase to 30 seconds
   DATABASE_URL="...?pool_timeout=30"
   ```

2. **Optimize slow queries:**
   ```sql
   -- Enable slow query logging
   ALTER DATABASE mychristiancounselor_production
   SET log_min_duration_statement = 1000;  -- Log queries > 1 second
   ```

3. **Add database indexes:**
   ```sql
   -- Example: Add index for frequently queried column
   CREATE INDEX CONCURRENTLY idx_sessions_user_id_status
   ON "Session" (user_id, status)
   WHERE status = 'active';
   ```

### Problem: Connection leaks

**Symptoms:**
- Connections never released
- Application slows down over time
- Connection pool exhausted

**Diagnosis:**
```sql
-- Find connections that have been idle too long
SELECT pid, usename, application_name, state, state_change
FROM pg_stat_activity
WHERE datname = 'mychristiancounselor_production'
  AND state = 'idle in transaction'
  AND state_change < NOW() - INTERVAL '10 minutes';
```

**Solutions:**

1. **Check Prisma client usage:**
   ```typescript
   // ❌ BAD: Creates new client each request
   export function handler(req, res) {
     const prisma = new PrismaClient();
     // ...
   }

   // ✅ GOOD: Reuse single client
   const prisma = new PrismaClient();
   export function handler(req, res) {
     // Use shared prisma client
   }
   ```

2. **Set connection timeout:**
   ```sql
   -- Set statement timeout to 30 seconds
   ALTER DATABASE mychristiancounselor_production
   SET statement_timeout = '30s';
   ```

---

## Advanced: Using PgBouncer

For high-traffic applications, consider adding PgBouncer as a connection pooler.

### Benefits
- Reduces RDS connection overhead
- Allows more application instances
- Better connection reuse

### Architecture

```
[ECS Tasks (50)] → [PgBouncer (1)] → [RDS (10 connections)]
```

### Configuration

```bash
# PgBouncer connection string
DATABASE_URL="postgresql://user:password@pgbouncer-endpoint:6432/mydb?connection_limit=5"

# PgBouncer config (pgbouncer.ini)
[databases]
mychristiancounselor = host=rds-endpoint.amazonaws.com port=5432 dbname=mychristiancounselor_production

[pgbouncer]
pool_mode = transaction
max_client_conn = 500
default_pool_size = 20
reserve_pool_size = 5
reserve_pool_timeout = 3
```

**When to use PgBouncer:**
- More than 10 ECS tasks
- Frequent connection churn
- Need more than 100 total connections

---

## Best Practices

### ✅ DO

1. **Set explicit connection limits:**
   ```bash
   DATABASE_URL="...?connection_limit=20"
   ```

2. **Use SSL in production:**
   ```bash
   DATABASE_URL="...?sslmode=require"
   ```

3. **Monitor connection usage:**
   - Set up CloudWatch alarms
   - Track connection pool metrics
   - Log slow queries

4. **Test connection pool under load:**
   ```bash
   # Load test with Artillery
   npm run test:load
   ```

5. **Use single Prisma client instance:**
   ```typescript
   // Global singleton
   import { PrismaClient } from '@prisma/client';
   export const prisma = new PrismaClient();
   ```

### ❌ DON'T

1. **Don't create multiple PrismaClient instances:**
   ```typescript
   // ❌ BAD
   function getUser() {
     const prisma = new PrismaClient();  // Creates new connection pool!
     return prisma.user.findMany();
   }
   ```

2. **Don't set connection_limit too high:**
   - RDS will reject connections over max_connections
   - Leave headroom for admin operations

3. **Don't ignore connection pool errors:**
   - Log all P1001 errors
   - Set up alerts for connection issues

4. **Don't forget to close Prisma on shutdown:**
   ```typescript
   process.on('SIGTERM', async () => {
     await prisma.$disconnect();
     process.exit(0);
   });
   ```

---

## Production Checklist

Before deploying to production:

- [ ] Set `connection_limit` based on ECS task count
- [ ] Enable `sslmode=require` in DATABASE_URL
- [ ] Set up CloudWatch alarms for high connection usage
- [ ] Test connection pool under load (>100 concurrent requests)
- [ ] Verify single PrismaClient instance across application
- [ ] Enable slow query logging in RDS
- [ ] Document connection pool configuration in deployment docs
- [ ] Set up monitoring dashboard for connection metrics

---

## Resources

- [Prisma Connection Pooling Docs](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-management)
- [AWS RDS Connection Limits](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html)
- [PostgreSQL Connection Pooling Best Practices](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
