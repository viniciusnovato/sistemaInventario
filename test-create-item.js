const fetch = require('node-fetch');

async function testCreateItem() {
    console.log('🧪 Testando criação de item...');
    
    // Token atual do navegador
    const authToken = 'eyJhbGciOiJIUzI1NiIsImtpZCI6InFzclBaTkpEV0xaVmdZUDkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2h2cWNrb2FqeGhkcWF4ZmF3aXNkLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5MGY2MjU5Mi04ZjI0LTRhZjktYWNlMi01MjI1NTQyMGMyMTIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYwNzE2MDM1LCJpYXQiOjE3NjA3MTI0MzUsImVtYWlsIjoidmluaWNpdXMubm92YXRvQGluc3RpdHV0b2FyZWx1bmEucHQiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MDY5ODQ4NX1dLCJzZXNzaW9uX2lkIjoiMDFkOTY0MmEtNDUzYi00YmYzLWE0M2QtNGFiOTAyZDMxNDBiIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.AWCckzH_ULWtLy1GPPmyMTKPPUFmkRirox5f8cZzW5Y';
    
    // Dados de teste simples
    const testData = {
        name: 'Item de Teste',
        description: 'Descrição do item de teste',
        company: 'Empresa Teste',
        categoria_id: 1, // ID de categoria válido
        colaborador_id: 1, // ID de colaborador válido
        location: 'Localização Teste',
        status: 'Ativo',
        brand: 'Marca Teste',
        model: 'Modelo Teste',
        value: '100'
    };
    
    try {
        console.log('📤 Enviando dados:', JSON.stringify(testData, null, 2));
        
        const response = await fetch('http://localhost:3002/api/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(testData)
        });
        
        console.log('📊 Status da resposta:', response.status);
        console.log('📋 Headers da resposta:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📄 Resposta completa:', responseText);
        
        if (!response.ok) {
            console.log('❌ Erro HTTP:', response.status, response.statusText);
            try {
                const errorData = JSON.parse(responseText);
                console.log('🔍 Dados do erro:', JSON.stringify(errorData, null, 2));
            } catch (e) {
                console.log('🔍 Resposta não é JSON válido');
            }
        } else {
            console.log('✅ Sucesso!');
            try {
                const successData = JSON.parse(responseText);
                console.log('🎉 Dados de sucesso:', JSON.stringify(successData, null, 2));
            } catch (e) {
                console.log('🎉 Resposta de sucesso (não JSON)');
            }
        }
        
    } catch (error) {
        console.error('💥 Erro na requisição:', error.message);
        console.error('📚 Stack trace:', error.stack);
    }
}

testCreateItem();
