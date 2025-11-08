# Automation Guide

This guide explains the two automated workflows implemented in the application:
- **Automation A:** Webhook-based student creation/updates
- **Automation B:** Automatic progress completion when Day 4 is reached

Both automations work with **any database provider** (Airtable, Azure SQL, etc.) thanks to the database abstraction layer.

---

## Table of Contents

1. [Automation A: Webhook Create/Update](#automation-a-webhook-createupdate)
2. [Automation B: Progress Auto-Completion](#automation-b-progress-auto-completion)
3. [Setup Instructions](#setup-instructions)
4. [API Reference](#api-reference)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Automation A: Webhook Create/Update

### Overview

Receives webhook payloads and either **creates a new student** or **updates an existing one** based on phone number lookup.

### Workflow

```
Webhook Received
      ↓
Lookup Student by Phone
      ↓
┌─────────────┬──────────────┐
↓ Not Found   ↓ Found        │
↓             ↓              │
CREATE        UPDATE         │
Student       Student        │
└─────────────┴──────────────┘
      ↓
Check if Day 4 Completed
      ↓
(Automation B triggers)
```

### Behavior

**If student doesn't exist:**
- Creates new student record
- Sets initial values from payload
- Returns `action: "created"`

**If student exists:**
- Updates student fields from payload
- Preserves existing data not in payload
- Returns `action: "updated"`

**Optional:** Update only when `Progress == "Completed"`
- See line 69-77 in `automations.js` to enable this condition

### Example Payloads

**Create New Student:**
```json
{
  "phone": "1234567890",
  "name": "John Doe",
  "topic": "JavaScript Basics"
}
```

**Update with Progress:**
```json
{
  "phone": "1234567890",
  "dayCompleted": 4,
  "moduleCompleted": 10
}
```

**Update Multiple Fields:**
```json
{
  "phone": "1234567890",
  "name": "John Updated",
  "topic": "Advanced JavaScript",
  "dayCompleted": 2,
  "moduleCompleted": 5,
  "customField": "customValue"
}
```

### Response Format

**Success (Created):**
```json
{
  "success": true,
  "action": "created",
  "phone": "1234567890",
  "message": "Student created successfully"
}
```

**Success (Updated):**
```json
{
  "success": true,
  "action": "updated",
  "phone": "1234567890",
  "studentId": "rec123456",
  "message": "Student updated successfully"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Phone number is required",
  "phone": null
}
```

---

## Automation B: Progress Auto-Completion

### Overview

Automatically sets `Progress = "Completed"` when a student completes Day 4.

### Workflow

```
Student Progress Updated
      ↓
Check: dayCompleted == 4?
      ↓
┌─────────────┬──────────────┐
↓ Yes         ↓ No           │
↓             ↓              │
Set Progress  Do Nothing     │
= "Completed"                │
└─────────────┴──────────────┘
```

### Implementation Options

#### Option 1: Inline (Recommended) ✅

**How it works:**
- Triggers automatically whenever `dayCompleted` is updated
- No additional setup required
- Real-time updates

**Implementation:**
```javascript
// Already implemented in automations.js
async function checkAndUpdateProgress(studentId, dayCompleted) {
    if (dayCompleted === 4) {
        await db.updateField(studentId, 'progress', 'Completed');
        return true;
    }
    return false;
}
```

**When it triggers:**
- When webhook updates `dayCompleted` to 4
- When direct progress update method is called

#### Option 2: Batch/Poller (Alternative)

**How it works:**
- Runs on a schedule (e.g., hourly, daily)
- Finds all students with `Day Completed == 4` AND `Progress != "Completed"`
- Updates them in batch

**Setup with Cron Job:**
```javascript
const cron = require('node-cron');
const { updateCompletedStudents } = require('./automations');

// Run every hour
cron.schedule('0 * * * *', async () => {
    await updateCompletedStudents();
});
```

**Pros/Cons:**

| Aspect | Inline | Batch/Poller |
|--------|--------|--------------|
| **Real-time** | ✅ Yes | ❌ Delayed |
| **Setup** | ✅ Simple | ⚠️ Requires cron |
| **Database Load** | ✅ Minimal | ⚠️ Scans all records |
| **Reliability** | ✅ High | ⚠️ Depends on scheduler |

**Recommendation:** Use **Inline** (Option 1) for most cases.

---

## Setup Instructions

### 1. Install Dependencies

```bash
# Optional: For cron-based approach
npm install node-cron
```

### 2. Initialize Database

In your `server.js`:

```javascript
const db = require('./database');

async function startServer() {
    // Initialize database
    await db.init();
    console.log('Database initialized:', db.getProviderType());

    // ... rest of server setup
}

startServer();
```

### 3. Add Automation Routes

```javascript
const automationRoutes = require('./automation-routes');
app.use('/api', automationRoutes);
```

### 4. Configure Webhook Endpoint

**Endpoint:** `POST /api/webhook/student`

**Configure in your webhook provider:**
- URL: `https://your-domain.com/api/webhook/student`
- Method: POST
- Content-Type: application/json

### 5. Test the Setup

```bash
# Run the test script
node test-automations.js
```

---

## API Reference

### Webhook Endpoints

#### POST `/api/webhook/student`

Create or update student based on phone number.

**Request Body:**
```json
{
  "phone": "1234567890",        // Required
  "name": "John Doe",           // Optional for update
  "topic": "Course Name",       // Optional
  "moduleCompleted": 5,         // Optional
  "dayCompleted": 3             // Optional (triggers Automation B if == 4)
}
```

**Response:** See [Automation A Response Format](#response-format)

#### GET `/api/webhook/test`

Test if webhook endpoint is working.

**Response:**
```json
{
  "success": true,
  "message": "Webhook endpoint is working",
  "provider": "airtable",
  "timestamp": "2025-11-08T10:30:00.000Z"
}
```

### Helper Endpoints

#### GET `/api/student/:phone`

Get student details by phone number.

**Response:**
```json
{
  "success": true,
  "student": {
    "id": "rec123456",
    "phone": "1234567890",
    "name": "John Doe",
    "topic": "JavaScript Basics",
    "moduleCompleted": 5,
    "nextModule": 6,
    "dayCompleted": 3,
    "nextDay": 4,
    "progress": "In Progress",
    "isCompleted": false
  }
}
```

#### POST `/api/student/:phone/progress`

Update student's day completed (alternative to webhook).

**Request Body:**
```json
{
  "dayCompleted": 4
}
```

**Response:**
```json
{
  "success": true,
  "phone": "1234567890",
  "dayCompleted": 4,
  "progressUpdated": true
}
```

### Batch Operations

#### POST `/api/cron/update-completed-students`

Manually trigger batch update of students who completed Day 4.

**Response:**
```json
{
  "success": true
}
```

---

## Testing

### Run Automated Tests

```bash
node test-automations.js
```

This will test:
1. ✅ Create new student
2. ✅ Update existing student
3. ✅ Day 4 completion triggers progress update
4. ✅ Other days don't trigger progress update
5. ✅ Direct progress update method

### Manual Testing with cURL

**Test 1: Create Student**
```bash
curl -X POST http://localhost:3000/api/webhook/student \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "1234567890",
    "name": "Test User",
    "topic": "Testing"
  }'
```

**Test 2: Update to Day 4 (Should Complete)**
```bash
curl -X POST http://localhost:3000/api/webhook/student \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "1234567890",
    "dayCompleted": 4
  }'
```

**Test 3: Verify Progress**
```bash
curl http://localhost:3000/api/student/1234567890
```

Expected: `"progress": "Completed"`

### Testing with Different Databases

**Airtable:**
```bash
DB_PROVIDER=airtable node test-automations.js
```

**Azure SQL:**
```bash
DB_PROVIDER=azure-sql node test-automations.js
```

Both should work identically! 🎉

---

## Troubleshooting

### Issue: Webhook returns "Student not found"

**Cause:** Student doesn't exist yet
**Solution:** This is expected - the webhook will create the student automatically

### Issue: Progress not set to "Completed" on Day 4

**Check:**
1. Verify `dayCompleted` is exactly `4` (not `"4"` as string)
2. Check logs for `[Progress] Student X completed Day 4 - marking as Completed`
3. Verify field names match database schema (`progress` vs `Progress`)

**Debug:**
```javascript
const details = await getStudentDetails(phone);
console.log('Current progress:', details.student.progress);
console.log('Day completed:', details.student.dayCompleted);
```

### Issue: Webhook updates not saving

**Check:**
1. Database is initialized: `await db.init()`
2. Environment variables are set correctly
3. Database connection is healthy: `await db.healthCheck()`

**Debug:**
```javascript
// Enable detailed logging
LOG_LEVEL=debug node server.js
```

### Issue: Getting "Database not initialized"

**Cause:** Database not initialized before use
**Solution:**
```javascript
// In server.js, before any routes
await db.init();
```

### Issue: Field names not matching

**Airtable vs SQL naming:**
- Airtable: `Day Completed` (space)
- Azure SQL: `day_completed` (underscore)

**Solution:** The abstraction layer handles this automatically. If issues persist, check provider implementation.

---

## Advanced Configuration

### Customize Day 4 Threshold

Edit `automations.js`:

```javascript
async function checkAndUpdateProgress(studentId, dayCompleted) {
    // Change this value to customize when progress completes
    const COMPLETION_DAY = 4;

    if (dayCompleted === COMPLETION_DAY) {
        await db.updateField(studentId, 'progress', 'Completed');
        return true;
    }
    return false;
}
```

### Update Only When Progress == "Completed"

Edit `automations.js` line 69-77:

```javascript
// Uncomment this block to enable conditional updates
if (currentProgress !== 'Completed') {
    return {
        success: true,
        action: 'skipped',
        phone: phone,
        reason: 'Progress is not Completed'
    };
}
```

### Add Custom Webhook Logic

Edit `automations.js`:

```javascript
async function handleStudentWebhook(payload) {
    // Add your custom logic here
    if (payload.customField) {
        // Handle custom field
    }

    // ... rest of webhook handler
}
```

---

## Summary

✅ **Automation A (Webhook):** Create or update students via webhook
✅ **Automation B (Progress):** Auto-complete when Day 4 is reached
✅ **Database Independent:** Works with Airtable, Azure SQL, etc.
✅ **Real-time Updates:** Inline progress updates (no delay)
✅ **Well-tested:** Comprehensive test suite included
✅ **Production-ready:** Error handling and logging

**Quick Start:**
1. Add routes to `server.js`: `app.use('/api', require('./automation-routes'))`
2. Initialize database: `await db.init()`
3. Test: `node test-automations.js`
4. Configure webhook URL in your provider
5. Start receiving webhooks! 🎉

---

*For database setup, see MIGRATION_GUIDE.md*
*For API documentation, see DATABASE_README.md*
