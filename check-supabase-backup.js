const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSupabaseBackup() {
    console.log('🔍 Verificando opções de recuperação no Supabase...');
    
    try {
        // 1. Verificar informações do projeto
        console.log('\n📊 Informações do projeto:');
        console.log(`🌐 URL: ${supabaseUrl}`);
        console.log(`🔑 Usando service role key`);
        
        // 2. Tentar acessar informações de backup via API administrativa
        console.log('\n💾 Verificando backups disponíveis...');
        
        // Extrair o ID do projeto da URL
        const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        console.log(`📋 Project ID: ${projectId}`);
        
        // 3. Verificar se existe alguma função RPC para listar backups
        try {
            const { data: rpcFunctions, error: rpcError } = await supabase
                .rpc('pg_get_functiondef', { funcoid: 'backup_list' });
            
            if (!rpcError) {
                console.log('✅ Função de backup encontrada');
            }
        } catch (err) {
            console.log('❌ Nenhuma função de backup personalizada encontrada');
        }
        
        // 4. Verificar logs do sistema (se disponível)
        console.log('\n📝 Verificando logs do sistema...');
        
        try {
            // Tentar acessar logs via SQL
            const { data: logs, error: logsError } = await supabase
                .from('pg_stat_activity')
                .select('*')
                .limit(5);
            
            if (!logsError && logs) {
                console.log(`📊 Atividades do banco: ${logs.length} sessões ativas`);
            }
        } catch (err) {
            console.log('⚠️  Logs do sistema não acessíveis via API');
        }
        
        // 5. Verificar se existe algum snapshot ou backup manual
        console.log('\n🔄 Verificando possíveis snapshots...');
        
        // Tentar buscar em tabelas de sistema do PostgreSQL
        try {
            const { data: dbInfo, error: dbError } = await supabase
                .rpc('version');
            
            if (!dbError) {
                console.log('✅ Conexão com PostgreSQL ativa');
                console.log(`📊 Versão: ${dbInfo}`);
            }
        } catch (err) {
            console.log('⚠️  Informações do banco não acessíveis');
        }
        
        // 6. Instruções detalhadas para recuperação
        console.log('\n' + '='.repeat(60));
        console.log('🚨 SITUAÇÃO CRÍTICA - ITENS ORIGINAIS PERDIDOS');
        console.log('='.repeat(60));
        console.log('❌ Foram removidos 16 itens originais do Instituto Areluna');
        console.log('⏰ Ação imediata necessária para recuperação');
        
        console.log('\n🔄 OPÇÕES DE RECUPERAÇÃO IMEDIATA:');
        console.log('='.repeat(60));
        
        console.log('\n1. 🏥 RECUPERAÇÃO VIA SUPABASE DASHBOARD:');
        console.log('   • Acesse: https://supabase.com/dashboard/project/' + projectId);
        console.log('   • Vá para Settings > Database');
        console.log('   • Procure por "Point-in-time Recovery" ou "Backups"');
        console.log('   • Restaure para antes da primeira importação CSV');
        
        console.log('\n2. 📞 CONTATO COM SUPORTE SUPABASE:');
        console.log('   • Email: support@supabase.com');
        console.log('   • Dashboard: https://supabase.com/dashboard/support');
        console.log('   • Mencione: "Need point-in-time recovery"');
        console.log('   • Project ID: ' + projectId);
        
        console.log('\n3. 🔧 RECUPERAÇÃO MANUAL (se backup não disponível):');
        console.log('   • Recriar os 16 itens manualmente');
        console.log('   • Usar dados de backup local se disponível');
        console.log('   • Importar de planilha externa');
        
        console.log('\n⚠️  INFORMAÇÕES IMPORTANTES:');
        console.log('='.repeat(60));
        console.log('• 🕐 Supabase mantém backups por 7 dias (plano gratuito)');
        console.log('• 📅 Planos pagos têm retenção maior');
        console.log('• ⚡ Quanto mais rápido agir, maior chance de recuperação');
        console.log('• 💾 Point-in-time recovery pode estar disponível');
        
        console.log('\n📋 PRÓXIMOS PASSOS RECOMENDADOS:');
        console.log('='.repeat(60));
        console.log('1. ✅ Acesse o dashboard do Supabase IMEDIATAMENTE');
        console.log('2. ✅ Procure por opções de backup/recovery');
        console.log('3. ✅ Se não encontrar, contacte o suporte');
        console.log('4. ✅ Forneça o timestamp aproximado antes da importação');
        console.log('5. ✅ Mencione que precisa recuperar 16 itens específicos');
        
        console.log('\n🎯 TIMESTAMP APROXIMADO DA PERDA:');
        console.log('   Antes da primeira importação CSV (hoje)');
        console.log('   Procure por backup de ontem ou início de hoje');
        
    } catch (err) {
        console.error('❌ Erro durante verificação:', err);
    }
}

// Executar verificação
if (require.main === module) {
    checkSupabaseBackup().catch(console.error);
}

module.exports = { checkSupabaseBackup };