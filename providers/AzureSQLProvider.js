const DatabaseProvider = require('./DatabaseProvider');
const sql = require('mssql');

/**
 * Azure SQL Database Provider Implementation
 *
 * This provider demonstrates how to implement the DatabaseProvider interface
 * for Azure SQL Database. It provides the same API as AirtableProvider but
 * uses SQL queries instead of Airtable API calls.
 *
 * Installation: npm install mssql
 *
 * Database Schema Required:
 * - Students table: id, phone, name, topic, module_completed, next_module, day_completed, next_day, progress, last_msg, responses
 * - Courses table: id, name, description
 * - CourseContent table: id, course_id, day, module_no, title, list, interactive_body, interactive_buttons, question, answer
 * - AlfredCourses table: id, phone, name, topic, course_status, progress, last_msg
 * - Waitlist table: id, phone, topic
 */
class AzureSQLProvider extends DatabaseProvider {
    constructor(config) {
        super(config);
        this.pool = null;

        // Azure SQL Configuration
        this.sqlConfig = {
            user: config.user,
            password: config.password,
            server: config.server, // e.g., 'your-server.database.windows.net'
            database: config.database,
            options: {
                encrypt: true, // Required for Azure
                trustServerCertificate: false,
                enableArithAbort: true
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            }
        };
    }

    async connect() {
        try {
            this.pool = await sql.connect(this.sqlConfig);
            console.log("Connected to Azure SQL Database");
            return true;
        } catch (error) {
            console.error("Azure SQL connection error:", error);
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.pool) {
                await this.pool.close();
                console.log("Disconnected from Azure SQL Database");
            }
            return true;
        } catch (error) {
            console.error("Azure SQL disconnection error:", error);
            throw error;
        }
    }

    async healthCheck() {
        try {
            const result = await this.pool.request().query('SELECT 1 AS healthcheck');
            return { status: 'healthy', provider: 'Azure SQL', result: result.recordset };
        } catch (error) {
            return { status: 'unhealthy', provider: 'Azure SQL', error: error.message };
        }
    }

    // Student Operations
    async createStudentRecord(phoneNumber, name, topic) {
        try {
            const result = await this.pool.request()
                .input('phone', sql.VarChar, phoneNumber)
                .input('name', sql.VarChar, name)
                .input('topic', sql.VarChar, topic)
                .query(`
                    INSERT INTO Students (phone, name, topic, module_completed, next_module, day_completed, next_day, progress)
                    VALUES (@phone, @name, @topic, 0, 1, 0, 1, 'In Progress')
                `);
            console.log("Student record created");
            return 200;
        } catch (error) {
            console.error("Error creating student:", error);
            return error;
        }
    }

    async findStudentRecord(phoneNumber) {
        try {
            const result = await this.pool.request()
                .input('phone', sql.VarChar, phoneNumber)
                .query('SELECT * FROM Students WHERE phone = @phone');

            // Return in Airtable-compatible format
            return result.recordset.map(record => ({
                id: record.id.toString(),
                fields: record
            }));
        } catch (error) {
            console.error("Error finding student:", error);
            return error;
        }
    }

    async updateStudentRecord(studentId, courseData) {
        try {
            const result = await this.pool.request()
                .input('id', sql.Int, studentId)
                .input('topic', sql.VarChar, courseData.courseName)
                .query(`
                    UPDATE Students
                    SET topic = @topic, module_completed = 0, next_module = 1, day_completed = 0, next_day = 1
                    WHERE id = @id
                `);
            return 200;
        } catch (error) {
            console.error("Error updating student:", error);
            return error;
        }
    }

    async updateStudentField(studentId, fieldName, fieldValue) {
        try {
            // Sanitize field name to prevent SQL injection
            const allowedFields = ['module_completed', 'next_module', 'day_completed', 'next_day', 'progress', 'last_msg', 'responses'];
            if (!allowedFields.includes(fieldName)) {
                throw new Error(`Field ${fieldName} is not allowed for update`);
            }

            const result = await this.pool.request()
                .input('id', sql.Int, studentId)
                .input('value', sql.VarChar, fieldValue)
                .query(`UPDATE Students SET ${fieldName} = @value WHERE id = @id`);

            console.log(`Updated ${fieldName} for student ${studentId}`);
        } catch (error) {
            console.error("Error updating student field:", error);
        }
    }

    async getStudentField(phoneNumber, fieldName) {
        try {
            const allowedFields = ['phone', 'name', 'topic', 'module_completed', 'next_module', 'day_completed', 'next_day', 'progress', 'last_msg', 'responses'];
            if (!allowedFields.includes(fieldName)) {
                throw new Error(`Field ${fieldName} is not allowed`);
            }

            const result = await this.pool.request()
                .input('phone', sql.VarChar, phoneNumber)
                .query(`SELECT ${fieldName} FROM Students WHERE phone = @phone`);

            if (result.recordset.length > 0) {
                return result.recordset[0][fieldName];
            }
            return 0;
        } catch (error) {
            console.error("Error getting student field:", error);
            return 0;
        }
    }

    async getStudentId(phoneNumber) {
        try {
            const result = await this.pool.request()
                .input('phone', sql.VarChar, phoneNumber)
                .query('SELECT id FROM Students WHERE phone = @phone');

            if (result.recordset.length > 0) {
                return result.recordset[0].id;
            }
            return null;
        } catch (error) {
            console.error("Error getting student ID:", error);
            return null;
        }
    }

    // Course Operations
    async createCourseTable(courseName, courseFields) {
        try {
            // In SQL, we don't dynamically create tables. Instead, insert into Courses table
            const result = await this.pool.request()
                .input('name', sql.VarChar, courseName)
                .input('description', sql.VarChar, `${courseName} Course generated by COP`)
                .input('fields', sql.VarChar, JSON.stringify(courseFields))
                .query(`
                    INSERT INTO Courses (name, description, fields_schema)
                    OUTPUT INSERTED.id
                    VALUES (@name, @description, @fields)
                `);

            console.log("Course created with ID:", result.recordset[0].id);
            return result.recordset[0].id;
        } catch (error) {
            console.error("Error creating course:", error);
            return error;
        }
    }

    async updateCourseTable(courseName, newTableName) {
        try {
            const result = await this.pool.request()
                .input('oldName', sql.VarChar, courseName)
                .input('newName', sql.VarChar, newTableName)
                .query('UPDATE Courses SET name = @newName WHERE name = @oldName');

            return 200;
        } catch (error) {
            console.error("Error updating course:", error);
            return error;
        }
    }

    async createCourseRecord(recordArray, courseName) {
        try {
            // Get course ID
            const courseResult = await this.pool.request()
                .input('name', sql.VarChar, courseName)
                .query('SELECT id FROM Courses WHERE name = @name');

            if (courseResult.recordset.length === 0) {
                throw new Error(`Course ${courseName} not found`);
            }

            const courseId = courseResult.recordset[0].id;

            // Insert content records
            for (const record of recordArray) {
                await this.pool.request()
                    .input('courseId', sql.Int, courseId)
                    .input('fields', sql.VarChar, JSON.stringify(record.fields))
                    .query('INSERT INTO CourseContent (course_id, content_data) VALUES (@courseId, @fields)');
            }

            return 200;
        } catch (error) {
            console.error("Error creating course records:", error);
            return error;
        }
    }

    async listCourseFields(courseName) {
        try {
            const result = await this.pool.request()
                .input('name', sql.VarChar, courseName)
                .query(`
                    SELECT cc.*
                    FROM CourseContent cc
                    JOIN Courses c ON cc.course_id = c.id
                    WHERE c.name = @name
                `);

            return {
                records: result.recordset.map(record => ({
                    id: record.id.toString(),
                    fields: JSON.parse(record.content_data || '{}')
                }))
            };
        } catch (error) {
            console.error("Error listing course fields:", error);
            return error;
        }
    }

    async getCourseTable(phoneNumber) {
        try {
            const result = await this.pool.request()
                .input('phone', sql.VarChar, phoneNumber)
                .query('SELECT topic FROM Students WHERE phone = @phone');

            if (result.recordset.length > 0) {
                return result.recordset[0].topic;
            }
            return null;
        } catch (error) {
            console.error("Error getting course table:", error);
            return null;
        }
    }

    async getTotalDays(phoneNumber) {
        try {
            const courseName = await this.getCourseTable(phoneNumber);
            const result = await this.pool.request()
                .input('courseName', sql.VarChar, courseName)
                .query(`
                    SELECT COUNT(DISTINCT day) as total_days
                    FROM CourseContent cc
                    JOIN Courses c ON cc.course_id = c.id
                    WHERE c.name = @courseName
                `);

            return result.recordset[0].total_days;
        } catch (error) {
            console.error("Error getting total days:", error);
            return 0;
        }
    }

    // Content Retrieval Operations
    async getContentTitle(currentDay, moduleNo, phoneNumber) {
        try {
            const courseName = await this.getCourseTable(phoneNumber);
            const result = await this.pool.request()
                .input('courseName', sql.VarChar, courseName)
                .input('day', sql.Int, currentDay)
                .input('moduleNo', sql.Int, moduleNo)
                .query(`
                    SELECT title, list_options
                    FROM CourseContent cc
                    JOIN Courses c ON cc.course_id = c.id
                    WHERE c.name = @courseName AND cc.day = @day AND cc.module_no = @moduleNo
                `);

            if (result.recordset.length > 0) {
                const record = result.recordset[0];
                return [record.title, record.list_options ? record.list_options.split("\n") : []];
            }
            return [0, 0];
        } catch (error) {
            console.error("Error getting content title:", error);
            return [0, 0];
        }
    }

    async getContentInteractive(currentDay, moduleNo, phoneNumber) {
        try {
            const courseName = await this.getCourseTable(phoneNumber);
            const result = await this.pool.request()
                .input('courseName', sql.VarChar, courseName)
                .input('day', sql.Int, currentDay)
                .input('moduleNo', sql.Int, moduleNo)
                .query(`
                    SELECT interactive_body, interactive_buttons
                    FROM CourseContent cc
                    JOIN Courses c ON cc.course_id = c.id
                    WHERE c.name = @courseName AND cc.day = @day AND cc.module_no = @moduleNo
                `);

            if (result.recordset.length > 0) {
                const record = result.recordset[0];
                return [record.interactive_body, record.interactive_buttons ? record.interactive_buttons.split("\n") : []];
            }
            return [null, null];
        } catch (error) {
            console.error("Error getting interactive content:", error);
            throw error;
        }
    }

    async getContentQuestion(currentDay, moduleNo, phoneNumber) {
        try {
            const courseName = await this.getCourseTable(phoneNumber);
            const result = await this.pool.request()
                .input('courseName', sql.VarChar, courseName)
                .input('day', sql.Int, currentDay)
                .input('moduleNo', sql.Int, moduleNo)
                .query(`
                    SELECT question
                    FROM CourseContent cc
                    JOIN Courses c ON cc.course_id = c.id
                    WHERE c.name = @courseName AND cc.day = @day AND cc.module_no = @moduleNo
                `);

            if (result.recordset.length > 0) {
                return result.recordset[0].question;
            }
            return null;
        } catch (error) {
            console.error("Error getting question:", error);
            throw error;
        }
    }

    async getContentAnswer(currentDay, moduleNo, phoneNumber) {
        try {
            const courseName = await this.getCourseTable(phoneNumber);
            const result = await this.pool.request()
                .input('courseName', sql.VarChar, courseName)
                .input('day', sql.Int, currentDay)
                .input('moduleNo', sql.Int, moduleNo)
                .query(`
                    SELECT answer
                    FROM CourseContent cc
                    JOIN Courses c ON cc.course_id = c.id
                    WHERE c.name = @courseName AND cc.day = @day AND cc.module_no = @moduleNo
                `);

            if (result.recordset.length > 0) {
                return result.recordset[0].answer;
            }
            return null;
        } catch (error) {
            console.error("Error getting answer:", error);
            throw error;
        }
    }

    async getContentField(fieldName, currentDay, currentModule, phoneNumber) {
        try {
            const courseName = await this.getCourseTable(phoneNumber);

            // Map field names to SQL columns
            const fieldMap = {
                'Feedback': 'feedback',
                'iBody': 'interactive_body',
                'iButtons': 'interactive_buttons'
            };

            const sqlField = fieldMap[fieldName] || fieldName;

            const result = await this.pool.request()
                .input('courseName', sql.VarChar, courseName)
                .input('day', sql.Int, currentDay)
                .input('moduleNo', sql.Int, currentModule)
                .query(`
                    SELECT ${sqlField} as field_value
                    FROM CourseContent cc
                    JOIN Courses c ON cc.course_id = c.id
                    WHERE c.name = @courseName AND cc.day = @day AND cc.module_no = @moduleNo
                `);

            if (result.recordset.length > 0 && result.recordset[0].field_value) {
                return result.recordset[0].field_value.split("\n");
            }
            return 0;
        } catch (error) {
            console.error("Error getting content field:", error);
            return 0;
        }
    }

    // Student Response Operations
    async findQuestionRecord(studentId) {
        try {
            const result = await this.pool.request()
                .input('id', sql.Int, studentId)
                .query('SELECT responses FROM Students WHERE id = @id');

            if (result.recordset.length > 0) {
                return result.recordset[0].responses;
            }
            return null;
        } catch (error) {
            console.error("Error finding question record:", error);
            return null;
        }
    }

    async getLastMessage(phoneNumber) {
        try {
            const result = await this.pool.request()
                .input('phone', sql.VarChar, phoneNumber)
                .query('SELECT last_msg FROM Students WHERE phone = @phone');

            if (result.recordset.length > 0) {
                console.log("Last msg of " + phoneNumber, result.recordset[0].last_msg);
                return result.recordset[0].last_msg;
            }
            return undefined;
        } catch (error) {
            console.error("Error getting last message:", error);
            return undefined;
        }
    }

    // Alfred (Course Creation) Operations
    async createAlfredCourseRecord(phoneNumber, name) {
        try {
            const result = await this.pool.request()
                .input('phone', sql.VarChar, phoneNumber)
                .input('name', sql.VarChar, name)
                .query(`
                    INSERT INTO AlfredCourses (phone, name, topic, course_status, progress)
                    VALUES (@phone, @name, '', 'Pending Approval', 'In Progress')
                `);
            return 200;
        } catch (error) {
            console.error("Error creating Alfred course:", error);
            return error;
        }
    }

    async findAlfredCourseRecord(phoneNumber) {
        try {
            const result = await this.pool.request()
                .input('phone', sql.VarChar, phoneNumber)
                .query('SELECT * FROM AlfredCourses WHERE phone = @phone');

            return result.recordset.map(record => ({
                id: record.id.toString(),
                fields: record
            }));
        } catch (error) {
            console.error("Alfred Record Error", error);
            return error;
        }
    }

    async updateAlfredData(courseId, fieldName, fieldValue) {
        try {
            const allowedFields = ['topic', 'course_status', 'progress', 'last_msg'];
            if (!allowedFields.includes(fieldName)) {
                throw new Error(`Field ${fieldName} is not allowed for update`);
            }

            const result = await this.pool.request()
                .input('id', sql.Int, courseId)
                .input('value', sql.VarChar, fieldValue)
                .query(`UPDATE AlfredCourses SET ${fieldName} = @value WHERE id = @id`);

            return 200;
        } catch (error) {
            console.error("Error updating Alfred data:", error);
            return error;
        }
    }

    // Waitlist Operations
    async getExistingStudents(phoneNumber) {
        try {
            const result = await this.pool.request()
                .query('SELECT phone, topic FROM Waitlist');

            return result.recordset.map(record => ({
                id: record.id?.toString(),
                fields: record
            }));
        } catch (error) {
            console.error("Error getting waitlist:", error);
            return error;
        }
    }

    async getExistingStudentsInternal(phoneNumber) {
        try {
            const result = await this.pool.request()
                .input('phone', sql.VarChar, phoneNumber)
                .query('SELECT phone, topic as course, last_msg FROM Students WHERE phone = @phone AND source = \'internal\'');

            return result.recordset.map(record => ({
                id: record.id?.toString(),
                fields: record
            }));
        } catch (error) {
            console.error("Error getting internal students:", error);
            return error;
        }
    }

    async updateInternalStudentRecord(studentId, lastMsg) {
        try {
            const result = await this.pool.request()
                .input('id', sql.Int, studentId)
                .input('lastMsg', sql.VarChar, lastMsg)
                .query(`UPDATE Students SET last_msg = @lastMsg, source = 'COP' WHERE id = @id`);

            return 200;
        } catch (error) {
            console.error("Error updating internal student:", error);
            return error;
        }
    }
}

module.exports = AzureSQLProvider;
