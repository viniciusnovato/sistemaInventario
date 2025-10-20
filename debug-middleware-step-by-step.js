const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function debugMiddleware() {
    const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6InFzclBaTkpEV0xaVmdZUDkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2h2cWNrb2FqeGhkcWF4ZmF3aXNkLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5MGY2MjU5Mi04ZjI0LTRhZjktYWNlMi01MjI1NTQyMGMyMTIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwNzAyMDg1LCJpYXQiOjE3NjA2OTg0ODUsImVtYWlsIjoidmluaWNpdXMubm92YXRvQGluc3RpdHV0b2FyZWx1bmEucHQiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MDY5ODQ4NX1dLCJzZXNzaW9uX2lkIjoiMDFkOTY0MmEtNDUzYi00YmYzLWE0M2QtNGFiOTAyZDMxNDBiIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.qzK2HS2MueOi08M1v7hX5lUW0d8j1nCs7rVyk-km7oM';
    
    console.log('=== DEBUGGING MIDDLEWARE STEP BY STEP ===');
    console.log('Token:', token.substring(0, 50) + '...');
    
    try {
        // Step 1: Verify token
        console.log('\n1. Verifying token with Supabase...');
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        
        if (error || !user) {
            console.log('❌ Token verification failed');
            console.log('Error:', error);
            console.log('User:', user);
            return;
        }
        
        console.log('✅ Token verified successfully');
        console.log('User ID:', user.id);
        console.log('User email:', user.email);
        
        // Step 2: Look up user profile
        console.log('\n2. Looking up user profile...');
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        console.log('Profile query result:');
        console.log('Error:', profileError);
        console.log('Data:', userProfile);
        
        if (profileError || !userProfile) {
            console.log('❌ User profile lookup failed');
            console.log('This is where the middleware returns "Usuário não encontrado ou inativo"');
            
            // Let's try without the is_active filter
            console.log('\n2b. Trying without is_active filter...');
            const { data: userProfileAny, error: profileErrorAny } = await supabaseAdmin
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();
                
            console.log('Profile query (any active status):');
            console.log('Error:', profileErrorAny);
            console.log('Data:', userProfileAny);
            
            return;
        }
        
        console.log('✅ User profile found');
        
        // Step 3: Look up user roles
        console.log('\n3. Looking up user roles...');
        const { data: userRoles, error: rolesError } = await supabaseAdmin
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
            .eq('user_id', user.id)
            .eq('is_active', true);

        console.log('Roles query result:');
        console.log('Error:', rolesError);
        console.log('Roles count:', userRoles?.length || 0);
        
        if (rolesError) {
            console.log('❌ User roles lookup failed');
            return;
        }
        
        console.log('✅ User roles found');
        
        // Step 4: Process permissions
        console.log('\n4. Processing permissions...');
        const userPermissions = new Set();
        const roleNames = [];

        userRoles.forEach(userRole => {
            const role = userRole.roles;
            roleNames.push(role.name);
            
            role.role_permissions.forEach(rolePermission => {
                const permission = rolePermission.permissions;
                userPermissions.add(`${permission.module_name}:${permission.action}`);
            });
        });
        
        console.log('Role names:', roleNames);
        console.log('Permissions:', Array.from(userPermissions));
        
        console.log('\n✅ Middleware should succeed with this data');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

debugMiddleware();