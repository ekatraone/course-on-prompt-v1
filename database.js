require('dotenv').config();
const ProviderFactory = require('./providers/ProviderFactory');

/**
 * Database Abstraction Layer
 *
 * This module provides a unified interface to database operations,
 * allowing the application to switch between different database providers
 * (Airtable, Azure SQL, PostgreSQL, etc.) without changing application code.
 *
 * Usage:
 *   const db = require('./database');
 *   await db.init();
 *   const students = await db.findStudentRecord(phoneNumber);
 *
 * Configuration:
 *   Set DB_PROVIDER environment variable to: 'airtable', 'azure-sql', etc.
 *   Default: 'airtable'
 */

class Database {
    constructor() {
        this.provider = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the database provider
     */
    async init(providerType = null) {
        try {
            const type = providerType || process.env.DB_PROVIDER || 'airtable';

            console.log(`Initializing database provider: ${type}`);

            // Validate configuration before creating provider
            ProviderFactory.validateConfig(type, {});

            // Create provider
            this.provider = ProviderFactory.createProvider(type, {});

            // Connect to database
            await this.provider.connect();

            // Health check
            const health = await this.provider.healthCheck();
            console.log('Database health check:', health);

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    /**
     * Ensure provider is initialized
     */
    ensureInitialized() {
        if (!this.isInitialized || !this.provider) {
            throw new Error('Database not initialized. Call db.init() first.');
        }
    }

    /**
     * Disconnect from database
     */
    async disconnect() {
        if (this.provider) {
            await this.provider.disconnect();
            this.isInitialized = false;
        }
    }

    // ==================== Student Operations ====================

    async createStudentRecord(phoneNumber, name, topic) {
        this.ensureInitialized();
        return await this.provider.createStudentRecord(phoneNumber, name, topic);
    }

    async findStudentRecord(phoneNumber) {
        this.ensureInitialized();
        return await this.provider.findStudentRecord(phoneNumber);
    }

    async updateStudentRecord(studentId, courseData) {
        this.ensureInitialized();
        return await this.provider.updateStudentRecord(studentId, courseData);
    }

    async updateField(studentId, fieldName, fieldValue) {
        this.ensureInitialized();
        return await this.provider.updateStudentField(studentId, fieldName, fieldValue);
    }

    async findField(phoneNumber, fieldName) {
        this.ensureInitialized();
        return await this.provider.getStudentField(phoneNumber, fieldName);
    }

    async getID(phoneNumber) {
        this.ensureInitialized();
        return await this.provider.getStudentId(phoneNumber);
    }

    // ==================== Course Operations ====================

    async createTable(courseName, courseFields) {
        this.ensureInitialized();
        return await this.provider.createCourseTable(courseName, courseFields);
    }

    async updateCourseTable(courseName, newTableName) {
        this.ensureInitialized();
        return await this.provider.updateCourseTable(courseName, newTableName);
    }

    async create_record(recordArray, courseName) {
        this.ensureInitialized();
        return await this.provider.createCourseRecord(recordArray, courseName);
    }

    async ListCourseFields(courseName) {
        this.ensureInitialized();
        return await this.provider.listCourseFields(courseName);
    }

    async findTable(phoneNumber) {
        this.ensureInitialized();
        return await this.provider.getCourseTable(phoneNumber);
    }

    async totalDays(phoneNumber) {
        this.ensureInitialized();
        return await this.provider.getTotalDays(phoneNumber);
    }

    // ==================== Content Retrieval ====================

    async findTitle(currentDay, moduleNo, phoneNumber) {
        this.ensureInitialized();
        return await this.provider.getContentTitle(currentDay, moduleNo, phoneNumber);
    }

    async findInteractive(currentDay, moduleNo, phoneNumber) {
        this.ensureInitialized();
        return await this.provider.getContentInteractive(currentDay, moduleNo, phoneNumber);
    }

    async findQuestion(currentDay, moduleNo, phoneNumber) {
        this.ensureInitialized();
        return await this.provider.getContentQuestion(currentDay, moduleNo, phoneNumber);
    }

    async findAns(currentDay, moduleNo, phoneNumber) {
        this.ensureInitialized();
        return await this.provider.getContentAnswer(currentDay, moduleNo, phoneNumber);
    }

    async find_ContentField(fieldName, currentDay, currentModule, phoneNumber) {
        this.ensureInitialized();
        return await this.provider.getContentField(fieldName, currentDay, currentModule, phoneNumber);
    }

    // ==================== Student Responses ====================

    async findQuesRecord(studentId) {
        this.ensureInitialized();
        return await this.provider.findQuestionRecord(studentId);
    }

    async findLastMsg(phoneNumber) {
        this.ensureInitialized();
        return await this.provider.getLastMessage(phoneNumber);
    }

    // ==================== Alfred Operations ====================

    async create_course_record(phoneNumber, name) {
        this.ensureInitialized();
        return await this.provider.createAlfredCourseRecord(phoneNumber, name);
    }

    async find_alfred_course_record(phoneNumber) {
        this.ensureInitialized();
        return await this.provider.findAlfredCourseRecord(phoneNumber);
    }

    async updateAlfredData(courseId, fieldName, fieldValue) {
        this.ensureInitialized();
        return await this.provider.updateAlfredData(courseId, fieldName, fieldValue);
    }

    // ==================== Waitlist Operations ====================

    async existingStudents(phoneNumber) {
        this.ensureInitialized();
        return await this.provider.getExistingStudents(phoneNumber);
    }

    async existingStudents_internal(phoneNumber) {
        this.ensureInitialized();
        return await this.provider.getExistingStudentsInternal(phoneNumber);
    }

    async update_internal_student_record(studentId, lastMsg) {
        this.ensureInitialized();
        return await this.provider.updateInternalStudentRecord(studentId, lastMsg);
    }

    // ==================== Utility ====================

    async healthCheck() {
        this.ensureInitialized();
        return await this.provider.healthCheck();
    }

    getProviderType() {
        return process.env.DB_PROVIDER || 'airtable';
    }

    getAvailableProviders() {
        return ProviderFactory.getAvailableProviders();
    }
}

// Export singleton instance
const db = new Database();

module.exports = db;
