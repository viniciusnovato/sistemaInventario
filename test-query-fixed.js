const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://hvqckoajxhdqaxfawisd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg5MzIwOSwiZXhwIjoyMDc0NDY5MjA5fQ.giS313veFHErBnXpfafLS-c9loqVbeD6pggVHyYy7zY');

async function fixUserRoleAndTest() {
  try {
    const userId = '90f62592-8f24-4af9-ace2-52255420c212';
    const correctTenantId = '00000000-0000-0000-0000-000000000002'; // Instituto AreLuna tenant ID
    
    // First, let's fix the user role tenant_id mismatch
    console.log('Fixing user role tenant_id...');
    const { data: updateResult, error: updateError } = await supabase
      .from('user_roles')
      .update({ tenant_id: correctTenantId })
      .eq('user_id', userId)
      .neq('tenant_id', correctTenantId);
    
    if (updateError) {
      console.log('Error updating user roles:', updateError);
    } else {
      console.log('User roles updated successfully');
    }
    
    // Now test the middleware query
    console.log('Testing middleware query...');
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
      
      // Let's try step by step to see where it fails
      console.log('Testing step by step...');
      
      // Step 1: Basic profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      console.log('Profile found:', !!profile);
      
      // Step 2: Profile with roles
      const { data: profileWithRoles, error: rolesError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_roles!inner(
            roles!inner(name)
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (rolesError) {
        console.log('Profile with roles error:', rolesError);
      } else {
        console.log('Profile with roles found:', !!profileWithRoles);
      }
      
      // Step 3: Check role permissions
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('*, permissions(*)')
        .eq('role_id', '82dcc1fb-6273-4534-95ce-f6e6463bacda');
      console.log('Role permissions:', rolePerms?.length || 0);
      
    } else {
      console.log('SUCCESS! User profile with permissions found!');
      console.log('User has access to modules:', 
        userProfile.user_roles.flatMap(ur => 
          ur.roles.role_permissions.map(rp => rp.permissions.module_name)
        ).filter((v, i, a) => a.indexOf(v) === i)
      );
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

fixUserRoleAndTest();