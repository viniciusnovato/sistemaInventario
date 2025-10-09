const { createClient } = require('@supabase/supabase-js');
const Jimp = require('jimp');
const QrCode = require('qrcode-reader');

const supabaseUrl = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTMyMDksImV4cCI6MjA3NDQ2OTIwOX0.r260qHrvkLMHG60Pbld2zyjwXBY3B94Edk51YDpLXM4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function decodeQRCode() {
    try {
        console.log('🔍 Buscando item...');
        
        // Buscar o item
        const { data, error } = await supabase
            .from('sistemainventario')
            .select('*')
            .eq('id', '4f68f4cc-9646-4e8a-94dd-dde1d22e4db3')
            .single();
        
        if (error) {
            console.error('❌ Erro ao buscar item:', error);
            return;
        }
        
        console.log('📋 Item encontrado:', data.name);
        console.log('🎯 QR Code Text esperado:', data.module_data?.qr_code);
        
        // Decodificar a imagem QR code
        const qrCodeImage = data.module_data?.qr_code_image;
        if (!qrCodeImage) {
            console.log('❌ Nenhuma imagem QR code encontrada');
            return;
        }
        
        // Converter base64 para buffer
        const base64Data = qrCodeImage.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Usar jimp para ler a imagem
        const image = await Jimp.read(buffer);
        
        // Criar um QR code reader
        const qr = new QrCode();
        
        return new Promise((resolve, reject) => {
            qr.callback = function(err, value) {
                if (err) {
                    console.error('❌ Erro ao decodificar QR code:', err);
                    reject(err);
                    return;
                }
                
                console.log('');
                console.log('=== RESULTADO DA DECODIFICAÇÃO ===');
                console.log('📱 Conteúdo real do QR code:', value.result);
                console.log('🎯 Conteúdo esperado:', data.module_data?.qr_code);
                console.log('✅ Conteúdos são iguais?', value.result === data.module_data?.qr_code ? 'SIM' : 'NÃO');
                
                if (value.result !== data.module_data?.qr_code) {
                    console.log('');
                    console.log('⚠️  PROBLEMA IDENTIFICADO:');
                    console.log('   O QR code ainda contém o link antigo!');
                    console.log('   É necessário regenerar a imagem do QR code.');
                }
                
                resolve(value.result);
            };
            
            // Decodificar o QR code
            qr.decode(image.bitmap);
        });
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
    }
}

// Executar a decodificação
console.log('🚀 Iniciando decodificação do QR code...');
decodeQRCode();