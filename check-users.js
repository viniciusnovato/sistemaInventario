const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg5MzIwOSwiZXhwIjoyMDc0NDY5MjA5fQ.giS313veFHErBnXpfafLS-c9loqVbeD6pggVHyYy7zY';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
    try {
        console.log('Checking users in auth.users...');
        
        // Check auth.users table
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authError) {
            console.error('Error fetching auth users:', authError);
        } else {
            console.log('Auth users found:', authUsers.users.length);
            authUsers.users.forEach(user => {
                console.log(`- ID: ${user.id}, Email: ${user.email}, Created: ${user.created_at}`);
            });
        }

        console.log('\nChecking user_profiles table...');
        
        // Check user_profiles table
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('*');
        
        if (profileError) {
            console.error('Error fetching user profiles:', profileError);
        } else {
            console.log('User profiles found:', profiles.length);
            profiles.forEach(profile => {
                console.log(`- User ID: ${profile.user_id}, Email: ${profile.email}, Active: ${profile.is_active}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();