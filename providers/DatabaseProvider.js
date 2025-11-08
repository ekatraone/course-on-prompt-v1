/**
 * Base Database Provider Interface
 *
 * This abstract class defines the contract that all database providers must implement.
 * It allows the application to switch between different databases (Airtable, Azure SQL, PostgreSQL, etc.)
 * without changing business logic.
 */

class DatabaseProvider {
    constructor(config) {
        if (this.constructor === DatabaseProvider) {
            throw new Error("DatabaseProvider is an abstract class and cannot be instantiated directly");
        }
        this.config = config;
    }

    // Student Operations
    async createStudentRecord(phoneNumber, name, topic) {
        throw new Error("Method 'createStudentRecord()' must be implemented");
    }

    async findStudentRecord(phoneNumber) {
        throw new Error("Method 'findStudentRecord()' must be implemented");
    }

    async updateStudentRecord(studentId, courseData) {
        throw new Error("Method 'updateStudentRecord()' must be implemented");
    }

    async updateStudentField(studentId, fieldName, fieldValue) {
        throw new Error("Method 'updateStudentField()' must be implemented");
    }

    async getStudentField(phoneNumber, fieldName) {
        throw new Error("Method 'getStudentField()' must be implemented");
    }

    async getStudentId(phoneNumber) {
        throw new Error("Method 'getStudentId()' must be implemented");
    }

    // Course Operations
    async createCourseTable(courseName, courseFields) {
        throw new Error("Method 'createCourseTable()' must be implemented");
    }

    async updateCourseTable(courseName, newTableName) {
        throw new Error("Method 'updateCourseTable()' must be implemented");
    }

    async createCourseRecord(recordArray, courseName) {
        throw new Error("Method 'createCourseRecord()' must be implemented");
    }

    async listCourseFields(courseName) {
        throw new Error("Method 'listCourseFields()' must be implemented");
    }

    async getCourseTable(phoneNumber) {
        throw new Error("Method 'getCourseTable()' must be implemented");
    }

    async getTotalDays(phoneNumber) {
        throw new Error("Method 'getTotalDays()' must be implemented");
    }

    // Content Retrieval Operations
    async getContentTitle(currentDay, moduleNo, phoneNumber) {
        throw new Error("Method 'getContentTitle()' must be implemented");
    }

    async getContentInteractive(currentDay, moduleNo, phoneNumber) {
        throw new Error("Method 'getContentInteractive()' must be implemented");
    }

    async getContentQuestion(currentDay, moduleNo, phoneNumber) {
        throw new Error("Method 'getContentQuestion()' must be implemented");
    }

    async getContentAnswer(currentDay, moduleNo, phoneNumber) {
        throw new Error("Method 'getContentAnswer()' must be implemented");
    }

    async getContentField(fieldName, currentDay, currentModule, phoneNumber) {
        throw new Error("Method 'getContentField()' must be implemented");
    }

    // Student Response Operations
    async findQuestionRecord(studentId) {
        throw new Error("Method 'findQuestionRecord()' must be implemented");
    }

    async getLastMessage(phoneNumber) {
        throw new Error("Method 'getLastMessage()' must be implemented");
    }

    // Alfred (Course Creation) Operations
    async createAlfredCourseRecord(phoneNumber, name) {
        throw new Error("Method 'createAlfredCourseRecord()' must be implemented");
    }

    async findAlfredCourseRecord(phoneNumber) {
        throw new Error("Method 'findAlfredCourseRecord()' must be implemented");
    }

    async updateAlfredData(courseId, fieldName, fieldValue) {
        throw new Error("Method 'updateAlfredData()' must be implemented");
    }

    // Waitlist Operations
    async getExistingStudents(phoneNumber) {
        throw new Error("Method 'getExistingStudents()' must be implemented");
    }

    async getExistingStudentsInternal(phoneNumber) {
        throw new Error("Method 'getExistingStudentsInternal()' must be implemented");
    }

    async updateInternalStudentRecord(studentId, lastMsg) {
        throw new Error("Method 'updateInternalStudentRecord()' must be implemented");
    }

    // Connection Management
    async connect() {
        throw new Error("Method 'connect()' must be implemented");
    }

    async disconnect() {
        throw new Error("Method 'disconnect()' must be implemented");
    }

    async healthCheck() {
        throw new Error("Method 'healthCheck()' must be implemented");
    }
}

module.exports = DatabaseProvider;
