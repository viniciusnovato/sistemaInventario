const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabaseUrl = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTMyMDksImV4cCI6MjA3NDQ2OTIwOX0.r260qHrvkLMHG60Pbld2zyjwXBY3B94Edk51YDpLXM4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthEndpoint() {
    try {
        console.log('Testing /api/auth/me endpoint...');
        
        // First, let's sign in to get a valid session
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'vinicius.novato@institutoareluna.pt',
            password: 'Vinicius123!'
        });

        if (authError) {
            console.error('Auth error:', authError);
            return;
        }

        console.log('Authentication successful');
        console.log('User ID:', authData.user.id);
        console.log('Access Token:', authData.session.access_token.substring(0, 50) + '...');

        // Now test the /api/auth/me endpoint
        const response = await fetch('http://localhost:3002/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authData.session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('Response body:', responseText);

        if (response.ok) {
            const data = JSON.parse(responseText);
            console.log('Success! User data:', JSON.stringify(data, null, 2));
        } else {
            console.log('Error response:', responseText);
        }

    } catch (error) {
        console.error('Test error:', error);
    }
}

testAuthEndpoint();