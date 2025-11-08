const DatabaseProvider = require('./DatabaseProvider');
const axios = require('axios');
const Airtable = require('airtable');

/**
 * Airtable Database Provider Implementation
 *
 * This provider wraps the existing Airtable functionality and implements
 * the DatabaseProvider interface, allowing seamless migration to other databases.
 */
class AirtableProvider extends DatabaseProvider {
    constructor(config) {
        super(config);

        // Initialize Airtable connections
        this.internalCourse = new Airtable({ apiKey: config.apiKey }).base(config.internalCourseBase);
        this.studentBase = new Airtable({ apiKey: config.apiKey }).base(config.studentBase);
        this.courseBase = new Airtable({ apiKey: config.apiKey }).base(config.courseBase);
        this.alfredBase = new Airtable({ apiKey: config.apiKey }).base(config.alfredBase);

        this.personalAccessToken = config.personalAccessToken;
        this.studentTable = config.studentTable;
        this.alfredTable = config.alfredTable;
        this.alfredWaitlistBase = config.alfredWaitlistBase;
    }

    async connect() {
        // Airtable doesn't require explicit connection
        console.log("Airtable provider initialized");
        return true;
    }

    async disconnect() {
        // Airtable doesn't require explicit disconnection
        console.log("Airtable provider disconnected");
        return true;
    }

    async healthCheck() {
        try {
            // Test connection by attempting to read from student table
            await this.studentBase('Student').select({ maxRecords: 1 }).firstPage();
            return { status: 'healthy', provider: 'Airtable' };
        } catch (error) {
            return { status: 'unhealthy', provider: 'Airtable', error: error.message };
        }
    }

    // Student Operations
    async createStudentRecord(phoneNumber, name, topic) {
        const data = JSON.stringify({
            "records": [{
                fields: {
                    'Phone': phoneNumber,
                    'Name': name,
                    'Topic': topic,
                    'Module Completed': 0,
                    'Next Module': 1,
                    'Day Completed': 0,
                    'Next Day': 1,
                    'Progress': 'In Progress'
                }
            }]
        });

        const config = {
            method: 'post',
            url: `https://api.airtable.com/v0/${this.config.studentBase}/${this.studentTable}`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
            data: data
        };

        try {
            const response = await axios.request(config);
            console.log(response.data);
            return response.status;
        } catch (error) {
            console.log(error.response.data);
            return error.response.data;
        }
    }

    async findStudentRecord(phoneNumber) {
        const config = {
            method: 'GET',
            url: `https://api.airtable.com/v0/${this.config.studentBase}/Student?fields%5B%5D=Phone&filterByFormula=Phone%3D${phoneNumber}`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await axios.request(config);
            console.log(response.data);
            return response.data.records;
        } catch (error) {
            console.log(error);
            return error.response.data;
        }
    }

    async updateStudentRecord(studentId, courseData) {
        const data = JSON.stringify({
            fields: {
                'Topic': courseData.courseName,
                'Module Completed': 0,
                'Next Module': 1,
                'Day Completed': 0,
                'Next Day': 1
            }
        });

        const config = {
            method: 'PATCH',
            url: `https://api.airtable.com/v0/${this.config.studentBase}/${this.studentTable}/${studentId}`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
            data: data
        };

        try {
            const response = await axios.request(config);
            return response.status;
        } catch (error) {
            console.log(error.response.data);
            return error.response.data;
        }
    }

    async updateStudentField(studentId, fieldName, fieldValue) {
        await this.studentBase('Student').update([{
            "id": studentId,
            "fields": {
                [fieldName]: fieldValue
            }
        }], function (err, records) {
            if (err) {
                console.log(err);
            }
        });
    }

    async getStudentField(phoneNumber, fieldName) {
        const records = await this.studentBase("Student").select({
            filterByFormula: "({Phone} =" + phoneNumber + ")",
            view: "Grid view",
        }).all();

        return new Promise((resolve, reject) => {
            records.forEach(function (record) {
                let body = record.get(fieldName);
                if (body !== undefined) {
                    resolve(body);
                } else {
                    resolve(0);
                }
            });
        });
    }

    async getStudentId(phoneNumber) {
        const courseTable = await this.studentBase('Student').select({
            filterByFormula: "({Phone} = " + phoneNumber + ")",
            view: "Grid view"
        }).all();

        return new Promise((resolve, reject) => {
            courseTable.forEach(function (record) {
                let id = record.id;
                resolve(id);
            });
        });
    }

    // Course Operations
    async createCourseTable(courseName, courseFields) {
        const data = JSON.stringify({
            "description": courseName + " Course generated by COP",
            "fields": courseFields,
            "name": courseName
        });

        const config = {
            method: 'post',
            url: `https://api.airtable.com/v0/meta/bases/${this.config.courseBase}/tables`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
            data: data
        };

        try {
            const response = await axios.request(config);
            console.log(JSON.stringify(response.data.id));
            return response.data.id;
        } catch (error) {
            console.log("Error creating table:", error.response.data);
            return error.response.data;
        }
    }

    async updateCourseTable(courseName, newTableName) {
        const data = JSON.stringify({
            "name": newTableName
        });

        const config = {
            method: 'patch',
            url: `https://api.airtable.com/v0/meta/bases/${this.config.courseBase}/tables/${courseName}`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
            data: data
        };

        try {
            const response = await axios.request(config);
            return response.status;
        } catch (error) {
            console.log("Update table error:", error.response.data);
            return error.response.data;
        }
    }

    async createCourseRecord(recordArray, courseName) {
        const data = JSON.stringify({
            "records": recordArray
        });

        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `https://api.airtable.com/v0/${this.config.courseBase}/${courseName}`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
            data: data
        };

        try {
            const response = await axios.request(config);
            console.log(response.data);
            return response.status;
        } catch (error) {
            console.log(error.response.data);
            return error.response.data;
        }
    }

    async listCourseFields(courseName) {
        const config = {
            method: 'GET',
            url: `https://api.airtable.com/v0/${this.config.courseBase}/${courseName}`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await axios.request(config);
            console.log(response.data.records);
            return response.data;
        } catch (error) {
            console.log("List record error:", error.response.data);
            return error.response.data;
        }
    }

    async getCourseTable(phoneNumber) {
        const courseTable = await this.studentBase('Student').select({
            filterByFormula: "({Phone} = " + phoneNumber + ")",
            view: "Grid view"
        }).all();

        return new Promise((resolve, reject) => {
            let courseTableName = "";
            courseTable.forEach(function (record) {
                courseTableName = record.get("Topic");
                resolve(courseTableName);
                reject("error");
            });
        });
    }

    async getTotalDays(phoneNumber) {
        const courseTableName = await this.getCourseTable(phoneNumber);
        const courseTable = await this.courseBase(courseTableName).select({
            fields: ["Day"],
            view: "Grid view"
        }).all();

        return new Promise((resolve, reject) => {
            let count = 0;
            courseTable.forEach(function (record) {
                count += 1;
            });
            console.log(count);
            resolve(count);
            reject("Error");
        });
    }

    // Content Retrieval Operations
    async getContentTitle(currentDay, moduleNo, phoneNumber) {
        const courseTableName = await this.getCourseTable(phoneNumber);
        const records = await this.courseBase(courseTableName).select({
            filterByFormula: "({Day} =" + currentDay + ")",
            view: "Grid view",
        }).all();

        return new Promise((resolve, reject) => {
            records.forEach(function (record) {
                let title = record.get('Module ' + moduleNo + ' LTitle');
                let options = record.get('Module ' + moduleNo + ' List');
                if (title !== undefined) {
                    console.log(title, options.split("\n"));
                    resolve([title, options.split("\n")]);
                } else {
                    resolve([0, 0]);
                }
            });
        });
    }

    async getContentInteractive(currentDay, moduleNo, phoneNumber) {
        const courseTableName = await this.getCourseTable(phoneNumber);
        const records = await this.courseBase(courseTableName).select({
            filterByFormula: "({Day} =" + currentDay + ")",
            view: "Grid view",
        }).all();

        return new Promise((resolve, reject) => {
            records.forEach(function (record) {
                let body = record.get('Module ' + moduleNo + ' iBody');
                let buttons = record.get('Module ' + moduleNo + ' iButtons');
                if (body !== undefined) {
                    resolve([body, buttons.split("\n")]);
                    reject("error");
                }
            });
        });
    }

    async getContentQuestion(currentDay, moduleNo, phoneNumber) {
        const courseTableName = await this.getCourseTable(phoneNumber);
        const records = await this.courseBase(courseTableName).select({
            filterByFormula: "({Day} =" + currentDay + ")",
            view: "Grid view",
        }).all();

        return new Promise((resolve, reject) => {
            records.forEach(function (record) {
                let body = record.get('Module ' + moduleNo + ' Question');
                if (body !== undefined) {
                    resolve(body);
                    reject("error");
                }
            });
        });
    }

    async getContentAnswer(currentDay, moduleNo, phoneNumber) {
        const courseTableName = await this.getCourseTable(phoneNumber);
        const records = await this.courseBase(courseTableName).select({
            filterByFormula: "({Day} =" + currentDay + ")",
            view: "Grid view",
        }).all();

        return new Promise((resolve, reject) => {
            records.forEach(function (record) {
                let body = record.get('Module ' + moduleNo + ' Ans');
                if (body !== undefined) {
                    resolve(body);
                    reject("error");
                }
            });
        });
    }

    async getContentField(fieldName, currentDay, currentModule, phoneNumber) {
        const courseTableName = await this.getCourseTable(phoneNumber);
        const records = await this.courseBase(courseTableName).select({
            filterByFormula: "({Day} =" + currentDay + ")",
            view: "Grid view",
        }).all();

        return new Promise((resolve, reject) => {
            records.forEach(function (record) {
                let body = record.get(`Module ${currentModule} ${fieldName}`);
                if (body !== undefined) {
                    let feedbackOptions = [body];
                    resolve(feedbackOptions[0].split("\n"));
                } else {
                    console.log("Feedback 0");
                    resolve(0);
                }
            });
        });
    }

    // Student Response Operations
    async findQuestionRecord(studentId) {
        return new Promise((resolve, reject) => {
            this.studentBase('Student').find(studentId, function (err, record) {
                if (err) {
                    console.error(err);
                    return;
                }
                resolve(record.fields.Responses);
            });
        });
    }

    async getLastMessage(phoneNumber) {
        const records = await this.studentBase("Student").select({
            filterByFormula: "({Phone} =" + phoneNumber + ")",
            view: "Grid view",
        }).all();

        return new Promise((resolve, reject) => {
            records.forEach(function (record) {
                let body = record.get('Last_Msg');
                if (body !== undefined) {
                    console.log("Last msg of " + phoneNumber, body);
                    resolve(body);
                } else {
                    console.log("Last msg of " + phoneNumber, body);
                    resolve(undefined);
                }
            });
        });
    }

    // Alfred (Course Creation) Operations
    async createAlfredCourseRecord(phoneNumber, name) {
        const data = JSON.stringify({
            "records": [{
                fields: {
                    'Phone': phoneNumber,
                    'Name': name,
                    'Topic': "",
                    'Course Status': "Pending Approval",
                    'Progress': "In Progress",
                }
            }]
        });

        const config = {
            method: 'post',
            url: `https://api.airtable.com/v0/${this.config.alfredBase}/${this.alfredTable}`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
            data: data
        };

        try {
            const response = await axios.request(config);
            console.log(response.data);
            return response.status;
        } catch (error) {
            console.log(error.response.data);
            return error.response.data;
        }
    }

    async findAlfredCourseRecord(phoneNumber) {
        const config = {
            method: 'GET',
            url: `https://api.airtable.com/v0/${this.config.alfredBase}/${this.alfredTable}?fields%5B%5D=Phone&fields%5B%5D=Last_Msg&filterByFormula=Phone%3D${phoneNumber}`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await axios.request(config);
            return response.data.records;
        } catch (error) {
            console.log("Alfred Record Error", error);
            return error.response.data;
        }
    }

    async updateAlfredData(courseId, fieldName, fieldValue) {
        const data = JSON.stringify({
            fields: {
                [fieldName]: fieldValue,
            }
        });

        const config = {
            method: 'PATCH',
            url: `https://api.airtable.com/v0/${this.config.alfredBase}/${this.alfredTable}/${courseId}`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
            data: data
        };

        try {
            const response = await axios.request(config);
            return response.status;
        } catch (error) {
            console.log(error.response.data);
            return error.response.data;
        }
    }

    // Waitlist Operations
    async getExistingStudents(phoneNumber) {
        const config = {
            method: 'GET',
            url: `https://api.airtable.com/v0/${this.alfredWaitlistBase}/tblAq61H84ablbDlW?fields%5B%5D=Phone&fields%5B%5D=Topic`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await axios.request(config);
            return response.data.records;
        } catch (error) {
            console.log(error);
            return error.response.data;
        }
    }

    async getExistingStudentsInternal(phoneNumber) {
        const config = {
            method: 'GET',
            url: `https://api.airtable.com/v0/${this.config.internalCourseBase}/Student?fields%5B%5D=Phone&fields%5B%5D=Course&fields%5B%5D=Last_Msg&filterByFormula=Phone%3D${phoneNumber}`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await axios.request(config);
            return response.data.records;
        } catch (error) {
            console.log(error);
            return error.response.data;
        }
    }

    async updateInternalStudentRecord(studentId, lastMsg) {
        const data = JSON.stringify({
            fields: {
                'Last_Msg': lastMsg,
                'Source': "COP"
            }
        });

        const config = {
            method: 'PATCH',
            url: `https://api.airtable.com/v0/${this.config.internalCourseBase}/Student/${studentId}`,
            headers: {
                'Authorization': `Bearer ${this.personalAccessToken}`,
                'Content-Type': 'application/json',
            },
            data: data
        };

        try {
            const response = await axios.request(config);
            return response.status;
        } catch (error) {
            console.log("Error:", error.response.data);
            return error.response.data;
        }
    }
}

module.exports = AirtableProvider;
