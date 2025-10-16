const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para ler e parsear o CSV
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(';');
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';');
        const item = {};
        headers.forEach((header, index) => {
            item[header.trim()] = values[index] ? values[index].trim() : '';
        });
        data.push(item);
    }
    
    return data;
}

// Função para converter valor monetário
function parseValue(valueStr) {
    if (!valueStr || valueStr === '') return null;
    // Remove "€" e espaços, converte vírgula para ponto
    const cleanValue = valueStr.replace(/€\s*/g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? null : parsed;
}

// Função para converter data
function parseDate(dateStr) {
    if (!dateStr || dateStr === '') return null;
    // Formato esperado: DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
}

// Função para buscar ou criar categoria
async function getOrCreateCategory(categoryName) {
    if (!categoryName || categoryName === '') return null;
    
    // Buscar categoria existente
    const { data: existing } = await supabase
        .from('categoriassistemainventario')
        .select('id')
        .eq('nome', categoryName)
        .single();
    
    if (existing) {
        return existing.id;
    }
    
    // Criar nova categoria
    const { data: newCategory, error } = await supabase
        .from('categoriassistemainventario')
        .insert([{ nome: categoryName }])
        .select('id')
        .single();
    
    if (error) {
        console.error('Erro ao criar categoria:', error);
        return null;
    }
    
    console.log(`✅ Nova categoria criada: ${categoryName}`);
    return newCategory.id;
}

// Função para buscar ou criar colaborador
async function getOrCreateCollaborator(collaboratorName) {
    if (!collaboratorName || collaboratorName === '') return null;
    
    // Buscar colaborador existente
    const { data: existing } = await supabase
        .from('colaboradoressistemainventario')
        .select('id')
        .eq('nome', collaboratorName)
        .single();
    
    if (existing) {
        return existing.id;
    }
    
    // Criar novo colaborador
    const { data: newCollaborator, error } = await supabase
        .from('colaboradoressistemainventario')
        .insert([{ nome: collaboratorName }])
        .select('id')
        .single();
    
    if (error) {
        console.error('Erro ao criar colaborador:', error);
        return null;
    }
    
    console.log(`✅ Novo colaborador criado: ${collaboratorName}`);
    return newCollaborator.id;
}

// Função para verificar se item já existe
async function checkItemExists(item) {
    const serialNumber = item['Número de Série'];
    const name = item['Nome'];
    const brand = item['Marca'];
    const model = item['Modelo'];
    const description = item['Descrição'];
    
    // 1. Verificar por número de série (mais confiável)
    if (serialNumber && serialNumber !== '') {
        const { data } = await supabase
            .from('sistemainventario')
            .select('id, name')
            .eq('module_type', 'inventory')
            .eq('module_data->>serial_number', serialNumber);
        
        if (data && data.length > 0) {
            return { exists: true, reason: 'serial_number', existing: data[0] };
        }
    }
    
    // 2. Verificar por nome + marca + modelo
    if (name && brand && model) {
        const { data } = await supabase
            .from('sistemainventario')
            .select('id, name, module_data')
            .eq('module_type', 'inventory')
            .eq('module_data->>name', name)
            .eq('module_data->>brand', brand)
            .eq('module_data->>model', model);
        
        if (data && data.length > 0) {
            return { exists: true, reason: 'name_brand_model', existing: data[0] };
        }
    }
    
    // 3. Verificar por nome + descrição (fallback)
    if (name && description) {
        const { data } = await supabase
            .from('sistemainventario')
            .select('id, name, module_data')
            .eq('module_type', 'inventory')
            .eq('module_data->>name', name)
            .eq('module_data->>description', description);
        
        if (data && data.length > 0) {
            return { exists: true, reason: 'name_description', existing: data[0] };
        }
    }
    
    return { exists: false };
}

// Função principal de importação
async function importCSV() {
    console.log('🚀 Iniciando importação do CSV...');
    
    const csvPath = path.join(__dirname, 'inventario_amazon_importacao.csv');
    const items = parseCSV(csvPath);
    
    console.log(`📊 Total de itens no CSV: ${items.length}`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemName = item['Nome'];
        
        console.log(`\n[${i + 1}/${items.length}] Processando: ${itemName}`);
        
        try {
            // Comentado: Verificação de duplicatas desabilitada para permitir múltiplas unidades
            // const existsCheck = await checkItemExists(item);
            // 
            // if (existsCheck.exists) {
            //     console.log(`⚠️  Item já existe (${existsCheck.reason}): ${existsCheck.existing.name}`);
            //     skipped++;
            //     continue;
            // }
            
            // Buscar/criar categoria e colaborador
            const categoryId = await getOrCreateCategory(item['Categoria']);
            const collaboratorId = await getOrCreateCollaborator(item['Colaborador']);
            
            // Preparar dados para inserção
            const itemData = {
                name: itemName,
                description: item['Descrição'] || null,
                categoria_id: categoryId,
                colaborador_id: collaboratorId,
                location: item['Localização'] || null,
                status: item['Status'] || 'Ativo',
                module_type: 'inventory',
                data_type: 'item',
                pdfs: [], // Array vazio para PDFs
                module_data: {
                    name: itemName,
                    description: item['Descrição'] || null,
                    company: item['Empresa'] || null,
                    value: parseValue(item['Valor (€)']),
                    brand: item['Marca'] || null,
                    model: item['Modelo'] || null,
                    serial_number: item['Número de Série'] || null,
                    purchase_date: parseDate(item['Data de Compra']),
                    warranty_date: parseDate(item['Data de Garantia']),
                    status: item['Status'] || 'Ativo',
                    location: item['Localização'] || null,
                    image: null,
                    pdf: null
                },
                metadata: {
                    created_by: 'csv_import',
                    source: 'amazon_import',
                    import_date: new Date().toISOString()
                }
            };
            
            // Inserir no banco de dados
            const { data: insertedItem, error } = await supabase
                .from('sistemainventario')
                .insert([itemData])
                .select()
                .single();
            
            if (error) {
                console.error(`❌ Erro ao inserir item: ${error.message}`);
                errors++;
                continue;
            }
            
            console.log(`✅ Item importado com sucesso: ${insertedItem.name}`);
            imported++;
            
        } catch (err) {
            console.error(`❌ Erro inesperado ao processar item: ${err.message}`);
            errors++;
        }
    }
    
    // Relatório final
    console.log('\n' + '='.repeat(50));
    console.log('📈 RELATÓRIO DE IMPORTAÇÃO');
    console.log('='.repeat(50));
    console.log(`📊 Total de itens processados: ${items.length}`);
    console.log(`✅ Itens importados: ${imported}`);
    console.log(`⚠️  Itens ignorados (duplicatas): ${skipped}`);
    console.log(`❌ Erros: ${errors}`);
    console.log('='.repeat(50));
    
    if (imported > 0) {
        console.log('\n🎉 Importação concluída com sucesso!');
    }
}

// Executar importação
if (require.main === module) {
    importCSV().catch(console.error);
}

module.exports = { importCSV, parseCSV, checkItemExists };