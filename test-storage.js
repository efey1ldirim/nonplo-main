// Test Supabase storage upload
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'SET' : 'NOT SET');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  try {
    // Create a test file
    const testContent = 'This is a test file for support uploads';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    console.log('Testing upload to support-files bucket...');
    
    const { data, error } = await supabase.storage
      .from('support-files')
      .upload(`test/test-${Date.now()}.txt`, testFile);
      
    if (error) {
      console.error('Upload error:', error);
    } else {
      console.log('Upload success:', data);
    }
    
    // List bucket contents
    const { data: listData, error: listError } = await supabase.storage
      .from('support-files')
      .list();
      
    if (listError) {
      console.error('List error:', listError);
    } else {
      console.log('Bucket contents:', listData);
    }
    
  } catch (err) {
    console.error('Test error:', err);
  }
}

testUpload();