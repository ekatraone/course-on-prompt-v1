# Database Migration Guide

## Overview

This guide explains how to migrate from Airtable to Azure SQL Database (or other database providers) using the database abstraction layer.

## Architecture

The application now uses a **Provider Pattern** that abstracts database operations:

```
Application Code
      ↓
  database.js (Abstraction Layer)
      ↓
  ProviderFactory
      ↓
   ┌──────────┬──────────────┬──────────┐
   ↓          ↓              ↓          ↓
Airtable  Azure SQL  Cosmos DB  PostgreSQL
```

## Benefits

✅ **Switch databases** by changing one environment variable
✅ **No code changes** required in your application
✅ **Gradual migration** - run both databases in parallel
✅ **Easy testing** - test new databases without affecting production
✅ **Future-proof** - add new database providers easily

---

## Quick Start: Using the Abstraction Layer

### Current Setup (Airtable)

If you're currently using Airtable and want to keep using it:

1. **Set environment variable:**
   ```bash
   DB_PROVIDER=airtable
   ```

2. **Update your code** (one-time change):

   **Before:**
   ```javascript
   const airtable = require('./airtable_methods');
   const students = await airtable.find_student_record(phoneNumber);
   ```

   **After:**
   ```javascript
   const db = require('./database');
   await db.init(); // Initialize once at startup
   const students = await db.findStudentRecord(phoneNumber);
   ```

That's it! Your code now uses the abstraction layer.

---

## Migration Paths

### Option 1: Stay with Airtable
**Use this if:** Airtable works well for your needs

**Steps:**
1. Set `DB_PROVIDER=airtable` in `.env`
2. No migration needed ✅

---

### Option 2: Migrate to Azure SQL Database
**Use this if:** You need more control, better performance, or lower costs

#### Prerequisites
- Azure account with SQL Database service
- Node.js with `mssql` package: `npm install mssql`

#### Step 1: Create Azure SQL Database

1. **Create database in Azure Portal:**
   - Go to Azure Portal → Create Resource → SQL Database
   - Choose pricing tier (Basic/Standard/Premium)
   - Note: Server name, Database name, Username, Password

2. **Configure firewall:**
   - Add your application server IP to firewall rules
   - Allow Azure services to access server

#### Step 2: Create Database Schema

1. **Connect to your Azure SQL Database** using Azure Data Studio or SQL Server Management Studio

2. **Run the schema script:**
   ```bash
   # The schema file is included in this repository
   cat schema-azure-sql.sql
   ```

   Execute the contents in your Azure SQL query window

3. **Verify tables were created:**
   ```sql
   SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES;
   ```

   You should see: Students, Courses, CourseContent, AlfredCourses, Waitlist, ChatLogs

#### Step 3: Migrate Data from Airtable to Azure SQL

**Option A: Manual Export/Import (Recommended for small datasets)**

1. **Export from Airtable:**
   - Go to each Airtable base
   - Download as CSV
   - Save files: students.csv, courses.csv, etc.

2. **Import to Azure SQL:**
   ```sql
   -- Example: Import students
   BULK INSERT Students
   FROM 'students.csv'
   WITH (
       FORMAT = 'CSV',
       FIRSTROW = 2,
       FIELDTERMINATOR = ',',
       ROWTERMINATOR = '\n'
   );
   ```

**Option B: Automated Migration Script (Recommended for large datasets)**

Create a migration script `migrate-data.js`:

```javascript
const db = require('./database');
const AirtableProvider = require('./providers/AirtableProvider');
const AzureSQLProvider = require('./providers/AzureSQLProvider');

async function migrateData() {
    // Initialize both providers
    const airtable = new AirtableProvider({ /* config */ });
    const azureSQL = new AzureSQLProvider({ /* config */ });

    await airtable.connect();
    await azureSQL.connect();

    console.log('Starting migration...');

    // 1. Migrate students
    const students = await airtable.findStudentRecord(''); // Get all
    for (const student of students) {
        await azureSQL.createStudentRecord(
            student.fields.Phone,
            student.fields.Name,
            student.fields.Topic
        );
    }
    console.log(`Migrated ${students.length} students`);

    // 2. Migrate courses
    // ... similar process

    console.log('Migration complete!');
}

migrateData().catch(console.error);
```

Run the migration:
```bash
node migrate-data.js
```

#### Step 4: Update Environment Configuration

1. **Copy `.env.example` to `.env`:**
   ```bash
   cp .env.example .env
   ```

2. **Configure Azure SQL credentials:**
   ```env
   DB_PROVIDER=azure-sql

   AZURE_SQL_SERVER=your-server.database.windows.net
   AZURE_SQL_DATABASE=course-on-prompt-db
   AZURE_SQL_USER=your_username
   AZURE_SQL_PASSWORD=your_password
   ```

#### Step 5: Test the Migration

1. **Run health check:**
   ```javascript
   const db = require('./database');
   await db.init();
   const health = await db.healthCheck();
   console.log(health); // Should show: { status: 'healthy', provider: 'Azure SQL' }
   ```

2. **Test queries:**
   ```javascript
   // Test finding a student
   const students = await db.findStudentRecord('1234567890');
   console.log('Students:', students);

   // Test creating a student
   await db.createStudentRecord('9876543210', 'Test User', 'JavaScript');
   ```

3. **Run your application:**
   ```bash
   node server.js
   ```

#### Step 6: Switch Traffic to Azure SQL

**Gradual Migration Approach (Zero Downtime):**

1. **Phase 1:** Keep `DB_PROVIDER=airtable`, verify Azure SQL is ready
2. **Phase 2:** Run parallel writes to both databases (modify code temporarily)
3. **Phase 3:** Switch reads to Azure SQL: `DB_PROVIDER=azure-sql`
4. **Phase 4:** Monitor for 48 hours
5. **Phase 5:** Stop writing to Airtable

**Direct Switch:**

1. Change `.env`: `DB_PROVIDER=azure-sql`
2. Restart application
3. Monitor logs for errors

---

### Option 3: Migrate to Other Databases

#### PostgreSQL (Future Implementation)

1. Install package: `npm install pg`
2. Create PostgreSQL provider (similar to AzureSQLProvider)
3. Update ProviderFactory to support 'postgresql'
4. Follow similar migration steps

#### MongoDB (Future Implementation)

For storing course data in MongoDB (you already use it for chat logs):

1. Install package: `npm install mongodb`
2. Create MongoDB provider
3. Update ProviderFactory
4. Migrate data

#### Cosmos DB (Future Implementation)

Azure Cosmos DB with SQL API:

1. Install package: `npm install @azure/cosmos`
2. Create CosmosDB provider
3. Update ProviderFactory
4. Migrate data

---

## Rollback Plan

If something goes wrong after migration:

### Emergency Rollback (5 minutes)

1. **Change environment variable:**
   ```bash
   DB_PROVIDER=airtable
   ```

2. **Restart application:**
   ```bash
   pm2 restart all
   # or
   node server.js
   ```

3. **Verify Airtable is working:**
   ```bash
   curl http://localhost:3000/health
   ```

### Data Rollback

If you need to restore data:

1. **Keep Airtable data** until you're confident Azure SQL works
2. **Backup Azure SQL** before migration:
   ```sql
   -- Create backup
   BACKUP DATABASE [course-on-prompt-db]
   TO DISK = 'backup.bak';
   ```

---

## Testing Checklist

Before going live with a new database:

- [ ] Health check passes: `await db.healthCheck()`
- [ ] Can create student record
- [ ] Can find student record
- [ ] Can update student record
- [ ] Can retrieve course content
- [ ] Can handle errors gracefully
- [ ] Performance is acceptable (< 200ms per query)
- [ ] Connection pooling is configured
- [ ] Backup strategy is in place
- [ ] Monitoring/logging is set up

---

## Performance Optimization

### Azure SQL

1. **Enable Connection Pooling:**
   ```javascript
   // Already configured in AzureSQLProvider
   pool: {
       max: 10,
       min: 0,
       idleTimeoutMillis: 30000
   }
   ```

2. **Add Indexes:**
   ```sql
   CREATE INDEX idx_students_phone ON Students(phone);
   ```
   *(Already included in schema-azure-sql.sql)*

3. **Use Stored Procedures:**
   ```sql
   EXEC sp_get_student_progress @phone = '1234567890';
   ```

4. **Monitor Query Performance:**
   - Use Azure Portal → Query Performance Insight
   - Identify slow queries
   - Add indexes as needed

---

## Cost Comparison

### Airtable
- **Free tier:** 1,200 records/base
- **Plus:** $10/user/month (5,000 records/base)
- **Pro:** $20/user/month (50,000 records/base)

### Azure SQL
- **Basic:** ~$5/month (2 GB storage)
- **Standard S0:** ~$15/month (250 GB storage)
- **Standard S1:** ~$30/month (250 GB storage, better performance)

**Cost Savings:** For large datasets (>50,000 records), Azure SQL can be **5-10x cheaper** than Airtable.

---

## Troubleshooting

### Connection Issues

**Error:** `Database not initialized`
```javascript
// Solution: Call init() before using database
const db = require('./database');
await db.init();
```

**Error:** `Cannot connect to Azure SQL`
```bash
# Check:
1. Firewall rules (Azure Portal)
2. Credentials in .env
3. Server name format: your-server.database.windows.net
```

### Migration Issues

**Error:** `Field X not found`
```javascript
// Solution: Verify schema matches
// Check schema-azure-sql.sql for required fields
```

**Error:** `Data type mismatch`
```javascript
// Solution: Convert data types during migration
// Example: Convert Airtable ID to integer
const id = parseInt(airtableRecord.id, 10);
```

---

## Support

### Files Reference

- `database.js` - Main abstraction layer
- `providers/DatabaseProvider.js` - Base interface
- `providers/AirtableProvider.js` - Airtable implementation
- `providers/AzureSQLProvider.js` - Azure SQL implementation
- `providers/ProviderFactory.js` - Provider factory
- `schema-azure-sql.sql` - Database schema
- `.env.example` - Configuration template

### Need Help?

1. Check the logs: `LOG_LEVEL=debug` in `.env`
2. Run health check: `await db.healthCheck()`
3. Verify environment variables: `echo $DB_PROVIDER`
4. Review this guide
5. Open an issue on GitHub

---

## Summary

✅ **Current state:** Application can use Airtable OR Azure SQL
✅ **Migration ready:** Schema and providers are ready
✅ **Flexible:** Easy to add more database providers
✅ **Safe:** Can rollback in minutes
✅ **Cost-effective:** Significant savings for large datasets

**Next Steps:**
1. Review this guide
2. Choose migration path (stay with Airtable or migrate)
3. Follow step-by-step instructions
4. Test thoroughly
5. Deploy with confidence

---

*Last updated: 2025-11-08*
