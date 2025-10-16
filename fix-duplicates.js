const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDuplicates() {
    console.log('🔧 Corrigindo importação incorreta de duplicados...');
    
    try {
        // Buscar todos os itens importados pelo script de duplicados
        const { data: duplicateItems, error } = await supabase
            .from('sistemainventario')
            .select('id, name, metadata')
            .eq('module_type', 'inventory')
            .contains('metadata', { created_by: 'csv_import_duplicates' });
        
        if (error) {
            console.error('❌ Erro ao buscar itens duplicados:', error);
            return;
        }
        
        console.log(`📊 Encontrados ${duplicateItems.length} itens importados incorretamente`);
        
        if (duplicateItems.length === 0) {
            console.log('✅ Nenhum item para corrigir.');
            return;
        }
        
        // Buscar os itens originais para identificar quais realmente eram duplicatas
        const { data: originalItems, error: originalError } = await supabase
            .from('sistemainventario')
            .select('id, name, module_data')
            .eq('module_type', 'inventory')
            .contains('metadata', { created_by: 'csv_import' });
        
        if (originalError) {
            console.error('❌ Erro ao buscar itens originais:', originalError);
            return;
        }
        
        console.log(`📊 Encontrados ${originalItems.length} itens da importação original`);
        
        // Identificar quais itens duplicados devem ser mantidos (apenas os que realmente eram duplicatas)
        const itemsToKeep = [];
        const itemsToDelete = [];
        
        for (const duplicateItem of duplicateItems) {
            // Verificar se existe um item original com o mesmo nome
            const originalMatch = originalItems.find(original => 
                original.module_data?.name === duplicateItem.name ||
                original.name === duplicateItem.name
            );
            
            if (originalMatch) {
                // Este é realmente uma duplicata, manter
                itemsToKeep.push(duplicateItem);
            } else {
                // Este não deveria ter sido importado como duplicata, remover
                itemsToDelete.push(duplicateItem);
            }
        }
        
        console.log(`✅ Itens duplicados legítimos a manter: ${itemsToKeep.length}`);
        console.log(`❌ Itens a remover (importados incorretamente): ${itemsToDelete.length}`);
        
        if (itemsToDelete.length === 0) {
            console.log('✅ Nenhum item precisa ser removido.');
            return;
        }
        
        // Confirmar antes de deletar
        console.log('\n⚠️  ATENÇÃO: Os seguintes itens serão removidos:');
        itemsToDelete.slice(0, 10).forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.name}`);
        });
        
        if (itemsToDelete.length > 10) {
            console.log(`   ... e mais ${itemsToDelete.length - 10} itens`);
        }
        
        // Remover os itens incorretos
        const idsToDelete = itemsToDelete.map(item => item.id);
        
        console.log('\n🗑️  Removendo itens importados incorretamente...');
        
        const { error: deleteError } = await supabase
            .from('sistemainventario')
            .delete()
            .in('id', idsToDelete);
        
        if (deleteError) {
            console.error('❌ Erro ao remover itens:', deleteError);
            return;
        }
        
        console.log(`✅ ${itemsToDelete.length} itens removidos com sucesso`);
        
        // Relatório final
        console.log('\n' + '='.repeat(50));
        console.log('📈 RELATÓRIO DE CORREÇÃO');
        console.log('='.repeat(50));
        console.log(`📊 Itens originais: ${originalItems.length}`);
        console.log(`✅ Duplicatas legítimas mantidas: ${itemsToKeep.length}`);
        console.log(`❌ Itens incorretos removidos: ${itemsToDelete.length}`);
        console.log(`📊 Total final no inventário: ${originalItems.length + itemsToKeep.length}`);
        console.log('='.repeat(50));
        
        console.log('\n🎉 Correção concluída com sucesso!');
        
    } catch (err) {
        console.error('❌ Erro inesperado:', err);
    }
}

// Executar correção
if (require.main === module) {
    fixDuplicates().catch(console.error);
}

module.exports = { fixDuplicates };