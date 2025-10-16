const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

// Configuração do Supabase
const supabaseUrl = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg5MzIwOSwiZXhwIjoyMDc0NDY5MjA5fQ.giS313veFHErBnXpfafLS-c9loqVbeD6pggVHyYy7zY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para converter valor em euros para número
function parseEuroValue(euroString) {
    if (!euroString || euroString === '') return null;
    
    // Remove "€" e espaços, substitui vírgula por ponto
    const cleanValue = euroString.replace(/€\s*/g, '').replace(',', '.');
    const numValue = parseFloat(cleanValue);
    
    return isNaN(numValue) ? null : numValue;
}

// Função para converter data DD/MM/YYYY para YYYY-MM-DD
function convertDate(dateString) {
    if (!dateString || dateString === '') return null;
    
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Função para verificar se item já existe por número de série
async function checkItemExists(serialNumber) {
    if (!serialNumber || serialNumber === '') return { exists: false };
    
    try {
        const { data, error } = await supabase
            .from('sistemainventario')
            .select('id, name, module_data')
            .eq('module_data->>serial_number', serialNumber);
        
        if (error) throw error;
        
        return { exists: data.length > 0, reason: 'serial_number', existing: data[0] };
    } catch (error) {
        console.error('Erro ao verificar item existente:', error);
        return { exists: false };
    }
}

// Função para gerar QR Code
async function generateQRCode(itemId) {
    try {
        const qrUrl = `https://erp.institutoareluna.pt/view-item.html?id=${itemId}`;
        const qrCodeImage = await QRCode.toDataURL(qrUrl);
        return {
            qr_code: qrUrl,
            qr_code_image: qrCodeImage
        };
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        return {
            qr_code: null,
            qr_code_image: null
        };
    }
}

// Função para processar um item do CSV
async function processItem(item, index) {
    try {
        console.log(`\nProcessando item ${index + 1}: ${item.Nome}`);
        
        // Verificar se já existe por número de série
        const existsCheck = await checkItemExists(item['Número de Série']);
        if (existsCheck.exists) {
            console.log(`⚠️  Item já existe (${existsCheck.reason}): ${existsCheck.existing.name}`);
            return { success: false, reason: 'duplicate', existing: existsCheck.existing };
        }
        
        // Gerar ID único
        const itemId = uuidv4();
        
        // Gerar QR Code
        const qrData = await generateQRCode(itemId);
        
        // Preparar dados do item
        const moduleData = {
            name: item.Nome,
            brand: item.Marca || null,
            model: item.Modelo || null,
            value: parseEuroValue(item['Valor (€)']),
            status: item.Status || 'Ativo',
            company: item.Empresa || 'ProStoral',
            category: item.Categoria || null,
            location: item.Localização || null,
            description: item.Descrição || null,
            purchase_date: convertDate(item['Data de Compra']),
            serial_number: item['Número de Série'] || null,
            warranty_date: convertDate(item['Data de Garantia']),
            qr_code: qrData.qr_code,
            qr_code_image: qrData.qr_code_image
        };
        
        // Inserir no banco
        const { data, error } = await supabase
            .from('sistemainventario')
            .insert({
                id: itemId,
                name: item.Nome,
                description: item.Descrição || null,
                category: item.Categoria || null,
                quantity: '0',
                unit_price: null,
                total_value: null,
                location: item.Localização || null,
                supplier: null,
                barcode: null,
                qr_code: null,
                status: item.Status || 'Ativo',
                minimum_stock: '0',
                maximum_stock: null,
                reorder_point: null,
                module_type: 'inventory',
                data_type: 'item',
                module_data: moduleData,
                metadata: { source: 'csv_import', created_by: 'system' },
                tenant_id: null,
                company_id: null,
                created_by: null,
                categoria_id: '2d83fbe8-dc8a-429b-b597-91c81b26b4d6', // ID da categoria padrão
                colaborador_id: null,
                pdf_path: null,
                pdfs: '[]'
            });
        
        if (error) throw error;
        
        console.log(`✅ Item importado com sucesso: ${item.Nome}`);
        return { success: true, data: data };
        
    } catch (error) {
        console.error(`❌ Erro ao processar item ${item.Nome}:`, error);
        return { success: false, error: error.message };
    }
}

// Função principal
async function importCSV() {
    try {
        console.log('🚀 Iniciando importação do CSV da Amazon...\n');
        
        // Ler arquivo CSV
        const csvContent = fs.readFileSync('/Users/insitutoareluna/Documents/sistemaInventario/inventario_amazon_importacao.csv', 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
            throw new Error('Arquivo CSV vazio');
        }
        
        // Processar cabeçalho
        const headers = lines[0].split(';');
        console.log('📋 Cabeçalhos encontrados:', headers);
        
        // Processar dados
        const items = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(';');
            const item = {};
            
            headers.forEach((header, index) => {
                item[header] = values[index] || '';
            });
            
            items.push(item);
        }
        
        console.log(`📊 Total de itens para importar: ${items.length}\n`);
        
        // Processar cada item
        const results = {
            success: 0,
            duplicates: 0,
            errors: 0,
            details: []
        };
        
        for (let i = 0; i < items.length; i++) {
            const result = await processItem(items[i], i);
            
            if (result.success) {
                results.success++;
            } else if (result.reason === 'duplicate') {
                results.duplicates++;
            } else {
                results.errors++;
            }
            
            results.details.push({
                item: items[i].Nome,
                result: result
            });
            
            // Pequena pausa para não sobrecarregar o servidor
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Relatório final
        console.log('\n📈 RELATÓRIO FINAL:');
        console.log(`✅ Itens importados com sucesso: ${results.success}`);
        console.log(`⚠️  Itens duplicados (ignorados): ${results.duplicates}`);
        console.log(`❌ Itens com erro: ${results.errors}`);
        console.log(`📊 Total processado: ${items.length}`);
        
        if (results.errors > 0) {
            console.log('\n❌ ITENS COM ERRO:');
            results.details
                .filter(d => d.result.error)
                .forEach(d => {
                    console.log(`- ${d.item}: ${d.result.error}`);
                });
        }
        
        if (results.duplicates > 0) {
            console.log('\n⚠️  ITENS DUPLICADOS:');
            results.details
                .filter(d => d.result.reason === 'duplicate')
                .forEach(d => {
                    console.log(`- ${d.item} (já existe: ${d.result.existing.name})`);
                });
        }
        
        console.log('\n🎉 Importação concluída!');
        
    } catch (error) {
        console.error('💥 Erro na importação:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    importCSV();
}

module.exports = { importCSV, processItem, checkItemExists };