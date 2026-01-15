# Phase 3: Real-Time Dashboard Enhancements - Testing Checklist

**Date:** January 14, 2026
**Build:** Web package successfully built and verified

## Browser Notification System

### Notification Permission
- [ ] Visit `/admin/evaluation/queue` for first time
- [ ] Verify "Enable Queue Alerts" blue banner appears
- [ ] Click "Enable Notifications" button
- [ ] Verify browser permission prompt appears
- [ ] Grant permission - verify green "Browser notifications enabled" banner
- [ ] Refresh page - verify permission persists (green banner shows)
- [ ] Test "Not Now" button - verify banner dismisses and doesn't reappear

### Notification Permission (Denied State)
- [ ] Block notifications in browser settings
- [ ] Refresh `/admin/evaluation/queue`
- [ ] Verify yellow warning banner shows: "Notifications Blocked"
- [ ] Verify message includes instructions to enable in browser settings

### Notification Triggers
- [ ] Trigger failure spike (10+ failed jobs in 5 minutes)
  - Verify browser notification appears with title "Queue Alert: Multiple Failures"
  - Verify notification includes count
  - Verify `requireInteraction: true` (notification stays until dismissed)
- [ ] Trigger stalled queue (15+ minutes idle with waiting jobs)
  - Verify notification "Queue Alert: Processing Stalled"
- [ ] Trigger max retries (job fails 3 times)
  - Verify notification "Evaluation Failed (Max Retries)"
  - Verify includes job ID
- [ ] Trigger queue paused event
  - Verify notification "Queue Paused by Admin"

## Queue Health Dashboard

### Health Widget Display
- [ ] Verify QueueHealthWidget appears below notification prompt
- [ ] Check health status indicator (green/yellow/red pulsing dot)
- [ ] Verify status message displays correctly
- [ ] Check all 4 metrics display:
  - Processing Rate (jobs/min)
  - Est. Time to Clear
  - 24h Failure Rate (percentage)
  - 24h Trend (sparkline chart)
- [ ] Verify "Last update: X seconds ago" counter increments

### Health Status States
- [ ] **Healthy**: Green indicator, normal processing
- [ ] **Degraded**: Yellow indicator (5-15% failure rate or slow processing)
- [ ] **Critical**: Red indicator (>15% failure rate)
- [ ] **Paused**: Yellow indicator with "Queue is paused" message

### Settings Button
- [ ] Click ⚙️ Settings button in health widget
- [ ] Verify NotificationSettings modal opens

## Adaptive Polling

### Visibility-Based Intervals
- [ ] Verify page polls every 5 seconds when tab is active
  - Monitor network tab for `/admin/evaluation/queue/jobs` requests
- [ ] Switch to another tab
- [ ] Verify polling slows to every 15 seconds when tab is inactive
- [ ] Switch back to queue tab
- [ ] Verify polling returns to 5 seconds

### Initial Poll
- [ ] Refresh page
- [ ] Verify first API call happens immediately on mount
- [ ] Verify subsequent calls follow interval pattern

## Auto-Refresh Controls

### Controls UI
- [ ] Locate "Auto-refresh" button in page header (next to Pause Queue)
- [ ] Verify green background with pulsing dot when enabled
- [ ] Verify shows current interval in label: "(5s)"
- [ ] Click dropdown arrow - verify panel opens

### Toggle Auto-Refresh
- [ ] Click toggle switch to disable
- [ ] Verify:
  - Button changes to gray background
  - Dot stops pulsing
  - No more API requests in network tab
- [ ] Toggle back on - verify polling resumes

### Interval Selection
- [ ] Test each interval option:
  - 3s - verify polling every 3 seconds
  - 5s - verify polling every 5 seconds
  - 10s - verify polling every 10 seconds
  - 30s - verify polling every 30 seconds
  - 1m - verify polling every 60 seconds
- [ ] Verify selected interval is highlighted in blue
- [ ] Verify inactive intervals are disabled when auto-refresh is off

### Settings Persistence
- [ ] Change interval to 10s
- [ ] Refresh page
- [ ] Verify interval resets to default 5s (no persistence implemented)

## Dynamic Tab Title

### Title Updates
- [ ] Navigate to `/admin/evaluation/queue`
- [ ] With no jobs: Verify title shows "Queue Empty - Evaluation Queue"
- [ ] With failed jobs: Verify title shows "(X failed, ...) - Evaluation Queue"
- [ ] With active jobs: Verify title shows "(X active, ...) - Evaluation Queue"
- [ ] With waiting jobs: Verify title shows "(X waiting, ...) - Evaluation Queue"
- [ ] With mix: Verify order is "failed, active, waiting"

### Title Restoration
- [ ] Navigate away from queue page
- [ ] Verify tab title changes to new page title
- [ ] Navigate back to queue page
- [ ] Verify queue status title is restored

## Sound Alert System

### Settings Panel Access
- [ ] Click ⚙️ Settings in health widget
- [ ] Verify NotificationSettings modal opens
- [ ] Verify "Sound Alerts" section with toggle switch

### Sound Enable/Disable
- [ ] Toggle sound alerts ON (green switch)
- [ ] Verify "Test sound" button appears
- [ ] Click "Test sound" - verify success sound plays (3 rising tones)
- [ ] Toggle sound alerts OFF
- [ ] Verify "Test sound" button disappears

### Sound Persistence
- [ ] Enable sound alerts
- [ ] Refresh page
- [ ] Open settings - verify sound alerts still enabled (localStorage persistence)

### Sound Integration with Notifications
- [ ] Enable sound alerts
- [ ] Trigger failure spike notification
  - Verify critical sound plays (3-tone urgent: high-mid-high)
- [ ] Trigger stalled notification
  - Verify critical sound plays
- [ ] Trigger max retries notification
  - Verify failure sound plays (2-tone warning: 400Hz-300Hz)
- [ ] Trigger paused notification
  - Verify failure sound plays

### Sound Without Notifications
- [ ] Disable browser notifications (block permission)
- [ ] Enable sound alerts
- [ ] Trigger any notification event
- [ ] Verify sound still plays even though browser notification is blocked

## Notification Settings Panel

### Panel UI
- [ ] Open settings panel
- [ ] Verify sections:
  - Browser Notifications (with enable button or status)
  - Sound Alerts (with toggle)
  - Alert Types (documentation)
  - Note about behavior
- [ ] Verify Close button works

### Browser Notifications Section
- [ ] **Permission Granted**: Shows "Enabled" status
- [ ] **Permission Default**: Shows "Enable" button
- [ ] **Permission Denied**: Shows yellow warning with browser settings instructions

### Alert Types Documentation
- [ ] Verify shows Critical Alerts (🔴)
  - Failure spikes, stalled queue
- [ ] Verify shows Warning Alerts (🟡)
  - Max retries, queue paused

### Settings Interactions
- [ ] Click outside modal backdrop - verify modal closes
- [ ] Click X button - verify modal closes
- [ ] Click Close button - verify modal closes

## Build Verification

### Production Build
- [ ] Build passes without errors
- [ ] No TypeScript errors
- [ ] All pages render correctly
- [ ] SSR works properly (no document/window errors)

### Bundle Size
- [ ] Check build output for reasonable bundle sizes
- [ ] Verify no unexpected large dependencies added

## Cross-Browser Testing

### Chrome/Edge
- [ ] All features work
- [ ] Notifications appear correctly
- [ ] Sound alerts play correctly
- [ ] No console errors

### Firefox
- [ ] All features work
- [ ] Notifications appear correctly
- [ ] Sound alerts play correctly
- [ ] No console errors

### Safari
- [ ] All features work
- [ ] Notifications appear correctly
- [ ] Sound alerts play correctly
- [ ] No console errors

## Integration Testing

### With Existing Features
- [ ] Pause/Resume Queue button still works
- [ ] Filter tabs (All, Waiting, Active, Completed, Failed) work
- [ ] Job retry functionality works
- [ ] Job remove functionality works
- [ ] Error details modal works
- [ ] Breadcrumbs navigation works

### Performance
- [ ] Page loads quickly
- [ ] No lag when polling
- [ ] Smooth tab title updates
- [ ] Health widget chart renders smoothly
- [ ] No memory leaks over extended use

## Edge Cases

### Network Errors
- [ ] Disconnect network
- [ ] Verify error banner shows
- [ ] Verify polling continues attempting
- [ ] Reconnect network - verify recovery

### Empty Queue
- [ ] Clear all jobs
- [ ] Verify stats show 0/0/0/0
- [ ] Verify health widget shows appropriate message
- [ ] Verify tab title shows "Queue Empty"

### Very Long Queue
- [ ] Add 100+ jobs
- [ ] Verify performance remains good
- [ ] Verify pagination/scrolling works
- [ ] Verify metrics calculate correctly

---

## Sign-Off

- [ ] All critical features tested and working
- [ ] No blocking bugs found
- [ ] Performance acceptable
- [ ] Ready for deployment

**Tester:** _______________
**Date:** _______________
**Notes:** _______________
