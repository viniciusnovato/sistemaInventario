const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateRecovery() {
    console.log('🔍 Investigando possibilidade de recuperação dos itens originais...');
    
    try {
        // 1. Verificar se existe alguma tabela de auditoria ou histórico
        console.log('\n📋 Verificando estrutura do banco de dados...');
        
        const { data: tables, error: tablesError } = await supabase
            .rpc('get_table_names');
        
        if (tablesError) {
            console.log('⚠️  Não foi possível listar tabelas automaticamente');
        } else {
            console.log('📊 Tabelas encontradas:', tables);
        }
        
        // 2. Verificar se existe algum backup ou snapshot recente
        console.log('\n🔄 Verificando se existem backups automáticos...');
        
        // 3. Tentar buscar em outras tabelas relacionadas
        console.log('\n🔍 Verificando tabelas relacionadas...');
        
        // Verificar categorias
        const { data: categories, error: catError } = await supabase
            .from('categoriassistemainventario')
            .select('*');
        
        if (!catError && categories) {
            console.log(`📂 Categorias encontradas: ${categories.length}`);
            categories.forEach((cat, index) => {
                console.log(`   ${index + 1}. ${cat.name} (ID: ${cat.id})`);
            });
        }
        
        // Verificar colaboradores
        const { data: collaborators, error: collError } = await supabase
            .from('colaboradoressistemainventario')
            .select('*');
        
        if (!collError && collaborators) {
            console.log(`👥 Colaboradores encontrados: ${collaborators.length}`);
            collaborators.forEach((coll, index) => {
                console.log(`   ${index + 1}. ${coll.name} (ID: ${coll.id})`);
            });
        }
        
        // 4. Verificar se existe algum log ou auditoria
        console.log('\n📝 Verificando logs de auditoria...');
        
        // Tentar buscar em uma possível tabela de auditoria
        const auditTables = ['audit_log', 'system_log', 'inventory_history', 'audit_trail'];
        
        for (const tableName of auditTables) {
            try {
                const { data: auditData, error: auditError } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(5);
                
                if (!auditError && auditData) {
                    console.log(`✅ Tabela de auditoria encontrada: ${tableName}`);
                    console.log(`📊 Registros encontrados: ${auditData.length}`);
                }
            } catch (err) {
                // Tabela não existe, continuar
            }
        }
        
        // 5. Verificar se existe algum backup na própria tabela (soft delete)
        console.log('\n🗑️  Verificando se existem itens com soft delete...');
        
        const { data: deletedItems, error: deletedError } = await supabase
            .from('sistemainventario')
            .select('*')
            .eq('deleted', true);
        
        if (!deletedError && deletedItems && deletedItems.length > 0) {
            console.log(`✅ Itens com soft delete encontrados: ${deletedItems.length}`);
        } else {
            console.log('❌ Nenhum item com soft delete encontrado');
        }
        
        // 6. Verificar se existe alguma coluna de status ou ativo
        console.log('\n🔍 Verificando estrutura da tabela sistemainventario...');
        
        const { data: tableStructure, error: structError } = await supabase
            .from('sistemainventario')
            .select('*')
            .limit(1);
        
        if (!structError && tableStructure && tableStructure.length > 0) {
            console.log('📋 Estrutura da tabela (exemplo):');
            console.log(JSON.stringify(tableStructure[0], null, 2));
        }
        
        // 7. Verificar se o Supabase tem backup automático
        console.log('\n💾 INFORMAÇÕES SOBRE RECUPERAÇÃO:');
        console.log('='.repeat(50));
        console.log('1. 🔄 Supabase mantém backups automáticos por 7 dias');
        console.log('2. 📞 Você pode contactar o suporte do Supabase para recuperação');
        console.log('3. 🕐 A recuperação deve ser feita o mais rápido possível');
        console.log('4. 📧 Acesse: https://supabase.com/dashboard/support');
        console.log('='.repeat(50));
        
        // 8. Sugestões de recuperação manual
        console.log('\n💡 OPÇÕES DE RECUPERAÇÃO:');
        console.log('='.repeat(50));
        console.log('1. 🔄 Restaurar do backup do Supabase (recomendado)');
        console.log('2. 📝 Recriar manualmente os 16 itens originais');
        console.log('3. 📊 Importar de uma fonte externa se disponível');
        console.log('='.repeat(50));
        
        console.log('\n⚠️  AÇÃO RECOMENDADA:');
        console.log('Contacte imediatamente o suporte do Supabase para restaurar');
        console.log('o backup de antes da importação do CSV.');
        
    } catch (err) {
        console.error('❌ Erro durante investigação:', err);
    }
}

// Executar investigação
if (require.main === module) {
    investigateRecovery().catch(console.error);
}

module.exports = { investigateRecovery };