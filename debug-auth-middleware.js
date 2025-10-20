const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg5MzIwOSwiZXhwIjoyMDc0NDY5MjA5fQ.giS313veFHErBnXpfafLS-c9loqVbeD6pggVHyYy7zY';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function debugAuthMiddleware() {
    const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6InFzclBaTkpEV0xaVmdZUDkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2h2cWNrb2FqeGhkcWF4ZmF3aXNkLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5MGY2MjU5Mi04ZjI0LTRhZjktYWNlMi01MjI1NTQyMGMyMTIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwNzAyMDg1LCJpYXQiOjE3NjA2OTg0ODUsImVtYWlsIjoidmluaWNpdXMubm92YXRvQGluc3RpdHV0b2FyZWx1bmEucHQiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MDY5ODQ4NX1dLCJzZXNzaW9uX2lkIjoiMDFkOTY0MmEtNDUzYi00YmYzLWE0M2QtNGFiOTAyZDMxNDBiIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.qzK2HS2MueOi08M1v7hX5lUW0d8j1nCs7rVyk-km7oM';

    console.log('1. Testing token verification...');
    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        
        if (error) {
            console.error('Token verification error:', error);
            return;
        }
        
        if (!user) {
            console.error('No user found from token');
            return;
        }
        
        console.log('✓ Token verified successfully');
        console.log('User ID:', user.id);
        console.log('User email:', user.email);
        
        console.log('\n2. Testing user profile lookup...');
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (profileError) {
            console.error('Profile lookup error:', profileError);
            
            // Try without is_active filter
            console.log('\n2a. Trying without is_active filter...');
            const { data: allProfiles, error: allProfilesError } = await supabaseAdmin
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.id);
                
            if (allProfilesError) {
                console.error('All profiles lookup error:', allProfilesError);
            } else {
                console.log('All profiles for user:', allProfiles);
            }
            return;
        }
        
        if (!userProfile) {
            console.error('No user profile found');
            return;
        }
        
        console.log('✓ User profile found');
        console.log('Profile:', userProfile);
        
        console.log('\n3. Testing user roles lookup...');
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
            .eq('user_id', user.id);

        if (rolesError) {
            console.error('Roles lookup error:', rolesError);
        } else {
            console.log('✓ User roles found');
            console.log('Roles:', JSON.stringify(userRoles, null, 2));
        }
        
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

debugAuthMiddleware();