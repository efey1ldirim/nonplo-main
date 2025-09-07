import { adminClient } from "./middleware/auth";

export async function setupStorageBucket() {
  try {
    // Delete bucket if exists to recreate with proper settings
    await adminClient.storage.deleteBucket('support-files');
    
    // Create bucket as completely public
    const { data: bucketData, error: bucketError } = await adminClient.storage
      .createBucket('support-files', {
        public: true,
        allowedMimeTypes: ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        fileSizeLimit: 10485760 // 10MB
      });

    if (bucketError && bucketError.statusCode !== '409') {
      console.error('Error creating bucket:', bucketError);
    }

    // Create storage policies using Supabase SQL
    try {
      // Allow anonymous and authenticated users to insert objects
      const { data: insertPolicy, error: insertError } = await adminClient
        .from('storage.policies')
        .insert({
          name: 'Allow public upload to support-files',
          bucket_id: 'support-files',
          roles: '{anon,authenticated}',
          definition: 'true',
          command: 'INSERT'
        });



      // Allow anonymous and authenticated users to select objects
      const { data: selectPolicy, error: selectError } = await adminClient
        .from('storage.policies')
        .insert({
          name: 'Allow public read from support-files',
          bucket_id: 'support-files', 
          roles: '{anon,authenticated}',
          definition: 'true',
          command: 'SELECT'
        });



    } catch (policyError) {
      // Alternative: Use raw SQL to create policies
      try {
        await adminClient.rpc('exec_sql', {
          sql: `
            INSERT INTO storage.policies (name, bucket_id, roles, definition, command)
            VALUES 
              ('Allow public upload to support-files', 'support-files', ARRAY['anon', 'authenticated'], 'true', 'INSERT'),
              ('Allow public read from support-files', 'support-files', ARRAY['anon', 'authenticated'], 'true', 'SELECT')
            ON CONFLICT (bucket_id, name) DO NOTHING;
          `
        });
      } catch (sqlError) {
        // Ignore policy creation errors
      }
    }

  } catch (error) {
    console.error('Storage setup error:', error);
  }
}