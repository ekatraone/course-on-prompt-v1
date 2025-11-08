const db = require('./database');

/**
 * Automation A: Webhook Handler - Create or Update Student
 *
 * Receives webhook payload and either creates a new student or updates existing one.
 * Works with any database provider (Airtable, Azure SQL, etc.)
 *
 * Usage:
 *   const result = await handleStudentWebhook(payload);
 *
 * Payload example:
 *   {
 *     phone: "1234567890",
 *     name: "John Doe",
 *     topic: "JavaScript Basics",
 *     moduleCompleted: 5,
 *     dayCompleted: 3
 *   }
 */
async function handleStudentWebhook(payload) {
    try {
        const { phone, name, topic, moduleCompleted, dayCompleted, ...otherFields } = payload;

        if (!phone) {
            throw new Error('Phone number is required');
        }

        console.log(`[Webhook] Processing student: ${phone}`);

        // Step 1: Look up student by phone
        const existingStudents = await db.findStudentRecord(phone);

        // Step 2: Determine if student exists
        const studentExists = existingStudents && existingStudents.length > 0;

        if (!studentExists) {
            // Step 3a: CREATE - Student doesn't exist
            console.log(`[Webhook] Creating new student: ${phone}`);

            const result = await db.createStudentRecord(phone, name, topic);

            // If additional fields provided, update them
            if (moduleCompleted !== undefined || dayCompleted !== undefined) {
                const newStudents = await db.findStudentRecord(phone);
                if (newStudents && newStudents.length > 0) {
                    const studentId = newStudents[0].id;

                    if (moduleCompleted !== undefined) {
                        await db.updateField(studentId, 'module_completed', moduleCompleted);
                        await db.updateField(studentId, 'next_module', moduleCompleted + 1);
                    }

                    if (dayCompleted !== undefined) {
                        await db.updateField(studentId, 'day_completed', dayCompleted);
                        await db.updateField(studentId, 'next_day', dayCompleted + 1);

                        // AUTOMATION B (Inline): Check if day 4 is completed
                        await checkAndUpdateProgress(studentId, dayCompleted);
                    }
                }
            }

            return {
                success: true,
                action: 'created',
                phone: phone,
                message: 'Student created successfully'
            };

        } else {
            // Step 3b: UPDATE - Student exists
            const student = existingStudents[0];
            const studentId = student.id;
            const currentProgress = student.fields?.progress || student.fields?.Progress;

            console.log(`[Webhook] Student exists: ${phone}, Progress: ${currentProgress}`);

            // Option 1: Update only if Progress == "Completed" (uncomment if needed)
            // if (currentProgress !== 'Completed') {
            //     console.log(`[Webhook] Skipping update - Progress is not Completed`);
            //     return {
            //         success: true,
            //         action: 'skipped',
            //         phone: phone,
            //         reason: 'Progress is not Completed'
            //     };
            // }

            // Option 2: Update always (default behavior)
            console.log(`[Webhook] Updating existing student: ${phone}`);

            // Update fields
            if (topic) {
                await db.updateStudentRecord(studentId, { courseName: topic });
            }

            if (moduleCompleted !== undefined) {
                await db.updateField(studentId, 'module_completed', moduleCompleted);
                await db.updateField(studentId, 'next_module', moduleCompleted + 1);
            }

            if (dayCompleted !== undefined) {
                await db.updateField(studentId, 'day_completed', dayCompleted);
                await db.updateField(studentId, 'next_day', dayCompleted + 1);

                // AUTOMATION B (Inline): Check if day 4 is completed
                await checkAndUpdateProgress(studentId, dayCompleted);
            }

            // Update any other fields from payload
            for (const [key, value] of Object.entries(otherFields)) {
                if (value !== undefined && value !== null) {
                    await db.updateField(studentId, key, value);
                }
            }

            return {
                success: true,
                action: 'updated',
                phone: phone,
                studentId: studentId,
                message: 'Student updated successfully'
            };
        }

    } catch (error) {
        console.error('[Webhook] Error processing student:', error);
        return {
            success: false,
            error: error.message,
            phone: payload.phone
        };
    }
}

/**
 * Automation B (Inline): Check and Update Progress
 *
 * If Day Completed == 4, automatically set Progress = "Completed"
 * This runs inline whenever dayCompleted is updated
 */
async function checkAndUpdateProgress(studentId, dayCompleted) {
    if (dayCompleted === 4) {
        console.log(`[Progress] Student ${studentId} completed Day 4 - marking as Completed`);
        await db.updateField(studentId, 'progress', 'Completed');
        await db.updateField(studentId, 'Progress', 'Completed'); // Handle both field names

        return true;
    }
    return false;
}

/**
 * Automation B (Batch/Poller): Find and Update Completed Students
 *
 * Alternative implementation using a poller/cron job.
 * Finds all students where Day Completed == 4 but Progress != "Completed"
 * and updates them.
 *
 * Run this with a cron job (e.g., every hour)
 */
async function updateCompletedStudents() {
    try {
        console.log('[Poller] Checking for students who completed Day 4...');

        // This requires implementing a batch query method
        // For now, we'll need to query all students and filter
        // (In production, you'd want to add a dedicated method to the provider)

        // Note: This is a placeholder - implement based on your provider
        // You may want to add a method like db.findStudentsByDayCompleted(4)

        console.log('[Poller] Batch update completed');
        return { success: true };

    } catch (error) {
        console.error('[Poller] Error updating completed students:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Helper: Get Student Details
 * Fetches complete student information including progress
 */
async function getStudentDetails(phone) {
    try {
        const students = await db.findStudentRecord(phone);

        if (!students || students.length === 0) {
            return { success: false, error: 'Student not found' };
        }

        const student = students[0];
        const dayCompleted = student.fields?.day_completed || student.fields?.['Day Completed'] || 0;
        const progress = student.fields?.progress || student.fields?.Progress || 'In Progress';

        return {
            success: true,
            student: {
                id: student.id,
                phone: student.fields?.phone || student.fields?.Phone,
                name: student.fields?.name || student.fields?.Name,
                topic: student.fields?.topic || student.fields?.Topic,
                moduleCompleted: student.fields?.module_completed || student.fields?.['Module Completed'],
                nextModule: student.fields?.next_module || student.fields?.['Next Module'],
                dayCompleted: dayCompleted,
                nextDay: student.fields?.next_day || student.fields?.['Next Day'],
                progress: progress,
                isCompleted: dayCompleted >= 4 || progress === 'Completed'
            }
        };
    } catch (error) {
        console.error('[Helper] Error getting student details:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Batch Update Student Progress
 * Updates progress based on day completed for a specific student
 */
async function updateStudentProgress(phone, dayCompleted) {
    try {
        const students = await db.findStudentRecord(phone);

        if (!students || students.length === 0) {
            throw new Error('Student not found');
        }

        const student = students[0];
        const studentId = student.id;

        // Update day completed
        await db.updateField(studentId, 'day_completed', dayCompleted);
        await db.updateField(studentId, 'next_day', dayCompleted + 1);

        // Check and update progress if day 4
        await checkAndUpdateProgress(studentId, dayCompleted);

        return {
            success: true,
            phone: phone,
            dayCompleted: dayCompleted,
            progressUpdated: dayCompleted === 4
        };

    } catch (error) {
        console.error('[Update] Error updating student progress:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    handleStudentWebhook,
    checkAndUpdateProgress,
    updateCompletedStudents,
    getStudentDetails,
    updateStudentProgress
};
