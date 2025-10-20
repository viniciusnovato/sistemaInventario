const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabaseUrl = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg5MzIwOSwiZXhwIjoyMDc0NDY5MjA5fQ.giS313veFHErBnXpfafLS-c9loqVbeD6pggVHyYy7zY';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testWithSession() {
    try {
        const userId = '90f62592-8f24-4af9-ace2-52255420c212';
        
        console.log('Creating session for user:', userId);
        
        // Create a session for the user using admin client
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: 'vinicius.novato@institutoareluna.pt'
        });

        if (sessionError) {
            console.error('Error generating session:', sessionError);
            
            // Alternative: try to create a JWT token manually
            console.log('Trying alternative approach with JWT...');
            
            // Create a JWT token for the user
            const jwt = require('jsonwebtoken');
            const payload = {
                aud: 'authenticated',
                exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
                sub: userId,
                email: 'vinicius.novato@institutoareluna.pt',
                role: 'authenticated'
            };
            
            // We need the JWT secret from Supabase - let's try with a simulated token
            console.log('Testing with user ID directly in middleware...');
            
            // Test the middleware logic directly
            const response = await fetch('http://localhost:3002/api/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Response status:', response.status);
            const responseText = await response.text();
            console.log('Response body:', responseText);
            
            return;
        }

        console.log('Session created successfully');
        console.log('Action link:', sessionData.properties.action_link);

        // Extract token from the action link if available
        const actionLink = sessionData.properties.action_link;
        const urlParams = new URL(actionLink).searchParams;
        const accessToken = urlParams.get('access_token');
        
        if (accessToken) {
            console.log('Access token found:', accessToken.substring(0, 50) + '...');
            
            // Test the endpoint with the access token
            const response = await fetch('http://localhost:3002/api/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Response status:', response.status);
            const responseText = await response.text();
            console.log('Response body:', responseText);
        } else {
            console.log('No access token found in action link');
        }

    } catch (error) {
        console.error('Test error:', error);
    }
}

testWithSession();