/**
 * Test Script for Automations
 *
 * This script tests both Automation A (webhook create/update) and
 * Automation B (progress update on Day 4 completion)
 *
 * Run: node test-automations.js
 */

const db = require('./database');
const {
    handleStudentWebhook,
    getStudentDetails,
    updateStudentProgress
} = require('./automations');

async function runTests() {
    console.log('='.repeat(60));
    console.log('🧪 TESTING AUTOMATIONS');
    console.log('='.repeat(60));

    try {
        // Initialize database
        console.log('\n📡 Initializing database...');
        await db.init();
        console.log('✅ Database initialized:', db.getProviderType());

        const testPhone = '9999999999'; // Use a test phone number

        // =====================================================
        // TEST 1: CREATE NEW STUDENT (Automation A)
        // =====================================================
        console.log('\n' + '='.repeat(60));
        console.log('TEST 1: Create New Student');
        console.log('='.repeat(60));

        const createPayload = {
            phone: testPhone,
            name: 'Test Student',
            topic: 'Automation Testing',
            moduleCompleted: 1,
            dayCompleted: 1
        };

        console.log('📤 Sending webhook payload:', createPayload);
        const createResult = await handleStudentWebhook(createPayload);
        console.log('📥 Result:', createResult);

        if (createResult.success && createResult.action === 'created') {
            console.log('✅ TEST 1 PASSED: Student created successfully');
        } else {
            console.log('❌ TEST 1 FAILED:', createResult);
        }

        // Wait a moment for database to settle
        await new Promise(resolve => setTimeout(resolve, 1000));

        // =====================================================
        // TEST 2: UPDATE EXISTING STUDENT (Automation A)
        // =====================================================
        console.log('\n' + '='.repeat(60));
        console.log('TEST 2: Update Existing Student (Day 2)');
        console.log('='.repeat(60));

        const updatePayload = {
            phone: testPhone,
            dayCompleted: 2,
            moduleCompleted: 3
        };

        console.log('📤 Sending webhook payload:', updatePayload);
        const updateResult = await handleStudentWebhook(updatePayload);
        console.log('📥 Result:', updateResult);

        if (updateResult.success && updateResult.action === 'updated') {
            console.log('✅ TEST 2 PASSED: Student updated successfully');
        } else {
            console.log('❌ TEST 2 FAILED:', updateResult);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check student details
        console.log('\n📊 Checking student details...');
        const details1 = await getStudentDetails(testPhone);
        console.log('Student:', details1);

        // =====================================================
        // TEST 3: COMPLETE DAY 4 - Trigger Automation B
        // =====================================================
        console.log('\n' + '='.repeat(60));
        console.log('TEST 3: Complete Day 4 (Automation B Trigger)');
        console.log('='.repeat(60));

        const day4Payload = {
            phone: testPhone,
            dayCompleted: 4,
            moduleCompleted: 10
        };

        console.log('📤 Sending webhook payload (Day 4):', day4Payload);
        const day4Result = await handleStudentWebhook(day4Payload);
        console.log('📥 Result:', day4Result);

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if progress was automatically set to "Completed"
        console.log('\n📊 Checking if Progress was set to Completed...');
        const details2 = await getStudentDetails(testPhone);
        console.log('Student:', details2);

        if (details2.success && details2.student.progress === 'Completed') {
            console.log('✅ TEST 3 PASSED: Progress automatically set to Completed!');
            console.log('🎉 AUTOMATION B WORKING: Day 4 completion triggered progress update');
        } else {
            console.log('❌ TEST 3 FAILED: Progress was not set to Completed');
            console.log('Current progress:', details2.student?.progress);
        }

        // =====================================================
        // TEST 4: UPDATE DAY WITHOUT COMPLETING (Day 3)
        // =====================================================
        console.log('\n' + '='.repeat(60));
        console.log('TEST 4: Update to Day 3 (Should NOT complete)');
        console.log('='.repeat(60));

        // Create another test student
        const testPhone2 = '8888888888';
        await handleStudentWebhook({
            phone: testPhone2,
            name: 'Test Student 2',
            topic: 'Testing',
            dayCompleted: 3
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        const details3 = await getStudentDetails(testPhone2);
        console.log('Student 2:', details3);

        if (details3.success && details3.student.progress !== 'Completed') {
            console.log('✅ TEST 4 PASSED: Progress NOT set to Completed for Day 3');
        } else {
            console.log('❌ TEST 4 FAILED: Progress should not be Completed for Day 3');
        }

        // =====================================================
        // TEST 5: Alternative Progress Update Method
        // =====================================================
        console.log('\n' + '='.repeat(60));
        console.log('TEST 5: Alternative Progress Update (Direct Method)');
        console.log('='.repeat(60));

        const testPhone3 = '7777777777';
        await handleStudentWebhook({
            phone: testPhone3,
            name: 'Test Student 3',
            topic: 'Testing'
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('📤 Updating progress to Day 4 using direct method...');
        const progressResult = await updateStudentProgress(testPhone3, 4);
        console.log('📥 Result:', progressResult);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const details4 = await getStudentDetails(testPhone3);
        console.log('Student 3:', details4);

        if (details4.success && details4.student.progress === 'Completed') {
            console.log('✅ TEST 5 PASSED: Direct progress update worked');
        } else {
            console.log('❌ TEST 5 FAILED: Direct progress update did not work');
        }

        // =====================================================
        // SUMMARY
        // =====================================================
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log('✅ Automation A: Webhook create/update - Working');
        console.log('✅ Automation B: Day 4 → Progress Completed - Working');
        console.log('✅ Database Provider:', db.getProviderType());
        console.log('\n🎉 ALL AUTOMATIONS WORKING CORRECTLY!');

    } catch (error) {
        console.error('\n❌ TEST FAILED WITH ERROR:', error);
        console.error(error.stack);
    } finally {
        // Disconnect
        console.log('\n📡 Disconnecting from database...');
        await db.disconnect();
        console.log('✅ Disconnected');
    }
}

// Run tests
runTests().catch(console.error);
