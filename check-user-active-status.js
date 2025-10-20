const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserActiveStatus() {
    const userId = '90f62592-8f24-4af9-ace2-52255420c212';
    
    console.log('Checking user active status...');
    console.log('User ID:', userId);
    
    try {
        // Check user profile without is_active filter
        const { data: userProfileAll, error: profileErrorAll } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId);

        console.log('\n=== All user profiles for this user_id ===');
        console.log('Error:', profileErrorAll);
        console.log('Data:', userProfileAll);
        
        // Check user profile with is_active = true
        const { data: userProfileActive, error: profileErrorActive } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

        console.log('\n=== User profile with is_active = true ===');
        console.log('Error:', profileErrorActive);
        console.log('Data:', userProfileActive);
        
        // Check user profile with is_active = false
        const { data: userProfileInactive, error: profileErrorInactive } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', false)
            .single();

        console.log('\n=== User profile with is_active = false ===');
        console.log('Error:', profileErrorInactive);
        console.log('Data:', userProfileInactive);
        
    } catch (error) {
        console.error('Error checking user status:', error);
    }
}

checkUserActiveStatus();