require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupAdmin() {
    console.log('🚀 Iniciando configuração do Admin...\n');

    const userEmail = 'vinicius.novato@institutoareluna.pt';

    try {
        // 1. Buscar o usuário pelo email
        console.log('📧 Buscando usuário:', userEmail);
        const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

        if (userError) {
            console.error('❌ Erro ao buscar usuários:', userError);
            return;
        }

        const user = users.find(u => u.email === userEmail);

        if (!user) {
            console.error('❌ Usuário não encontrado:', userEmail);
            return;
        }

        console.log('✅ Usuário encontrado:', user.id);

        // 2. Verificar estrutura da tabela roles
        console.log('\n🔍 Verificando tabela roles...');
        const { data: existingRoles, error: rolesError } = await supabase
            .from('roles')
            .select('*')
            .limit(1);

        if (rolesError) {
            console.error('❌ Erro ao acessar tabela roles:', rolesError);
            console.log('\n📝 Você precisa executar os scripts SQL manualmente no Supabase:');
            console.log('   1. Acesse o SQL Editor do Supabase');
            console.log('   2. Execute: database/setup-modules.sql');
            console.log('   3. Execute: database/seed-modules.sql');
            return;
        }

        console.log('✅ Tabela roles acessível');

        // 3. Buscar ou criar role Admin
        console.log('\n👑 Configurando role Admin...');
        let { data: adminRole, error: adminRoleError } = await supabase
            .from('roles')
            .select('*')
            .eq('name', 'Admin')
            .maybeSingle();

        if (!adminRole) {
            console.log('📝 Criando role Admin...');
            const { data: newRole, error: createRoleError } = await supabase
                .from('roles')
                .insert({
                    name: 'Admin',
                    description: 'Administrador do Sistema'
                })
                .select()
                .single();

            if (createRoleError) {
                console.error('❌ Erro ao criar role Admin:', createRoleError);
                return;
            }

            adminRole = newRole;
            console.log('✅ Role Admin criada:', adminRole.id);
        } else {
            console.log('✅ Role Admin encontrada:', adminRole.id);
        }

        // 4. Buscar tenant_id do usuário
        // 4. Buscar tenant_id do usuário
        console.log('\n🏢 Buscando tenant do usuário...');

        // Buscar na tabela user_profiles
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('tenant_id')
            .eq('user_id', user.id)
            .maybeSingle();

        let tenantId = userProfile?.tenant_id;

        // Se não encontrou, buscar de outro user_role do usuário
        if (!tenantId) {
            const { data: existingUserRoles } = await supabase
                .from('user_roles')
                .select('tenant_id')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();

            tenantId = existingUserRoles?.tenant_id;
        }

        // Se ainda não encontrou, buscar o primeiro tenant disponível
        if (!tenantId) {
            const { data: tenants } = await supabase
                .from('tenants')
                .select('id')
                .limit(1)
                .maybeSingle();

            tenantId = tenants?.id;
        }

        if (!tenantId) {
            console.error('❌ Nenhum tenant encontrado no sistema');
            console.log('⚠️  Você precisa criar um tenant primeiro ou associar o usuário a um tenant');
            return;
        }

        console.log('✅ Tenant encontrado:', tenantId);

        // 5. Associar usuário à role Admin

        // 5. Associar usuário à role Admin
        console.log('\n🔗 Associando usuário à role Admin...');
        const { data: existingUserRole, error: checkUserRoleError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', user.id)
            .eq('role_id', adminRole.id)
            .maybeSingle();

        if (!existingUserRole) {
            const { error: userRoleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: user.id,
                    role_id: adminRole.id,
                    tenant_id: tenantId
                });

            if (userRoleError) {
                console.error('❌ Erro ao associar usuário à role:', userRoleError);
                return;
            }

            console.log('✅ Usuário associado à role Admin');
        } else {
            console.log('✅ Usuário já está associado à role Admin');
        }

        // 6. Verificar e criar módulos
        console.log('\n📦 Verificando módulos...');
        const { data: existingModules, error: modulesError } = await supabase
            .from('modules')
            .select('*');

        if (modulesError) {
            console.error('❌ Erro ao buscar módulos:', modulesError);
            console.log('\n📝 Execute o script: database/seed-modules.sql no Supabase');
            return;
        }

        if (!existingModules || existingModules.length === 0) {
            console.log('📝 Criando módulos iniciais...');

            const modules = [
                { code: 'inventory', name: 'Inventário', description: 'Gestão de estoque e produtos', icon: 'fa-boxes', emoji: '📦', color: 'blue', route: '/inventory.html', display_order: 1, is_active: true },
                { code: 'sales', name: 'Vendas', description: 'Controle de vendas e pedidos', icon: 'fa-shopping-cart', emoji: '🛒', color: 'green', route: '/sales.html', display_order: 2, is_active: true },
                { code: 'purchases', name: 'Compras', description: 'Gestão de compras e fornecedores', icon: 'fa-shopping-bag', emoji: '🛍️', color: 'purple', route: '/purchases.html', display_order: 3, is_active: true },
                { code: 'financial', name: 'Financeiro', description: 'Contas a pagar e receber', icon: 'fa-dollar-sign', emoji: '💰', color: 'orange', route: '/financial.html', display_order: 4, is_active: true },
                { code: 'crm', name: 'CRM', description: 'Relacionamento com clientes', icon: 'fa-users', emoji: '👥', color: 'indigo', route: '/crm.html', display_order: 5, is_active: true },
                { code: 'hr', name: 'RH', description: 'Recursos Humanos', icon: 'fa-user-tie', emoji: '👔', color: 'teal', route: '/hr.html', display_order: 6, is_active: true },
                { code: 'reports', name: 'Relatórios', description: 'Dashboards e relatórios gerenciais', icon: 'fa-chart-line', emoji: '📊', color: 'cyan', route: '/reports.html', display_order: 7, is_active: true },
                { code: 'settings', name: 'Configurações', description: 'Configurações do sistema', icon: 'fa-cog', emoji: '⚙️', color: 'gray', route: '/settings.html', display_order: 8, is_active: true }
            ];

            const { data: createdModules, error: createModulesError } = await supabase
                .from('modules')
                .insert(modules)
                .select();

            if (createModulesError) {
                console.error('❌ Erro ao criar módulos:', createModulesError);
                return;
            }

            console.log(`✅ ${createdModules.length} módulos criados`);
        } else {
            console.log(`✅ ${existingModules.length} módulos já existem`);
        }

        // 7. Dar acesso a todos os módulos para a role Admin
        console.log('\n🔓 Configurando acesso aos módulos...');
        const { data: allModules } = await supabase
            .from('modules')
            .select('*');

        let accessGranted = 0;
        for (const module of allModules) {
            const { data: existingAccess } = await supabase
                .from('role_module_access')
                .select('*')
                .eq('role_id', adminRole.id)
                .eq('module_id', module.id)
                .maybeSingle();

            if (!existingAccess) {
                const { error: accessError } = await supabase
                    .from('role_module_access')
                    .insert({
                        role_id: adminRole.id,
                        module_id: module.id,
                        is_active: true
                    });

                if (!accessError) {
                    console.log(`   ✅ Acesso concedido ao módulo: ${module.name}`);
                    accessGranted++;
                }
            }
        }

        if (accessGranted === 0) {
            console.log('   ℹ️  Todos os acessos já estavam configurados');
        }

        console.log('\n🎉 Configuração concluída com sucesso!');
        console.log('\n📋 Resumo:');
        console.log(`   👤 Usuário: ${userEmail}`);
        console.log(`   🆔 ID: ${user.id}`);
        console.log(`   👑 Role: Admin`);
        console.log(`   📦 Módulos com acesso: ${allModules.length}`);
        console.log('\n✨ O usuário agora tem acesso total ao sistema!');
        console.log('\n🔄 Recarregue a página do dashboard para ver as mudanças.');

    } catch (error) {
        console.error('❌ Erro geral:', error);
    }
}

setupAdmin();
