const AirtableProvider = require('./AirtableProvider');
const AzureSQLProvider = require('./AzureSQLProvider');

/**
 * Database Provider Factory
 *
 * This factory creates the appropriate database provider based on configuration.
 * It enables seamless switching between different database systems.
 *
 * Supported Providers:
 * - airtable: Airtable cloud database
 * - azure-sql: Azure SQL Database
 * - cosmos-db: Azure Cosmos DB (future implementation)
 * - postgresql: PostgreSQL (future implementation)
 * - mongodb: MongoDB (future implementation)
 */
class ProviderFactory {
    static createProvider(providerType, config) {
        switch (providerType.toLowerCase()) {
            case 'airtable':
                return new AirtableProvider({
                    apiKey: config.airtable_api || process.env.airtable_api,
                    personalAccessToken: config.personal_access_token || process.env.personal_access_token,
                    studentBase: config.student_base || process.env.student_base,
                    courseBase: config.course_base || process.env.course_base,
                    alfredBase: config.alfred_base || process.env.alfred_base,
                    internalCourseBase: config.internal_course_base || process.env.internal_course_base,
                    alfredWaitlistBase: config.alfred_waitlist_base || process.env.alfred_waitlist_base,
                    studentTable: config.student_table || process.env.student_table,
                    alfredTable: config.alfred_table || process.env.alfred_table,
                });

            case 'azure-sql':
                return new AzureSQLProvider({
                    user: config.azure_sql_user || process.env.AZURE_SQL_USER,
                    password: config.azure_sql_password || process.env.AZURE_SQL_PASSWORD,
                    server: config.azure_sql_server || process.env.AZURE_SQL_SERVER,
                    database: config.azure_sql_database || process.env.AZURE_SQL_DATABASE,
                });

            case 'cosmos-db':
                throw new Error('Cosmos DB provider not yet implemented. Please use azure-sql or airtable.');

            case 'postgresql':
                throw new Error('PostgreSQL provider not yet implemented. Please use azure-sql or airtable.');

            case 'mongodb':
                throw new Error('MongoDB provider not yet implemented. Please use azure-sql or airtable.');

            default:
                throw new Error(`Unknown database provider: ${providerType}. Supported providers: airtable, azure-sql`);
        }
    }

    /**
     * Get the current provider based on environment configuration
     */
    static getCurrentProvider() {
        const providerType = process.env.DB_PROVIDER || 'airtable';
        return this.createProvider(providerType, {});
    }

    /**
     * Validate provider configuration
     */
    static validateConfig(providerType, config) {
        switch (providerType.toLowerCase()) {
            case 'airtable':
                const airtableRequired = ['airtable_api', 'personal_access_token', 'student_base', 'course_base', 'alfred_base'];
                const airtableMissing = airtableRequired.filter(key => !config[key] && !process.env[key]);
                if (airtableMissing.length > 0) {
                    throw new Error(`Missing Airtable configuration: ${airtableMissing.join(', ')}`);
                }
                return true;

            case 'azure-sql':
                const azureRequired = ['azure_sql_user', 'azure_sql_password', 'azure_sql_server', 'azure_sql_database'];
                const azureMissing = azureRequired.filter(key => !config[key] && !process.env[key.toUpperCase()]);
                if (azureMissing.length > 0) {
                    throw new Error(`Missing Azure SQL configuration: ${azureMissing.join(', ')}`);
                }
                return true;

            default:
                throw new Error(`Unknown provider type: ${providerType}`);
        }
    }

    /**
     * Get list of available providers
     */
    static getAvailableProviders() {
        return [
            { name: 'airtable', status: 'available', description: 'Airtable cloud database' },
            { name: 'azure-sql', status: 'available', description: 'Azure SQL Database' },
            { name: 'cosmos-db', status: 'planned', description: 'Azure Cosmos DB (not yet implemented)' },
            { name: 'postgresql', status: 'planned', description: 'PostgreSQL (not yet implemented)' },
            { name: 'mongodb', status: 'planned', description: 'MongoDB (not yet implemented)' }
        ];
    }
}

module.exports = ProviderFactory;
