# Redis Configuration for MyChristianCounselor

## Production Configuration

### Current Settings (as of 2026-01-17)

```json
{
  "redis": {
    "image": "redis:7-alpine",
    "command": [
      "redis-server",
      "--maxmemory", "256mb",
      "--maxmemory-policy", "noeviction",
      "--appendonly", "yes",
      "--appendfsync", "everysec"
    ],
    "ports": {
      "6379": "TCP"
    }
  }
}
```

### Configuration Breakdown

| Setting | Value | Purpose |
|---------|-------|---------|
| `maxmemory` | 256mb | Maximum memory Redis can use |
| `maxmemory-policy` | noeviction | Prevent data loss by refusing writes when full |
| `appendonly` | yes | Enable AOF (Append-Only File) persistence |
| `appendfsync` | everysec | Sync AOF to disk every second |

## Why noeviction Policy is Critical

### The Problem with allkeys-lru

Previously, Redis was configured with `allkeys-lru` (Least Recently Used) eviction policy:

**Critical Issues:**
- **Job Data Loss**: BullMQ stores job data in Redis. Under memory pressure, Redis would evict this data.
- **Lost Error Information**: Job failure details could be evicted, making debugging impossible.
- **Broken Retry Logic**: Jobs that failed would lose their retry state and never execute.
- **Silent Failures**: Jobs would disappear without trace or notification.

**Real-World Impact:**
- Book evaluation jobs never completing
- Email jobs being lost
- No record of what went wrong

### The Solution: noeviction Policy

With `noeviction`, Redis refuses new writes when memory is full rather than evicting existing data:

**Benefits:**
- **Data Integrity**: Job data is never lost
- **Predictable Failures**: Applications get clear errors when memory is full
- **Debugging**: Full error history preserved
- **Retry Logic**: Job retry state maintained

**Trade-off:**
- Applications must handle memory exhaustion errors
- Requires active monitoring and capacity planning

## AOF Persistence

### What is AOF?

AOF (Append-Only File) logs every write operation to disk. If Redis restarts, it replays the AOF to restore data.

**Configuration:**
- `--appendonly yes`: Enable AOF
- `--appendfsync everysec`: Sync to disk every second

### Trade-offs

**Pros:**
- Data survives Redis restarts
- Maximum 1 second of data loss in crash scenarios
- Better durability than snapshots alone

**Cons:**
- Slight performance overhead (minimal with everysec)
- AOF file grows over time (Redis rewrites periodically)

### AOF vs RDB

Redis supports two persistence modes:

| Feature | AOF (Append-Only File) | RDB (Snapshots) |
|---------|----------------------|-----------------|
| Durability | Better (1 sec loss max) | Worse (minutes of loss) |
| Recovery Speed | Slower | Faster |
| File Size | Larger | Smaller |
| Performance Impact | Higher | Lower |
| Use Case | Critical data | Caches, non-critical |

We use AOF because BullMQ job data is critical and cannot be lost.

## Monitoring

### Key Metrics to Track

1. **Memory Usage**
   ```bash
   redis-cli INFO memory | grep used_memory_human
   ```

2. **Eviction Events** (should be 0 with noeviction)
   ```bash
   redis-cli INFO stats | grep evicted_keys
   ```

3. **Memory Fragmentation**
   ```bash
   redis-cli INFO memory | grep mem_fragmentation_ratio
   ```

4. **Connected Clients**
   ```bash
   redis-cli INFO clients | grep connected_clients
   ```

5. **AOF Status**
   ```bash
   redis-cli INFO persistence | grep aof_enabled
   ```

### Connecting to Production Redis

From Lightsail API container:

```bash
# Get a shell in the API container
aws lightsail get-container-log \
  --service-name api \
  --container-name api \
  --region us-east-2

# Or use AWS SSM if configured
# Then from inside the container:
redis-cli -h localhost -p 6379
```

### Monitoring Commands

Once connected to Redis:

```redis
# Check memory usage
INFO memory

# Check eviction stats
INFO stats

# Check persistence status
INFO persistence

# Check connected clients
INFO clients

# View current config
CONFIG GET maxmemory
CONFIG GET maxmemory-policy

# Monitor real-time commands
MONITOR
```

## Memory Exhaustion Response

### Symptoms

When Redis memory is full with noeviction policy:

**Application Errors:**
```
Error: OOM command not allowed when used memory > 'maxmemory'
```

**BullMQ Behavior:**
- New jobs cannot be added to queue
- Existing jobs continue processing
- Job completions cannot update state

**User Impact:**
- Cannot create new book evaluation requests
- Cannot send new emails
- Existing jobs complete but state not updated

### Immediate Response

1. **Check Current Memory Usage**
   ```bash
   redis-cli INFO memory | grep used_memory_human
   ```

2. **Identify Large Keys**
   ```bash
   redis-cli --bigkeys
   ```

3. **Check Job Queue Stats**
   ```bash
   # From inside API container
   npm run queue:stats
   ```

4. **Clear Completed Jobs** (if safe)
   ```bash
   # From inside API container
   npm run queue:clean
   ```

### Short-Term Fix

Increase Redis memory limit:

1. Edit `lightsail-api-deployment.json`:
   ```json
   "--maxmemory", "512mb",
   ```

2. Deploy:
   ```bash
   aws lightsail create-container-service-deployment \
     --service-name api \
     --cli-input-json file://lightsail-api-deployment.json \
     --region us-east-2
   ```

### Long-Term Solutions

1. **Optimize Job Retention**
   - Review BullMQ job retention settings
   - Clean completed jobs more aggressively
   - Archive job data to PostgreSQL

2. **Scale Redis**
   - Upgrade to larger Lightsail service tier
   - Consider AWS ElastiCache for dedicated Redis

3. **Implement Monitoring**
   - Set up CloudWatch alerts for memory usage
   - Alert when memory > 80% of limit
   - Track job queue depth over time

## Configuration Changes

### How to Change Redis Configuration

1. **Edit Configuration**
   ```bash
   # Edit lightsail-api-deployment.json
   vim lightsail-api-deployment.json
   ```

2. **Validate JSON**
   ```bash
   cat lightsail-api-deployment.json | python3 -m json.tool > /dev/null
   ```

3. **Deploy**
   ```bash
   aws lightsail create-container-service-deployment \
     --service-name api \
     --cli-input-json file://lightsail-api-deployment.json \
     --region us-east-2
   ```

4. **Monitor Deployment**
   ```bash
   # Check deployment status
   aws lightsail get-container-service-deployments \
     --service-name api \
     --region us-east-2

   # Watch for container to be running
   aws lightsail get-container-services \
     --service-name api \
     --region us-east-2
   ```

5. **Verify New Configuration**
   ```bash
   # Check Redis logs
   aws lightsail get-container-log \
     --service-name api \
     --container-name redis \
     --region us-east-2 | grep "maxmemory-policy"

   # Should show: maxmemory-policy: noeviction
   ```

### Configuration Best Practices

1. **Always Validate JSON** before deploying
2. **Document Changes** in git commit messages
3. **Test in Staging** if possible (we don't have staging currently)
4. **Monitor After Deploy** for 30+ minutes
5. **Have Rollback Plan** ready

## Local Development Setup

### Docker Compose Configuration

For local development, use similar Redis configuration:

```yaml
services:
  redis:
    image: redis:7-alpine
    command:
      - redis-server
      - --maxmemory 256mb
      - --maxmemory-policy noeviction
      - --appendonly yes
      - --appendfsync everysec
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Testing Locally

```bash
# Connect to local Redis
redis-cli

# Verify configuration
CONFIG GET maxmemory
CONFIG GET maxmemory-policy

# Test job queue
npm run queue:test
```

## Troubleshooting

### Redis Connection Issues

**Symptom:** `Error: getaddrinfo ENOTFOUND redis`

**Cause:** Wrong REDIS_HOST value

**Fix:** In `lightsail-api-deployment.json`, ensure:
```json
"REDIS_HOST": "localhost"
```

Lightsail containers share network namespace, so they connect via localhost, NOT container names.

### AOF Rewrite Issues

**Symptom:** Redis logs show AOF rewrite errors

**Cause:** Insufficient disk space or memory

**Fix:**
1. Check disk space: `df -h`
2. Increase maxmemory if needed
3. Manually trigger rewrite: `redis-cli BGREWRITEAOF`

### Memory Fragmentation

**Symptom:** `mem_fragmentation_ratio > 1.5`

**Cause:** Memory fragmentation over time

**Fix:**
1. Restart Redis (requires downtime)
2. Or wait for Redis to defragment automatically
3. Consider enabling `activedefrag`:
   ```redis
   CONFIG SET activedefrag yes
   ```

## Related Documentation

- [BullMQ Best Practices](https://docs.bullmq.io/guide/best-practices)
- [Redis Persistence](https://redis.io/docs/manual/persistence/)
- [Redis Memory Optimization](https://redis.io/docs/manual/memory-optimization/)
- [AWS Lightsail Containers](https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-container-services)

## Change History

| Date | Change | Reason |
|------|--------|--------|
| 2026-01-17 | Changed to noeviction, 256mb, AOF enabled | Prevent BullMQ job data loss |
| Previous | allkeys-lru, 128mb, no AOF | Initial configuration (problematic) |
