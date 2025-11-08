const express = require('express');
const router = express.Router();
const {
    handleStudentWebhook,
    getStudentDetails,
    updateStudentProgress,
    updateCompletedStudents
} = require('./automations');

/**
 * Automation Routes
 *
 * These routes implement the webhook automations for student management.
 * Works with any database provider (Airtable, Azure SQL, etc.)
 */

// =====================================================
// AUTOMATION A: Webhook Endpoint - Create or Update Student
// =====================================================

/**
 * POST /webhook/student
 *
 * Receives webhook payload and creates or updates student.
 *
 * Request Body:
 * {
 *   "phone": "1234567890",
 *   "name": "John Doe",
 *   "topic": "JavaScript Basics",
 *   "moduleCompleted": 5,
 *   "dayCompleted": 3
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "action": "created" | "updated",
 *   "phone": "1234567890",
 *   "message": "Student created successfully"
 * }
 */
router.post('/webhook/student', async (req, res) => {
    try {
        console.log('[Webhook] Received student webhook:', req.body);

        const result = await handleStudentWebhook(req.body);

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }

    } catch (error) {
        console.error('[Webhook] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// Helper Endpoints
// =====================================================

/**
 * GET /student/:phone
 *
 * Get student details by phone number
 */
router.get('/student/:phone', async (req, res) => {
    try {
        const phone = req.params.phone;
        const result = await getStudentDetails(phone);

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(404).json(result);
        }

    } catch (error) {
        console.error('[Get Student] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /student/:phone/progress
 *
 * Update student progress (day completed)
 *
 * Request Body:
 * {
 *   "dayCompleted": 4
 * }
 *
 * This will automatically set Progress = "Completed" if dayCompleted == 4
 */
router.post('/student/:phone/progress', async (req, res) => {
    try {
        const phone = req.params.phone;
        const { dayCompleted } = req.body;

        if (dayCompleted === undefined) {
            return res.status(400).json({
                success: false,
                error: 'dayCompleted is required'
            });
        }

        const result = await updateStudentProgress(phone, dayCompleted);

        res.status(200).json(result);

    } catch (error) {
        console.error('[Update Progress] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// AUTOMATION B: Manual Trigger for Batch Update
// =====================================================

/**
 * POST /cron/update-completed-students
 *
 * Manually trigger batch update of students who completed Day 4
 * In production, this would be called by a cron job
 */
router.post('/cron/update-completed-students', async (req, res) => {
    try {
        console.log('[Cron] Running batch update for completed students...');

        const result = await updateCompletedStudents();

        res.status(200).json(result);

    } catch (error) {
        console.error('[Cron] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =====================================================
// Test Endpoint
// =====================================================

/**
 * GET /webhook/test
 *
 * Test endpoint to verify webhook is working
 */
router.get('/webhook/test', (req, res) => {
    res.json({
        success: true,
        message: 'Webhook endpoint is working',
        provider: process.env.DB_PROVIDER || 'airtable',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
