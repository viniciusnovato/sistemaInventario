const fetch = require('node-fetch');

async function testQRCodeGeneration() {
    try {
        console.log('🧪 Testando criação de item com QR code...');
        
        // Criar um novo item de teste
        const testItem = {
            name: 'Teste QR Code Link - ' + Date.now(),
            description: 'Item de teste para verificar se o QR code gera o link correto',
            category: 'Teste',
            location: 'Laboratório',
            status: 'Ativo',
            company: 'AreLuna',
            value: 100.00
        };
        
        const response = await fetch('http://localhost:3002/api/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testItem)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Item criado com sucesso!');
        console.log('📋 ID do item:', result.data.id);
        console.log('📱 Nome do item:', result.data.name);
        
        // Verificar se o QR code foi gerado
        if (result.data.module_data && result.data.module_data.qr_code) {
            console.log('🎯 QR Code gerado:', result.data.module_data.qr_code);
            
            // Verificar se é um link válido para o item
            const expectedLink = `https://erp.institutoareluna.pt/view-item.html?id=${result.data.id}`;
            if (result.data.module_data.qr_code === expectedLink) {
                console.log('✅ QR Code está correto! Contém o link para o item específico.');
            } else {
                console.log('❌ QR Code incorreto!');
                console.log('   Esperado:', expectedLink);
                console.log('   Recebido:', result.data.module_data.qr_code);
            }
            
            // Verificar se a imagem do QR code foi gerada
            if (result.data.module_data.qr_code_image) {
                console.log('🖼️ Imagem do QR Code gerada (tamanho:', result.data.module_data.qr_code_image.length, 'caracteres)');
            } else {
                console.log('❌ Imagem do QR Code não foi gerada');
            }
        } else {
            console.log('❌ QR Code não foi gerado para o item');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

testQRCodeGeneration();