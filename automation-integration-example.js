/**
 * EXAMPLE: How to integrate automations into your server.js
 *
 * This file shows how to add the webhook automations to your Express server.
 * Copy the relevant parts into your server.js
 */

const express = require('express');
const db = require('./database');
const automationRoutes = require('./automation-routes');

const app = express();
app.use(express.json());

// =====================================================
// STEP 1: Initialize Database
// =====================================================
async function initializeDatabase() {
    try {
        await db.init();
        console.log('✅ Database initialized:', db.getProviderType());

        const health = await db.healthCheck();
        console.log('✅ Database health check:', health);

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// =====================================================
// STEP 2: Mount Automation Routes
// =====================================================
app.use('/api', automationRoutes);

// Your existing routes...
app.get('/', (req, res) => {
    res.send('Server is running');
});

// =====================================================
// STEP 3: Start Server
// =====================================================
const PORT = process.env.PORT || 3000;

async function startServer() {
    await initializeDatabase();

    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhook/student`);
        console.log(`🔍 Test endpoint: http://localhost:${PORT}/api/webhook/test`);
    });
}

startServer();

// =====================================================
// STEP 4: Graceful Shutdown
// =====================================================
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await db.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await db.disconnect();
    process.exit(0);
});

// =====================================================
// EXAMPLE USAGE
// =====================================================

/*

1. TEST THE WEBHOOK:

   curl http://localhost:3000/api/webhook/test

2. CREATE A NEW STUDENT:

   curl -X POST http://localhost:3000/api/webhook/student \
     -H "Content-Type: application/json" \
     -d '{
       "phone": "1234567890",
       "name": "John Doe",
       "topic": "JavaScript Basics"
     }'

3. UPDATE STUDENT PROGRESS:

   curl -X POST http://localhost:3000/api/webhook/student \
     -H "Content-Type: application/json" \
     -d '{
       "phone": "1234567890",
       "dayCompleted": 4
     }'

   This will automatically set Progress = "Completed" because dayCompleted == 4

4. GET STUDENT DETAILS:

   curl http://localhost:3000/api/student/1234567890

5. UPDATE STUDENT DAY (Alternative):

   curl -X POST http://localhost:3000/api/student/1234567890/progress \
     -H "Content-Type: application/json" \
     -d '{ "dayCompleted": 4 }'

*/

// =====================================================
// AUTOMATION B: CRON JOB SETUP (Optional)
// =====================================================

/*

If you prefer batch processing instead of inline updates,
install node-cron:

  npm install node-cron

Then add this to your server.js:

  const cron = require('node-cron');
  const { updateCompletedStudents } = require('./automations');

  // Run every hour
  cron.schedule('0 * * * *', async () => {
      console.log('[Cron] Running scheduled update for completed students...');
      await updateCompletedStudents();
  });

  // Or run every day at midnight
  cron.schedule('0 0 * * *', async () => {
      console.log('[Cron] Daily update for completed students...');
      await updateCompletedStudents();
  });

*/
