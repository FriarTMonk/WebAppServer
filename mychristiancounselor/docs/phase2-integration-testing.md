# Phase 2 Integration Testing Guide

**Date:** November 16, 2025
**Feature:** AI Wellbeing Integration
**Tester:** [Your Name]

---

## Prerequisites

- Phase 1 completed (database, assignments, basic dashboard)
- Test user accounts created:
  - Platform Admin
  - Organization Admin
  - Counselor with active assignments
  - 2-3 test members with conversation history
- OpenAI API key configured
- Development server running

---

## Test 1: Manual Wellbeing Analysis

**Goal:** Verify that manual analysis correctly generates status and summary

**Steps:**
1. Log in as Platform Admin or use Prisma Studio
2. Verify test member has 2-3 conversations from past 7 days
3. Call API manually:
   ```bash
   curl -X POST http://localhost:3000/api/counsel/members/{memberId}/refresh-analysis?organizationId={orgId} \
     -H "Authorization: Bearer {token}"
   ```
4. Check Prisma Studio: MemberWellbeingStatus table should have new record
5. Verify fields populated:
   - status (red/yellow/green)
   - aiSuggestedStatus (same as status initially)
   - summary (2-3 sentences)
   - lastAnalyzedAt (current timestamp)

**Expected:**
- ✅ Status record created
- ✅ AI-generated summary present
- ✅ Status matches conversation content

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 2: Nightly Cron Job (Simulated)

**Goal:** Verify scheduled job analyzes all members

**Steps:**
1. Stop development server if running
2. Temporarily change cron schedule in `wellbeing-analysis.scheduler.ts`:
   ```typescript
   @Cron('*/2 * * * *') // Every 2 minutes for testing
   ```
3. Restart server and watch logs
4. Wait 2 minutes and observe:
   - Log: "Starting scheduled wellbeing analysis job"
   - Multiple member analyses running
   - Log: "Scheduled wellbeing analysis completed successfully"
5. Check Prisma Studio: All assigned members have updated MemberWellbeingStatus

**Expected:**
- ✅ Cron runs on schedule
- ✅ All assigned members analyzed
- ✅ No crashes or errors

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

**Cleanup:** Revert cron schedule to `0 2 * * *`

---

## Test 3: Status Override by Counselor

**Goal:** Verify counselor can override AI suggestion with reason

**Steps:**
1. Log in as Counselor
2. Navigate to `/counsel` dashboard
3. Identify member with AI status (e.g., green)
4. Click "Override" button
5. Modal opens showing AI suggestion
6. Select different status (e.g., yellow)
7. Enter reason: "Member mentioned recent job loss in offline conversation"
8. Submit override
9. Verify dashboard updates:
   - Status shows new value
   - Pencil/edit icon appears
   - Hovering shows "AI suggested: green"

**Expected:**
- ✅ Modal opens with correct data
- ✅ Override saved successfully
- ✅ Dashboard reflects change immediately
- ✅ Audit trail logged in database

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 4: Coverage Counselor Cannot Override

**Goal:** Verify only assigned counselor can override, not coverage counselors

**Steps:**
1. As Organization Admin, create coverage grant:
   - Primary Counselor: Counselor A
   - Backup Counselor: Counselor B
   - Member: Test Member
2. Log in as Counselor B (backup)
3. Navigate to Coverage tab (not implemented yet - skip for now)
4. Try to override status via API:
   ```bash
   curl -X PATCH http://localhost:3000/api/counsel/members/{memberId}/status?organizationId={orgId} \
     -H "Authorization: Bearer {counselorB-token}" \
     -H "Content-Type: application/json" \
     -d '{"status": "red", "reason": "Test"}'
   ```
5. Should receive 403 Forbidden

**Expected:**
- ✅ Coverage counselor blocked from override
- ✅ Error message: "Only the assigned counselor can override..."

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 5: Dashboard Manual Refresh

**Goal:** Verify counselor can manually trigger analysis for specific member

**Steps:**
1. Log in as Counselor
2. View dashboard with assigned members
3. Click "↻ Refresh" button next to member
4. Observe:
   - Button shows "↻ Refreshing..." (disabled)
   - Request completes
   - Dashboard updates with new data
   - Last analyzed timestamp updates

**Expected:**
- ✅ Refresh button works
- ✅ Loading state shown
- ✅ Data updates after refresh
- ✅ No errors in console

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 6: Empty Conversation History

**Goal:** Verify graceful handling of members with no recent conversations

**Steps:**
1. Create new test member with NO conversations
2. Assign counselor to this member
3. Run analysis manually or wait for cron
4. Check MemberWellbeingStatus:
   - status should be 'green' (default)
   - summary should be "No conversations this week" or similar
5. Verify dashboard displays gracefully

**Expected:**
- ✅ No errors or crashes
- ✅ Default green status assigned
- ✅ Empty state message in summary

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 7: Crisis Detection (Red Status)

**Goal:** Verify AI correctly detects crisis keywords

**Steps:**
1. Create test member
2. Add conversation with crisis content:
   - Message: "I've been thinking about suicide lately and I don't know what to do"
3. Run manual analysis
4. Check status: should be RED
5. Verify summary mentions crisis indicators

**Expected:**
- ✅ Status correctly set to RED
- ✅ Summary acknowledges crisis content
- ✅ Counselor alerted appropriately

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 8: Concern Detection (Yellow Status)

**Goal:** Verify AI detects yellow-level concerns

**Steps:**
1. Create test member
2. Add conversations mentioning:
   - Grief/loss
   - Ongoing stress
   - Relationship struggles
3. Run analysis
4. Verify status is YELLOW
5. Check summary reflects concern themes

**Expected:**
- ✅ Status set to YELLOW
- ✅ Summary includes concern keywords

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 9: OpenAI Rate Limit Handling

**Goal:** Verify system handles rate limits gracefully

**Steps:**
1. Queue many analysis requests rapidly (15+ members)
2. Observe logs for rate limit errors
3. Verify:
   - 1-second delay between requests (in code)
   - Failed members logged but don't crash job
   - Successful members still get analyzed

**Expected:**
- ✅ Rate limits respected
- ✅ Partial failures don't crash system
- ✅ Retry logic or manual re-run succeeds

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Test 10: Dashboard UI Rendering

**Goal:** Verify dashboard displays all AI data correctly

**Steps:**
1. Log in as Counselor with 5+ assigned members
2. Verify dashboard shows:
   - Stoplight emoji (🟢🟡🔴) for each member
   - AI-generated summary text
   - Last analyzed timestamp
   - Total conversation count
   - Override indicator (✏️) if status was overridden
3. Hover over status to see tooltip with AI suggestion
4. Click member name to navigate (not implemented yet)

**Expected:**
- ✅ All data renders correctly
- ✅ Visual indicators clear and intuitive
- ✅ No layout issues or overlapping text
- ✅ Responsive design works

**Actual:**
- [ ] PASS / [ ] FAIL
- Notes: _______________________

---

## Performance Benchmarks

Record performance metrics:

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| Single member analysis | < 5s | _____ | [ ] |
| Batch analysis (10 members) | < 60s | _____ | [ ] |
| Dashboard load time | < 2s | _____ | [ ] |
| Manual refresh response | < 5s | _____ | [ ] |

---

## Bug Tracking

| Bug # | Description | Severity | Status |
|-------|-------------|----------|--------|
| 1 | _______________ | High/Med/Low | Open/Fixed |
| 2 | _______________ | High/Med/Low | Open/Fixed |

---

## Sign-Off

**Phase 2 Status:** [ ] READY FOR PRODUCTION / [ ] NEEDS FIXES

**Tested By:** ___________________
**Date:** ___________________
**Notes:**
