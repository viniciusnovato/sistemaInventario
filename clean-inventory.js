const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanInventory() {
    console.log('🧹 Iniciando limpeza do inventário...');
    console.log('⚠️  ATENÇÃO: Esta operação removerá TODOS os itens importados!');
    console.log('✅ Apenas itens originais do Instituto Areluna serão mantidos.');
    
    try {
        // Buscar todos os itens de inventário
        const { data: allItems, error } = await supabase
            .from('sistemainventario')
            .select('id, name, module_data, metadata, created_at')
            .eq('module_type', 'inventory')
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('❌ Erro ao buscar itens:', error);
            return;
        }
        
        console.log(`\n📊 Total de itens encontrados: ${allItems.length}`);
        
        // Identificar itens do Instituto Areluna (sem metadata de importação)
        const institutoItems = allItems.filter(item => {
            const createdBy = item.metadata?.created_by;
            const source = item.metadata?.source;
            
            // Itens sem metadata de importação são considerados originais do Instituto
            return !createdBy && !source;
        });
        
        // Identificar itens a remover (todos com metadata de importação)
        const itemsToRemove = allItems.filter(item => {
            const createdBy = item.metadata?.created_by;
            const source = item.metadata?.source;
            
            // Remover itens com qualquer metadata de importação
            return createdBy || source;
        });
        
        console.log(`\n✅ Itens do Instituto Areluna a manter: ${institutoItems.length}`);
        console.log(`❌ Itens importados a remover: ${itemsToRemove.length}`);
        
        if (institutoItems.length > 0) {
            console.log('\n🏛️  Itens do Instituto Areluna que serão mantidos:');
            institutoItems.forEach((item, index) => {
                const itemName = item.module_data?.name || item.name || 'Nome não definido';
                console.log(`   ${index + 1}. ${itemName} (ID: ${item.id})`);
            });
        } else {
            console.log('\n⚠️  ATENÇÃO: Nenhum item original do Instituto Areluna encontrado!');
            console.log('   O inventário ficará completamente vazio após a limpeza.');
        }
        
        if (itemsToRemove.length > 0) {
            console.log('\n🗑️  Removendo itens importados...');
            
            // Mostrar alguns exemplos dos itens que serão removidos
            console.log('\n📋 Exemplos de itens que serão removidos:');
            itemsToRemove.slice(0, 10).forEach((item, index) => {
                const itemName = item.module_data?.name || item.name || 'Nome não definido';
                const createdBy = item.metadata?.created_by || 'sistema';
                console.log(`   ${index + 1}. ${itemName} (origem: ${createdBy})`);
            });
            
            if (itemsToRemove.length > 10) {
                console.log(`   ... e mais ${itemsToRemove.length - 10} itens`);
            }
            
            // Remover os itens em lotes para evitar timeout
            const batchSize = 50;
            let removedCount = 0;
            
            for (let i = 0; i < itemsToRemove.length; i += batchSize) {
                const batch = itemsToRemove.slice(i, i + batchSize);
                const idsToRemove = batch.map(item => item.id);
                
                console.log(`\n🔄 Removendo lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(itemsToRemove.length / batchSize)} (${batch.length} itens)...`);
                
                const { error: deleteError } = await supabase
                    .from('sistemainventario')
                    .delete()
                    .in('id', idsToRemove);
                
                if (deleteError) {
                    console.error(`❌ Erro ao remover lote ${Math.floor(i / batchSize) + 1}:`, deleteError);
                    continue;
                }
                
                removedCount += batch.length;
                console.log(`✅ Lote ${Math.floor(i / batchSize) + 1} removido com sucesso (${batch.length} itens)`);
            }
            
            console.log(`\n✅ Total de itens removidos: ${removedCount}`);
        } else {
            console.log('\n✅ Nenhum item importado encontrado para remover.');
        }
        
        // Verificar contagem final
        const { count: finalCount } = await supabase
            .from('sistemainventario')
            .select('*', { count: 'exact', head: true })
            .eq('module_type', 'inventory');
        
        // Relatório final
        console.log('\n' + '='.repeat(60));
        console.log('📈 RELATÓRIO FINAL DE LIMPEZA');
        console.log('='.repeat(60));
        console.log(`📊 Itens antes da limpeza: ${allItems.length}`);
        console.log(`🏛️  Itens do Instituto Areluna mantidos: ${institutoItems.length}`);
        console.log(`❌ Itens importados removidos: ${itemsToRemove.length}`);
        console.log(`📊 Itens após a limpeza: ${finalCount}`);
        console.log('='.repeat(60));
        
        if (finalCount === 0) {
            console.log('\n🔄 O inventário está agora completamente limpo.');
            console.log('💡 Você pode começar a adicionar itens originais do Instituto Areluna.');
        } else {
            console.log(`\n✅ Limpeza concluída! Restam apenas ${finalCount} itens originais do Instituto Areluna.`);
        }
        
        console.log('\n🎉 Operação de limpeza concluída com sucesso!');
        
    } catch (err) {
        console.error('❌ Erro inesperado:', err);
    }
}

// Executar limpeza
if (require.main === module) {
    cleanInventory().catch(console.error);
}

module.exports = { cleanInventory };