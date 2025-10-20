require('dotenv').config();
const { authenticateToken } = require('./api/middleware/auth');

// Mock request and response objects
const mockReq = {
    headers: {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6InFzclBaTkpEV0xaVmdZUDkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2h2cWNrb2FqeGhkcWF4ZmF3aXNkLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5MGY2MjU5Mi04ZjI0LTRhZjktYWNlMi01MjI1NTQyMGMyMTIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwNzAyMDg1LCJpYXQiOjE3NjA2OTg0ODUsImVtYWlsIjoidmluaWNpdXMubm92YXRvQGluc3RpdHV0b2FyZWx1bmEucHQiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MDY5ODQ4NX1dLCJzZXNzaW9uX2lkIjoiMDFkOTY0MmEtNDUzYi00YmYzLWE0M2QtNGFiOTAyZDMxNDBiIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.qzK2HS2MueOi08M1v7hX5lUW0d8j1nCs7rVyk-km7oM'
    }
};

const mockRes = {
    status: function(code) {
        console.log('Response status:', code);
        return this;
    },
    json: function(data) {
        console.log('Response data:', data);
        return this;
    }
};

const mockNext = function() {
    console.log('✓ Middleware passed successfully');
    console.log('User data attached to request:', mockReq.user);
};

console.log('Environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

console.log('\nTesting middleware...');
authenticateToken(mockReq, mockRes, mockNext);