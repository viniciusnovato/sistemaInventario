const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserRoles() {
    const userId = '90f62592-8f24-4af9-ace2-52255420c212';
    
    console.log('Checking user roles...');
    console.log('User ID:', userId);
    
    try {
        // Check all roles in the system
        const { data: allRoles, error: rolesError } = await supabaseAdmin
            .from('roles')
            .select('*');

        console.log('\n=== All roles in the system ===');
        console.log('Error:', rolesError);
        console.log('Data:', allRoles);
        
        // Check user roles for this user
        const { data: userRoles, error: userRolesError } = await supabaseAdmin
            .from('user_roles')
            .select('*')
            .eq('user_id', userId);

        console.log('\n=== User roles for this user ===');
        console.log('Error:', userRolesError);
        console.log('Data:', userRoles);
        
        // Check user roles with role details
        const { data: userRolesDetailed, error: userRolesDetailedError } = await supabaseAdmin
            .from('user_roles')
            .select(`
                *,
                roles(
                    *,
                    role_permissions(
                        permissions(
                            module_name,
                            action,
                            name
                        )
                    )
                )
            `)
            .eq('user_id', userId);

        console.log('\n=== User roles with details ===');
        console.log('Error:', userRolesDetailedError);
        console.log('Data:', JSON.stringify(userRolesDetailed, null, 2));
        
    } catch (error) {
        console.error('Error checking user roles:', error);
    }
}

checkUserRoles();