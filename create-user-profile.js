const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg5MzIwOSwiZXhwIjoyMDc0NDY5MjA5fQ.giS313veFHErBnXpfafLS-c9loqVbeD6pggVHyYy7zY';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function createUserProfile() {
    try {
        const userId = '90f62592-8f24-4af9-ace2-52255420c212';
        const tenantId = '00000000-0000-0000-0000-000000000002';
        
        console.log('Checking if user profile already exists...');
        
        const { data: existingProfile, error: checkError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (existingProfile) {
            console.log('User profile already exists:', existingProfile);
            
            // Update the profile to ensure it has all necessary fields
            const { data: updatedProfile, error: updateError } = await supabaseAdmin
                .from('user_profiles')
                .update({
                    email: 'vinicius.novato@institutoareluna.pt',
                    full_name: 'Vinicius Novato',
                    is_active: true,
                    tenant_id: tenantId
                })
                .eq('user_id', userId)
                .select()
                .single();
            
            if (updateError) {
                console.error('Error updating user profile:', updateError);
            } else {
                console.log('User profile updated:', updatedProfile);
            }
        } else {
            console.log('Creating new user profile...');
            
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('user_profiles')
                .insert({
                    user_id: userId,
                    email: 'vinicius.novato@institutoareluna.pt',
                    full_name: 'Vinicius Novato',
                    is_active: true,
                    tenant_id: tenantId
                })
                .select()
                .single();
            
            if (createError) {
                console.error('Error creating user profile:', createError);
            } else {
                console.log('User profile created:', newProfile);
            }
        }
        
        // Check user roles
        console.log('\nChecking user roles...');
        const { data: userRoles, error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .select('*, roles(*)')
            .eq('user_id', userId);
        
        if (rolesError) {
            console.error('Error fetching user roles:', rolesError);
        } else {
            console.log('User roles:', userRoles);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

createUserProfile();