const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for database operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
}

// Create Supabase client with service role for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('✅ Supabase Database client initialized');

/**
 * Helper to handle Supabase errors consistently
 */
function handleError(error, operation) {
    if (error) {
        console.error(`Supabase ${operation} error:`, error);
        throw new Error(error.message || `Database ${operation} failed`);
    }
}

/**
 * Check database connection by making a simple query
 */
async function checkConnection() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
            throw error;
        }
        console.log('✅ Supabase Database connection verified');
        return true;
    } catch (error) {
        console.error('❌ Supabase Database connection failed:', error.message);
        return false;
    }
}

module.exports = {
    supabase,
    handleError,
    checkConnection
};
