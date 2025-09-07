import { createClient } from '@supabase/supabase-js';

// Alternative approach: Use service role to upload files on behalf of users
export async function uploadFileAsService(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<{ url?: string; error?: any }> {
  try {
    const serviceClient = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const filePath = `support-attachments/${fileName}`;
    
    console.log('📤 Uploading file via service role:', filePath);
    console.log('📋 File details:', { fileName, size: fileBuffer.length, mimeType });
    
    const { data, error } = await serviceClient.storage
      .from('support-files')
      .upload(filePath, fileBuffer, {
        contentType: mimeType
      });

    if (error) {
      console.error('❌ Service upload error:', error);
      return { error };
    }

    // Get public URL
    const { data: urlData } = serviceClient.storage
      .from('support-files')
      .getPublicUrl(filePath);

    console.log('✅ File uploaded successfully:', urlData.publicUrl);
    return { url: urlData.publicUrl };

  } catch (error) {
    console.error('❌ Service upload exception:', error);
    return { error };
  }
}