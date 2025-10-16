const { parseCSV, checkItemExists } = require('./import-csv');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para validar dados de um item
function validateItem(item) {
    const errors = [];
    const warnings = [];
    
    // Validações obrigatórias
    if (!item['Nome'] || item['Nome'].trim() === '') {
        errors.push('Nome é obrigatório');
    }
    
    // Validações de formato
    if (item['Valor (€)']) {
        const value = item['Valor (€)'].replace(/€\s*/g, '').replace(',', '.');
        if (isNaN(parseFloat(value))) {
            errors.push(`Valor inválido: ${item['Valor (€)']}`);
        }
    }
    
    // Validações de data
    const dateFields = ['Data de Compra', 'Data de Garantia', 'Data de Criação', 'Última Atualização'];
    dateFields.forEach(field => {
        if (item[field] && item[field] !== '') {
            const parts = item[field].split('/');
            if (parts.length !== 3) {
                errors.push(`Formato de data inválido em ${field}: ${item[field]} (esperado DD/MM/YYYY)`);
            } else {
                const [day, month, year] = parts;
                const date = new Date(year, month - 1, day);
                if (isNaN(date.getTime()) || 
                    date.getDate() != day || 
                    date.getMonth() != month - 1 || 
                    date.getFullYear() != year) {
                    errors.push(`Data inválida em ${field}: ${item[field]}`);
                }
            }
        }
    });
    
    // Avisos para campos importantes mas não obrigatórios
    if (!item['Categoria'] || item['Categoria'].trim() === '') {
        warnings.push('Categoria não especificada');
    }
    
    if (!item['Número de Série'] || item['Número de Série'].trim() === '') {
        warnings.push('Número de série não especificado (pode dificultar identificação de duplicatas)');
    }
    
    if (!item['Marca'] || item['Marca'].trim() === '') {
        warnings.push('Marca não especificada');
    }
    
    if (!item['Modelo'] || item['Modelo'].trim() === '') {
        warnings.push('Modelo não especificado');
    }
    
    return { errors, warnings };
}

// Função para testar conectividade com o banco
async function testDatabaseConnection() {
    console.log('🔍 Testando conexão com o banco de dados...');
    
    try {
        // Testar conexão básica
        const { count, error } = await supabase
            .from('sistemainventario')
            .select('*', { count: 'exact', head: true })
            .eq('module_type', 'inventory');
        
        if (error) {
            console.error('❌ Erro na conexão:', error.message);
            return false;
        }
        
        console.log(`✅ Conexão OK - ${count} itens de inventário encontrados`);
        
        // Testar tabelas relacionadas
        const { count: categoryCount } = await supabase
            .from('categoriassistemainventario')
            .select('*', { count: 'exact', head: true });
        
        const { count: collaboratorCount } = await supabase
            .from('colaboradoressistemainventario')
            .select('*', { count: 'exact', head: true });
        
        console.log(`📊 Categorias: ${categoryCount || 0}`);
        console.log(`👥 Colaboradores: ${collaboratorCount || 0}`);
        
        return true;
        
    } catch (err) {
        console.error('❌ Erro inesperado:', err.message);
        return false;
    }
}

// Função principal de teste
async function runTests() {
    console.log('🧪 INICIANDO TESTES DE IMPORTAÇÃO');
    console.log('='.repeat(50));
    
    // 1. Testar conexão com banco
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
        console.log('❌ Falha na conexão com banco. Abortando testes.');
        return;
    }
    
    console.log('\n📄 Testando leitura do CSV...');
    
    // 2. Testar leitura do CSV
    let items;
    try {
        items = parseCSV('./inventario_amazon_importacao.csv');
        console.log(`✅ CSV lido com sucesso: ${items.length} itens encontrados`);
    } catch (err) {
        console.error('❌ Erro ao ler CSV:', err.message);
        return;
    }
    
    // 3. Validar estrutura dos dados
    console.log('\n🔍 Validando estrutura dos dados...');
    
    let validItems = 0;
    let itemsWithErrors = 0;
    let itemsWithWarnings = 0;
    
    // Testar apenas os primeiros 5 itens para não sobrecarregar
    const testItems = items.slice(0, 5);
    
    for (let i = 0; i < testItems.length; i++) {
        const item = testItems[i];
        const validation = validateItem(item);
        
        console.log(`\n[${i + 1}] ${item['Nome']}`);
        
        if (validation.errors.length > 0) {
            console.log('❌ Erros:');
            validation.errors.forEach(error => console.log(`   - ${error}`));
            itemsWithErrors++;
        } else {
            validItems++;
        }
        
        if (validation.warnings.length > 0) {
            console.log('⚠️  Avisos:');
            validation.warnings.forEach(warning => console.log(`   - ${warning}`));
            itemsWithWarnings++;
        }
    }
    
    // 4. Testar verificação de duplicatas
    console.log('\n🔍 Testando verificação de duplicatas...');
    
    for (let i = 0; i < Math.min(3, testItems.length); i++) {
        const item = testItems[i];
        try {
            const existsCheck = await checkItemExists(item);
            if (existsCheck.exists) {
                console.log(`⚠️  Item "${item['Nome']}" já existe (${existsCheck.reason})`);
            } else {
                console.log(`✅ Item "${item['Nome']}" é novo`);
            }
        } catch (err) {
            console.error(`❌ Erro ao verificar duplicata para "${item['Nome']}": ${err.message}`);
        }
    }
    
    // 5. Relatório de testes
    console.log('\n' + '='.repeat(50));
    console.log('📊 RELATÓRIO DE TESTES');
    console.log('='.repeat(50));
    console.log(`📄 Total de itens no CSV: ${items.length}`);
    console.log(`✅ Itens testados: ${testItems.length}`);
    console.log(`✅ Itens válidos: ${validItems}`);
    console.log(`❌ Itens com erros: ${itemsWithErrors}`);
    console.log(`⚠️  Itens com avisos: ${itemsWithWarnings}`);
    
    if (itemsWithErrors === 0) {
        console.log('\n🎉 Todos os testes passaram! O CSV está pronto para importação.');
        console.log('\n💡 Para executar a importação completa, execute:');
        console.log('   node import-csv.js');
    } else {
        console.log('\n⚠️  Alguns itens têm erros. Revise os dados antes da importação.');
    }
    
    console.log('='.repeat(50));
}

// Executar testes
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { validateItem, testDatabaseConnection, runTests };