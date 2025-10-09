const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTMyMDksImV4cCI6MjA3NDQ2OTIwOX0.r260qHrvkLMHG60Pbld2zyjwXBY3B94Edk51YDpLXM4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function saveQRCodeImage() {
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
        
        // Salvar a imagem QR code
        const qrCodeImage = data.module_data?.qr_code_image;
        if (!qrCodeImage) {
            console.log('❌ Nenhuma imagem QR code encontrada');
            return;
        }
        
        // Converter base64 para buffer e salvar
        const base64Data = qrCodeImage.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const filename = 'qr-code-atual.png';
        fs.writeFileSync(filename, buffer);
        
        console.log('');
        console.log('✅ Imagem QR code salva como:', filename);
        console.log('📱 Você pode escanear esta imagem com seu celular para verificar o conteúdo');
        console.log('🎯 O conteúdo esperado é:', data.module_data?.qr_code);
        
    } catch (error) {
        console.error('❌ Erro geral:', error);
    }
}

// Executar
console.log('🚀 Salvando imagem do QR code...');
saveQRCodeImage();