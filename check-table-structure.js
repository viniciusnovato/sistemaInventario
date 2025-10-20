const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg5MzIwOSwiZXhwIjoyMDc0NDY5MjA5fQ.giS313veFHErBnXpfafLS-c9loqVbeD6pggVHyYy7zY';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStructure() {
    try {
        console.log('Checking user_profiles table structure...');
        
        // Try to get a sample record to see the structure
        const { data: sample, error: sampleError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .limit(1);
        
        if (sampleError) {
            console.error('Error getting sample:', sampleError);
        } else if (sample && sample.length > 0) {
            console.log('Sample user_profiles record:');
            console.log(JSON.stringify(sample[0], null, 2));
            console.log('\nColumns found:', Object.keys(sample[0]));
        } else {
            console.log('No records found in user_profiles table');
        }
        
        // Also check what the current profile looks like
        console.log('\nChecking current user profile...');
        const { data: currentProfile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', '90f62592-8f24-4af9-ace2-52255420c212')
            .single();
        
        if (profileError) {
            console.error('Error getting current profile:', profileError);
        } else {
            console.log('Current profile:', JSON.stringify(currentProfile, null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkTableStructure();