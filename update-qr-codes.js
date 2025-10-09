const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para gerar o link do item
function generateItemLink(itemId) {
    const port = process.env.PORT || 3002;
    return `http://localhost:${port}/view-item.html?id=${itemId}`;
}

// Função para gerar QR Code como Data URL
async function generateQRCodeDataURL(text) {
    try {
        const dataURL = await QRCode.toDataURL(text, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 256
        });
        return dataURL;
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        throw error;
    }
}

async function updateExistingQRCodes() {
    try {
        console.log('🔍 Buscando todos os itens com QR codes existentes...');
        
        // Buscar todos os itens que possuem QR codes
        const { data: items, error: fetchError } = await supabase
            .from('sistemainventario')
            .select('*')
            .not('module_data->qr_code', 'is', null);

        if (fetchError) {
            console.error('❌ Erro ao buscar itens:', fetchError);
            return;
        }

        console.log(`📋 Encontrados ${items.length} itens com QR codes para atualizar`);

        if (items.length === 0) {
            console.log('✅ Nenhum item com QR code encontrado para atualizar');
            return;
        }

        let updatedCount = 0;
        let errorCount = 0;

        // Processar cada item
        for (const item of items) {
            try {
                console.log(`\n🔄 Processando item: ${item.name} (ID: ${item.id})`);
                
                // Verificar se o module_data existe
                let moduleData = item.module_data;
                if (typeof moduleData === 'string') {
                    moduleData = JSON.parse(moduleData);
                }

                // Verificar se já tem o formato correto
                const expectedLink = generateItemLink(item.id);
                if (moduleData.qr_code === expectedLink) {
                    console.log(`   ✅ QR code já está atualizado`);
                    continue;
                }

                console.log(`   📱 QR code atual: ${moduleData.qr_code}`);
                console.log(`   🎯 Novo QR code: ${expectedLink}`);

                // Gerar novo QR code
                const newQRCodeImage = await generateQRCodeDataURL(expectedLink);

                // Atualizar module_data
                const updatedModuleData = {
                    ...moduleData,
                    qr_code: expectedLink,
                    qr_code_image: newQRCodeImage
                };

                // Atualizar no banco de dados
                const { error: updateError } = await supabase
                    .from('sistemainventario')
                    .update({ module_data: updatedModuleData })
                    .eq('id', item.id);

                if (updateError) {
                    console.error(`   ❌ Erro ao atualizar item ${item.name}:`, updateError);
                    errorCount++;
                } else {
                    console.log(`   ✅ Item atualizado com sucesso`);
                    updatedCount++;
                }

            } catch (itemError) {
                console.error(`   ❌ Erro ao processar item ${item.name}:`, itemError);
                errorCount++;
            }
        }

        console.log('\n📊 Resumo da atualização:');
        console.log(`   ✅ Itens atualizados: ${updatedCount}`);
        console.log(`   ❌ Erros: ${errorCount}`);
        console.log(`   📋 Total processado: ${items.length}`);

        if (updatedCount > 0) {
            console.log('\n🎉 Atualização concluída! Todos os QR codes agora apontam para os links específicos dos itens.');
        }

    } catch (error) {
        console.error('❌ Erro geral na atualização:', error);
    }
}

// Executar a atualização
console.log('🚀 Iniciando atualização dos QR codes existentes...');
updateExistingQRCodes();