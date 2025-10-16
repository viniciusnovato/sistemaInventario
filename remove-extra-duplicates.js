const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeExtraDuplicates() {
    console.log('🔧 Analisando e removendo duplicatas extras...');
    
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
        
        console.log(`📊 Total de itens no inventário: ${allItems.length}`);
        
        // Agrupar itens por nome para identificar duplicatas
        const itemGroups = {};
        
        allItems.forEach(item => {
            const itemName = item.module_data?.name || item.name;
            if (!itemGroups[itemName]) {
                itemGroups[itemName] = [];
            }
            itemGroups[itemName].push(item);
        });
        
        // Identificar grupos com mais de 2 itens (original + 1 duplicata legítima)
        const itemsToRemove = [];
        let duplicateGroups = 0;
        
        Object.entries(itemGroups).forEach(([itemName, items]) => {
            if (items.length > 2) {
                console.log(`⚠️  Item "${itemName}" tem ${items.length} unidades`);
                duplicateGroups++;
                
                // Manter apenas os 2 primeiros (original + 1 duplicata)
                // Remover os extras (índice 2 em diante)
                const extraItems = items.slice(2);
                itemsToRemove.push(...extraItems);
                
                console.log(`   Mantendo: 2 unidades`);
                console.log(`   Removendo: ${extraItems.length} unidades extras`);
            }
        });
        
        console.log(`\n📊 Grupos com mais de 2 unidades: ${duplicateGroups}`);
        console.log(`❌ Total de itens extras a remover: ${itemsToRemove.length}`);
        
        if (itemsToRemove.length === 0) {
            console.log('✅ Nenhum item extra encontrado. O inventário está correto.');
            return;
        }
        
        // Mostrar alguns exemplos dos itens que serão removidos
        console.log('\n⚠️  Exemplos de itens que serão removidos:');
        itemsToRemove.slice(0, 10).forEach((item, index) => {
            const itemName = item.module_data?.name || item.name;
            const createdBy = item.metadata?.created_by || 'unknown';
            console.log(`   ${index + 1}. ${itemName} (criado por: ${createdBy})`);
        });
        
        if (itemsToRemove.length > 10) {
            console.log(`   ... e mais ${itemsToRemove.length - 10} itens`);
        }
        
        // Remover os itens extras
        const idsToRemove = itemsToRemove.map(item => item.id);
        
        console.log('\n🗑️  Removendo itens extras...');
        
        const { error: deleteError } = await supabase
            .from('sistemainventario')
            .delete()
            .in('id', idsToRemove);
        
        if (deleteError) {
            console.error('❌ Erro ao remover itens:', deleteError);
            return;
        }
        
        console.log(`✅ ${itemsToRemove.length} itens extras removidos com sucesso`);
        
        // Contar itens restantes
        const { count: finalCount } = await supabase
            .from('sistemainventario')
            .select('*', { count: 'exact', head: true })
            .eq('module_type', 'inventory');
        
        // Relatório final
        console.log('\n' + '='.repeat(50));
        console.log('📈 RELATÓRIO DE LIMPEZA');
        console.log('='.repeat(50));
        console.log(`📊 Itens antes da limpeza: ${allItems.length}`);
        console.log(`❌ Itens extras removidos: ${itemsToRemove.length}`);
        console.log(`📊 Itens após a limpeza: ${finalCount}`);
        console.log(`✅ Cada item agora tem no máximo 2 unidades`);
        console.log('='.repeat(50));
        
        console.log('\n🎉 Limpeza concluída com sucesso!');
        
    } catch (err) {
        console.error('❌ Erro inesperado:', err);
    }
}

// Executar limpeza
if (require.main === module) {
    removeExtraDuplicates().catch(console.error);
}

module.exports = { removeExtraDuplicates };