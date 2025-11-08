-- =====================================================
-- Azure SQL Database Schema for Course-on-Prompt
-- =====================================================
-- This schema provides the database structure needed
-- to migrate from Airtable to Azure SQL Database.
--
-- Run this script on your Azure SQL Database to create
-- the required tables and indexes.
-- =====================================================

-- =====================================================
-- 1. STUDENTS TABLE
-- =====================================================
-- Stores student information and progress
CREATE TABLE Students (
    id INT IDENTITY(1,1) PRIMARY KEY,
    phone VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    topic VARCHAR(255),
    module_completed INT DEFAULT 0,
    next_module INT DEFAULT 1,
    day_completed INT DEFAULT 0,
    next_day INT DEFAULT 1,
    progress VARCHAR(50) DEFAULT 'In Progress',
    last_msg TEXT,
    responses TEXT,
    source VARCHAR(50),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Index for faster phone number lookups
CREATE INDEX idx_students_phone ON Students(phone);
CREATE INDEX idx_students_topic ON Students(topic);
CREATE INDEX idx_students_progress ON Students(progress);

-- =====================================================
-- 2. COURSES TABLE
-- =====================================================
-- Stores course metadata
CREATE TABLE Courses (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    fields_schema TEXT, -- JSON string of field definitions
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Index for faster course lookups
CREATE INDEX idx_courses_name ON Courses(name);

-- =====================================================
-- 3. COURSE CONTENT TABLE
-- =====================================================
-- Stores course content (modules, lessons, questions)
CREATE TABLE CourseContent (
    id INT IDENTITY(1,1) PRIMARY KEY,
    course_id INT NOT NULL,
    day INT NOT NULL,
    module_no INT NOT NULL,

    -- Content fields
    title VARCHAR(500),
    list_options TEXT,
    interactive_body TEXT,
    interactive_buttons TEXT,
    question TEXT,
    answer TEXT,
    feedback TEXT,

    -- Generic storage for additional fields
    content_data TEXT, -- JSON string for flexible storage

    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),

    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE
);

-- Indexes for faster content retrieval
CREATE INDEX idx_content_course ON CourseContent(course_id);
CREATE INDEX idx_content_day ON CourseContent(day);
CREATE INDEX idx_content_module ON CourseContent(module_no);
CREATE INDEX idx_content_course_day_module ON CourseContent(course_id, day, module_no);

-- =====================================================
-- 4. ALFRED COURSES TABLE
-- =====================================================
-- Stores course creation requests (Alfred feature)
CREATE TABLE AlfredCourses (
    id INT IDENTITY(1,1) PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    topic VARCHAR(500),
    course_status VARCHAR(50) DEFAULT 'Pending Approval',
    progress VARCHAR(50) DEFAULT 'In Progress',
    last_msg TEXT,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Index for faster phone lookups
CREATE INDEX idx_alfred_phone ON AlfredCourses(phone);
CREATE INDEX idx_alfred_status ON AlfredCourses(course_status);

-- =====================================================
-- 5. WAITLIST TABLE
-- =====================================================
-- Stores waitlist entries
CREATE TABLE Waitlist (
    id INT IDENTITY(1,1) PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    topic VARCHAR(255),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Index for waitlist lookups
CREATE INDEX idx_waitlist_phone ON Waitlist(phone);

-- =====================================================
-- 6. CHAT LOGS TABLE (MongoDB replacement)
-- =====================================================
-- Stores chat conversation logs
CREATE TABLE ChatLogs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    chat_log TEXT,
    status VARCHAR(50) DEFAULT 'Open',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Index for user lookups
CREATE INDEX idx_chatlog_userid ON ChatLogs(user_id);
CREATE INDEX idx_chatlog_status ON ChatLogs(status);

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================
-- Automatically update the updated_at timestamp

-- Students trigger
GO
CREATE TRIGGER trg_students_updated_at
ON Students
AFTER UPDATE
AS
BEGIN
    UPDATE Students
    SET updated_at = GETDATE()
    FROM Students s
    INNER JOIN inserted i ON s.id = i.id
END;
GO

-- Courses trigger
CREATE TRIGGER trg_courses_updated_at
ON Courses
AFTER UPDATE
AS
BEGIN
    UPDATE Courses
    SET updated_at = GETDATE()
    FROM Courses c
    INNER JOIN inserted i ON c.id = i.id
END;
GO

-- CourseContent trigger
CREATE TRIGGER trg_coursecontent_updated_at
ON CourseContent
AFTER UPDATE
AS
BEGIN
    UPDATE CourseContent
    SET updated_at = GETDATE()
    FROM CourseContent cc
    INNER JOIN inserted i ON cc.id = i.id
END;
GO

-- AlfredCourses trigger
CREATE TRIGGER trg_alfredcourses_updated_at
ON AlfredCourses
AFTER UPDATE
AS
BEGIN
    UPDATE AlfredCourses
    SET updated_at = GETDATE()
    FROM AlfredCourses ac
    INNER JOIN inserted i ON ac.id = i.id
END;
GO

-- ChatLogs trigger
CREATE TRIGGER trg_chatlogs_updated_at
ON ChatLogs
AFTER UPDATE
AS
BEGIN
    UPDATE ChatLogs
    SET updated_at = GETDATE()
    FROM ChatLogs cl
    INNER JOIN inserted i ON cl.id = i.id
END;
GO

-- =====================================================
-- 8. SAMPLE DATA MIGRATION QUERIES
-- =====================================================
-- These are example queries for migrating data from Airtable

-- Example: Insert a student
-- INSERT INTO Students (phone, name, topic, module_completed, next_module, day_completed, next_day, progress)
-- VALUES ('+1234567890', 'John Doe', 'JavaScript Basics', 5, 6, 2, 3, 'In Progress');

-- Example: Insert a course
-- INSERT INTO Courses (name, description)
-- VALUES ('JavaScript Basics', 'Learn JavaScript fundamentals');

-- Example: Insert course content
-- INSERT INTO CourseContent (course_id, day, module_no, title, question, answer)
-- VALUES (1, 1, 1, 'Introduction to Variables', 'What is a variable?', 'A variable is a container for storing data values.');

-- =====================================================
-- 9. VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Student Progress Report
GO
CREATE VIEW vw_student_progress AS
SELECT
    s.id,
    s.phone,
    s.name,
    s.topic,
    s.module_completed,
    s.next_module,
    s.day_completed,
    s.next_day,
    s.progress,
    c.name as course_name,
    c.description as course_description
FROM Students s
LEFT JOIN Courses c ON s.topic = c.name;
GO

-- View: Course Content Summary
CREATE VIEW vw_course_content_summary AS
SELECT
    c.name as course_name,
    COUNT(DISTINCT cc.day) as total_days,
    COUNT(cc.id) as total_modules,
    c.description
FROM Courses c
LEFT JOIN CourseContent cc ON c.id = cc.course_id
GROUP BY c.name, c.description;
GO

-- =====================================================
-- 10. STORED PROCEDURES
-- =====================================================

-- Procedure: Get Student Progress
CREATE PROCEDURE sp_get_student_progress
    @phone VARCHAR(50)
AS
BEGIN
    SELECT
        s.*,
        c.name as course_name,
        (SELECT COUNT(*) FROM CourseContent cc WHERE cc.course_id = c.id) as total_modules
    FROM Students s
    LEFT JOIN Courses c ON s.topic = c.name
    WHERE s.phone = @phone;
END;
GO

-- Procedure: Update Student Progress
CREATE PROCEDURE sp_update_student_progress
    @phone VARCHAR(50),
    @module_completed INT,
    @day_completed INT
AS
BEGIN
    UPDATE Students
    SET
        module_completed = @module_completed,
        next_module = @module_completed + 1,
        day_completed = @day_completed,
        next_day = @day_completed + 1,
        updated_at = GETDATE()
    WHERE phone = @phone;
END;
GO

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Ensure your Azure SQL Database has sufficient DTUs/vCores
-- 2. Configure firewall rules to allow your application server
-- 3. Use connection pooling in your application
-- 4. Consider implementing soft deletes for production
-- 5. Set up automated backups in Azure
-- 6. Monitor query performance and add indexes as needed
-- =====================================================
