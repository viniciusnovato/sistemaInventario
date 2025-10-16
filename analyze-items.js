const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeItems() {
    console.log('🔍 Analisando itens do inventário...');
    
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
        
        // Categorizar itens por origem
        const itemsBySource = {
            instituto_areluna: [],
            csv_import: [],
            csv_import_duplicates: [],
            system: [],
            unknown: []
        };
        
        allItems.forEach(item => {
            const createdBy = item.metadata?.created_by;
            const source = item.metadata?.source;
            
            if (createdBy === 'csv_import' || source === 'csv_import') {
                itemsBySource.csv_import.push(item);
            } else if (createdBy === 'csv_import_duplicates' || source === 'csv_import_duplicates') {
                itemsBySource.csv_import_duplicates.push(item);
            } else if (createdBy === 'system' || source === 'system') {
                itemsBySource.system.push(item);
            } else if (!createdBy && !source) {
                // Itens sem metadata provavelmente são do Instituto Areluna (originais)
                itemsBySource.instituto_areluna.push(item);
            } else {
                itemsBySource.unknown.push(item);
            }
        });
        
        // Relatório detalhado
        console.log('\n' + '='.repeat(60));
        console.log('📈 ANÁLISE DE ITENS POR ORIGEM');
        console.log('='.repeat(60));
        
        console.log(`🏛️  Instituto Areluna (originais): ${itemsBySource.instituto_areluna.length} itens`);
        console.log(`📥 Importados do CSV: ${itemsBySource.csv_import.length} itens`);
        console.log(`📋 Duplicatas do CSV: ${itemsBySource.csv_import_duplicates.length} itens`);
        console.log(`⚙️  Sistema: ${itemsBySource.system.length} itens`);
        console.log(`❓ Origem desconhecida: ${itemsBySource.unknown.length} itens`);
        
        console.log('\n' + '='.repeat(60));
        console.log('📋 ITENS A MANTER (Instituto Areluna)');
        console.log('='.repeat(60));
        
        if (itemsBySource.instituto_areluna.length > 0) {
            console.log('✅ Itens do Instituto Areluna que serão mantidos:');
            itemsBySource.instituto_areluna.slice(0, 10).forEach((item, index) => {
                const itemName = item.module_data?.name || item.name || 'Nome não definido';
                console.log(`   ${index + 1}. ${itemName} (ID: ${item.id})`);
            });
            
            if (itemsBySource.instituto_areluna.length > 10) {
                console.log(`   ... e mais ${itemsBySource.instituto_areluna.length - 10} itens`);
            }
        } else {
            console.log('⚠️  Nenhum item do Instituto Areluna encontrado!');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🗑️  ITENS A REMOVER');
        console.log('='.repeat(60));
        
        const itemsToRemove = [
            ...itemsBySource.csv_import,
            ...itemsBySource.csv_import_duplicates,
            ...itemsBySource.system,
            ...itemsBySource.unknown
        ];
        
        console.log(`❌ Total de itens a remover: ${itemsToRemove.length}`);
        
        if (itemsToRemove.length > 0) {
            console.log('\n⚠️  Exemplos de itens que serão removidos:');
            itemsToRemove.slice(0, 15).forEach((item, index) => {
                const itemName = item.module_data?.name || item.name || 'Nome não definido';
                const createdBy = item.metadata?.created_by || 'sem metadata';
                console.log(`   ${index + 1}. ${itemName} (origem: ${createdBy})`);
            });
            
            if (itemsToRemove.length > 15) {
                console.log(`   ... e mais ${itemsToRemove.length - 15} itens`);
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMO DA OPERAÇÃO');
        console.log('='.repeat(60));
        console.log(`📊 Total atual: ${allItems.length} itens`);
        console.log(`✅ Itens a manter: ${itemsBySource.instituto_areluna.length} itens`);
        console.log(`❌ Itens a remover: ${itemsToRemove.length} itens`);
        console.log(`📊 Total após limpeza: ${itemsBySource.instituto_areluna.length} itens`);
        console.log('='.repeat(60));
        
        // Salvar IDs dos itens a remover para uso posterior
        const idsToRemove = itemsToRemove.map(item => item.id);
        
        return {
            totalItems: allItems.length,
            itemsToKeep: itemsBySource.instituto_areluna,
            itemsToRemove: itemsToRemove,
            idsToRemove: idsToRemove,
            summary: {
                instituto_areluna: itemsBySource.instituto_areluna.length,
                csv_import: itemsBySource.csv_import.length,
                csv_import_duplicates: itemsBySource.csv_import_duplicates.length,
                system: itemsBySource.system.length,
                unknown: itemsBySource.unknown.length
            }
        };
        
    } catch (err) {
        console.error('❌ Erro inesperado:', err);
        return null;
    }
}

// Executar análise
if (require.main === module) {
    analyzeItems().catch(console.error);
}

module.exports = { analyzeItems };