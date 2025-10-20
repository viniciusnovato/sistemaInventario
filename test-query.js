const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://hvqckoajxhdqaxfawisd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg5MzIwOSwiZXhwIjoyMDc0NDY5MjA5fQ.giS313veFHErBnXpfafLS-c9loqVbeD6pggVHyYy7zY');

async function testMiddlewareQuery() {
  try {
    const userId = '90f62592-8f24-4af9-ace2-52255420c212';
    
    // Test the exact query from the middleware
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user_roles!inner(
          roles!inner(
            name,
            role_permissions!inner(
              permissions!inner(
                module_name,
                action
              )
            )
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (profileError) {
      console.log('User profile query error:', profileError);
      
      // Let's try a simpler query first
      const { data: simpleProfile, error: simpleError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (simpleError) {
        console.log('Simple profile query error:', simpleError);
      } else {
        console.log('Simple profile found:', simpleProfile);
        
        // Try to get user roles separately
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*, roles(*)')
          .eq('user_id', userId)
          .eq('is_active', true);
        
        if (rolesError) {
          console.log('User roles query error:', rolesError);
        } else {
          console.log('User roles:', userRoles);
        }
      }
      
    } else {
      console.log('User profile with permissions found successfully!');
      console.log('Profile:', JSON.stringify(userProfile, null, 2));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testMiddlewareQuery();