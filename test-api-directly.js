const axios = require('axios');
require('dotenv').config();

async function testApiEndpoint() {
    const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6InFzclBaTkpEV0xaVmdZUDkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2h2cWNrb2FqeGhkcWF4ZmF3aXNkLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5MGY2MjU5Mi04ZjI0LTRhZjktYWNlMi01MjI1NTQyMGMyMTIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwNzAyMDg1LCJpYXQiOjE3NjA2OTg0ODUsImVtYWlsIjoidmluaWNpdXMubm92YXRvQGluc3RpdHV0b2FyZWx1bmEucHQiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MDY5ODQ4NX1dLCJzZXNzaW9uX2lkIjoiMDFkOTY0MmEtNDUzYi00YmYzLWE0M2QtNGFiOTAyZDMxNDBiIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.qzK2HS2MueOi08M1v7hX5lUW0d8j1nCs7rVyk-km7oM';

    console.log('Testing /api/auth/me endpoint...');
    
    try {
        const response = await axios.get('http://localhost:3002/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Status:', response.status);
        console.log('Response:', response.data);
        console.log('Test completed successfully');
    } catch (error) {
        console.error('Test error:');
        console.error('Status:', error.response?.status);
        console.error('Response:', error.response?.data);
        console.error('Message:', error.message);
    }
}

testApiEndpoint();