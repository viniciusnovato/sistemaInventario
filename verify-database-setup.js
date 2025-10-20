require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAndSetupDatabase() {
    console.log('🔍 Verificando estrutura do banco de dados...\n');

    try {
        // 1. Verificar se a tabela modules existe
        console.log('1️⃣ Verificando tabela modules...');
        const { data: modules, error: modulesError } = await supabase
            .from('modules')
            .select('count')
            .limit(1);

        if (modulesError) {
            console.log('❌ Tabela modules não encontrada ou erro:', modulesError.message);
            console.log('\n📋 AÇÃO NECESSÁRIA:');
            console.log('Execute o arquivo database/setup-modules.sql no seu banco de dados Supabase.');
            console.log('Você pode fazer isso através do SQL Editor no painel do Supabase.\n');
            return false;
        }
        console.log('✅ Tabela modules existe\n');

        // 2. Verificar se a tabela user_module_access existe
        console.log('2️⃣ Verificando tabela user_module_access...');
        const { data: userModuleAccess, error: userModuleAccessError } = await supabase
            .from('user_module_access')
            .select('count')
            .limit(1);

        if (userModuleAccessError) {
            console.log('❌ Tabela user_module_access não encontrada:', userModuleAccessError.message);
            console.log('\n📋 AÇÃO NECESSÁRIA:');
            console.log('Execute o arquivo database/setup-modules.sql no seu banco de dados Supabase.\n');
            return false;
        }
        console.log('✅ Tabela user_module_access existe\n');

        // 3. Verificar se a tabela role_module_access existe
        console.log('3️⃣ Verificando tabela role_module_access...');
        const { data: roleModuleAccess, error: roleModuleAccessError } = await supabase
            .from('role_module_access')
            .select('count')
            .limit(1);

        if (roleModuleAccessError) {
            console.log('❌ Tabela role_module_access não encontrada:', roleModuleAccessError.message);
            console.log('\n📋 AÇÃO NECESSÁRIA:');
            console.log('Execute o arquivo database/setup-modules.sql no seu banco de dados Supabase.\n');
            return false;
        }
        console.log('✅ Tabela role_module_access existe\n');

        // 4. Verificar se existem módulos cadastrados
        console.log('4️⃣ Verificando módulos cadastrados...');
        const { data: modulesList, error: modulesListError } = await supabase
            .from('modules')
            .select('*')
            .order('display_order');

        if (modulesListError) {
            console.log('❌ Erro ao buscar módulos:', modulesListError.message);
            return false;
        }

        if (!modulesList || modulesList.length === 0) {
            console.log('⚠️  Nenhum módulo encontrado no banco de dados');
            console.log('\n📋 AÇÃO NECESSÁRIA:');
            console.log('Execute o arquivo database/setup-modules.sql para inserir os módulos padrão.\n');
            return false;
        }

        console.log(`✅ ${modulesList.length} módulos encontrados:`);
        modulesList.forEach(module => {
            console.log(`   ${module.emoji} ${module.name} (${module.code})`);
        });
        console.log('');

        // 5. Verificar se a função get_user_accessible_modules existe
        console.log('5️⃣ Testando função get_user_accessible_modules...');
        
        // Pegar um usuário de teste
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError || !users || users.users.length === 0) {
            console.log('⚠️  Nenhum usuário encontrado para testar a função');
        } else {
            const testUserId = users.users[0].id;
            const { data: testModules, error: functionError } = await supabase
                .rpc('get_user_accessible_modules', { p_user_id: testUserId });

            if (functionError) {
                console.log('❌ Função get_user_accessible_modules não encontrada ou erro:', functionError.message);
                console.log('\n📋 AÇÃO NECESSÁRIA:');
                console.log('Execute o arquivo database/setup-modules.sql para criar as funções SQL necessárias.\n');
                return false;
            }
            console.log('✅ Função get_user_accessible_modules está funcionando\n');
        }

        // 6. Verificar se a função user_has_module_access existe
        console.log('6️⃣ Testando função user_has_module_access...');
        
        if (users && users.users.length > 0) {
            const testUserId = users.users[0].id;
            const { data: hasAccess, error: functionError } = await supabase
                .rpc('user_has_module_access', { 
                    p_user_id: testUserId,
                    p_module_code: 'inventory'
                });

            if (functionError) {
                console.log('❌ Função user_has_module_access não encontrada ou erro:', functionError.message);
                console.log('\n📋 AÇÃO NECESSÁRIA:');
                console.log('Execute o arquivo database/setup-modules.sql para criar as funções SQL necessárias.\n');
                return false;
            }
            console.log('✅ Função user_has_module_access está funcionando\n');
        }

        // 7. Verificar se existem roles com acesso aos módulos
        console.log('7️⃣ Verificando acessos de roles aos módulos...');
        const { data: roleAccesses, error: roleAccessError } = await supabase
            .from('role_module_access')
            .select(`
                *,
                roles(name),
                modules(name, code)
            `)
            .limit(10);

        if (roleAccessError) {
            console.log('⚠️  Erro ao verificar acessos de roles:', roleAccessError.message);
        } else if (!roleAccesses || roleAccesses.length === 0) {
            console.log('⚠️  Nenhum acesso de role aos módulos configurado');
            console.log('\n📋 RECOMENDAÇÃO:');
            console.log('Configure os acessos das roles aos módulos através do painel admin-modules.html');
            console.log('ou execute setup-admin.js para configurar acesso admin.\n');
        } else {
            console.log(`✅ ${roleAccesses.length} acessos de roles configurados\n`);
        }

        console.log('✅ ✅ ✅ BANCO DE DADOS CONFIGURADO CORRETAMENTE! ✅ ✅ ✅\n');
        console.log('🎉 Todas as tabelas e funções necessárias estão presentes.\n');
        
        return true;

    } catch (error) {
        console.error('💥 Erro inesperado:', error);
        return false;
    }
}

// Executar verificação
verifyAndSetupDatabase().then(success => {
    if (success) {
        console.log('✅ Sistema pronto para uso!');
        process.exit(0);
    } else {
        console.log('\n❌ Configuração incompleta. Siga as ações necessárias acima.');
        console.log('\n📚 GUIA RÁPIDO:');
        console.log('1. Acesse o painel do Supabase (https://supabase.com)');
        console.log('2. Vá para SQL Editor');
        console.log('3. Copie e cole o conteúdo de database/setup-modules.sql');
        console.log('4. Execute o SQL');
        console.log('5. Execute este script novamente para verificar\n');
        process.exit(1);
    }
});
