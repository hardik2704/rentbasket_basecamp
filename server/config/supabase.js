const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

// Only initialize if Supabase credentials are configured
if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    console.log('✅ Supabase Storage configured');
} else {
    console.log('⚠️  Supabase not configured - using local file storage');
}

const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'project-files';

/**
 * Upload a file to Supabase Storage
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} fileName - Unique filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadFile(fileBuffer, fileName, mimeType) {
    if (!supabase) {
        throw new Error('Supabase is not configured');
    }

    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileBuffer, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    return {
        path: filePath,
        url: urlData.publicUrl
    };
}

/**
 * Get a signed URL for private file access
 * @param {string} filePath - Path to the file in storage
 * @param {number} expiresIn - Expiry time in seconds (default 1 hour)
 * @returns {Promise<string>}
 */
async function getSignedUrl(filePath, expiresIn = 3600) {
    if (!supabase) {
        throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

    if (error) {
        throw new Error(`Failed to get signed URL: ${error.message}`);
    }

    return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param {string} filePath - Path to the file
 * @returns {Promise<void>}
 */
async function deleteFile(filePath) {
    if (!supabase) {
        throw new Error('Supabase is not configured');
    }

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

    if (error) {
        throw new Error(`Delete failed: ${error.message}`);
    }
}

/**
 * Check if Supabase is configured
 * @returns {boolean}
 */
function isConfigured() {
    return supabase !== null;
}

module.exports = {
    supabase,
    uploadFile,
    getSignedUrl,
    deleteFile,
    isConfigured,
    BUCKET_NAME
};
