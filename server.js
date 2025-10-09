const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const multer = require('multer');
const QRCode = require('qrcode');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3002;

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Configuração do multer para upload de arquivos
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de imagem são permitidos'), false);
        }
    }
});

// Função para gerar QR Code único (mantida para compatibilidade)
function generateUniqueQRCode() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `QR-${timestamp}-${random}`;
}

// Função para gerar link do item
function generateItemLink(itemId, port = PORT) {
    // Em produção na Vercel, usar a URL do domínio
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}/view-item.html?id=${itemId}`;
    }
    // Em desenvolvimento, usar localhost
    return `http://localhost:${port}/view-item.html?id=${itemId}`;
}

// Função para gerar QR Code como Data URL
async function generateQRCodeDataURL(text) {
    try {
        const qrCodeDataURL = await QRCode.toDataURL(text, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        return qrCodeDataURL;
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        throw error;
    }
}

// Função para fazer upload de imagem para o Supabase Storage
async function uploadImageToStorage(file, fileName) {
    try {
        const { data, error } = await supabaseAdmin.storage
            .from('item-images')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            throw error;
        }

        // Obter URL pública da imagem
        const { data: publicUrlData } = supabaseAdmin.storage
            .from('item-images')
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error);
        throw error;
    }
}

// Middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://cdn.tailwindcss.com",
                "https://unpkg.com"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'", process.env.SUPABASE_URL]
        }
    }
}));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rotas da API

// GET - Listar todos os itens
app.get('/api/items', async (req, res) => {
    try {
        const {
            search = '',
            category = '',
            status = '',
            priceMin = '',
            priceMax = '',
            stock = '',
            sortBy = 'created_at',
            sortOrder = 'desc',
            page = 1,
            limit = 20
        } = req.query;

        // Construir query base
        let query = supabase
            .from('sistemainventario')
            .select('*', { count: 'exact' })
            .eq('module_type', 'inventory');

        // Aplicar filtros de busca por texto
        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%,supplier.ilike.%${search}%`);
        }

        // Filtro por categoria
        if (category) {
            query = query.eq('category', category);
        }

        // Filtro por status
        if (status) {
            query = query.eq('status', status);
        }

        // Filtro por faixa de preço
        if (priceMin) {
            query = query.gte('price', parseFloat(priceMin));
        }
        if (priceMax) {
            query = query.lte('price', parseFloat(priceMax));
        }

        // Filtro por nível de estoque
        if (stock) {
            switch (stock) {
                case 'zero':
                    query = query.eq('quantity', 0);
                    break;
                case 'low':
                    query = query.gt('quantity', 0).lte('quantity', 10);
                    break;
                case 'medium':
                    query = query.gt('quantity', 10).lte('quantity', 50);
                    break;
                case 'high':
                    query = query.gt('quantity', 50);
                    break;
            }
        }

        // Ordenação
        const validSortFields = ['name', 'price', 'quantity', 'created_at', 'category', 'status'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const ascending = sortOrder === 'asc';
        query = query.order(sortField, { ascending });

        // Paginação
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Máximo 100 itens por página
        const offset = (pageNum - 1) * limitNum;
        
        query = query.range(offset, offset + limitNum - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error('Erro ao buscar itens:', error);
            return res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }

        // Calcular informações de paginação
        const totalPages = Math.ceil(count / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        res.json({
            success: true,
            data: data || [],
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: count,
                itemsPerPage: limitNum,
                hasNextPage,
                hasPrevPage
            },
            filters: {
                search,
                category,
                status,
                priceMin,
                priceMax,
                stock,
                sortBy: sortField,
                sortOrder
            }
        });
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// GET - Buscar item por ID
app.get('/api/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('sistemainventario')
            .select(`
                *,
                categoria:categoriassistemainventario(nome),
                colaborador:colaboradoressistemainventario(nome)
            `)
            .eq('module_type', 'inventory')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ 
                    error: 'Item não encontrado' 
                });
            }
            console.error('Erro ao buscar item:', error);
            return res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }

        // Transform the data to include category and collaborator names
        const transformedData = {
            ...data,
            category: data.categoria?.nome || null,
            collaborator: data.colaborador?.nome || null
        };

        res.json({
            success: true,
            data: transformedData
        });
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// POST - Criar novo item
app.post('/api/items', upload.single('image'), async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            categoria_id,
            colaborador_id,
            company,
            location,
            status,
            value,
            brand,
            model,
            serial_number,
            purchase_date,
            warranty_date
        } = req.body;

        // Validação básica - agora aceita categoria_id ou category
        if (!name || (!categoria_id && !category) || !company || !status) {
            return res.status(400).json({
                error: 'Campos obrigatórios: name, categoria_id (ou category), company, status'
            });
        }

        let imageUrl = null;

        // Se há uma imagem, fazer upload para o Supabase Storage
        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname}`;
            try {
                imageUrl = await uploadImageToStorage(req.file, fileName);
            } catch (uploadError) {
                console.error('Erro no upload da imagem:', uploadError);
                return res.status(500).json({
                    error: 'Erro ao fazer upload da imagem',
                    details: uploadError.message
                });
            }
        }

        // Primeiro, criar o item sem o QR code
        const itemData = {
            name: name.trim(),
            description: description?.trim() || null,
            category: category?.trim() || null, // Manter para compatibilidade
            categoria_id: categoria_id || null,
            colaborador_id: colaborador_id || null,
            location: location?.trim() || null,
            status: status.trim(),
            module_type: 'inventory',
            data_type: 'item',
            module_data: {
                company: company.trim(),
                value: value ? parseFloat(value) : null,
                brand: brand?.trim() || null,
                model: model?.trim() || null,
                serial_number: serial_number?.trim() || null,
                purchase_date: purchase_date || null,
                warranty_date: warranty_date || null,
                image: imageUrl
            },
            metadata: {
                created_by: 'system',
                source: 'api'
            }
        };

        console.log('Item data before insert:', JSON.stringify(itemData, null, 2));

        // Inserir o item primeiro para obter o ID
        const { data: insertedItem, error: insertError } = await supabase
            .from('sistemainventario')
            .insert([itemData])
            .select()
            .single();

        if (insertError) {
            console.error('Erro ao criar item:', insertError);
            return res.status(500).json({ 
                error: 'Erro ao criar item',
                details: insertError.message 
            });
        }

        // Agora gerar o QR code com o link do item usando o ID real
        const itemLink = generateItemLink(insertedItem.id);
        console.log('Generated item link for QR Code:', itemLink);
        let qrCodeDataURL = null;
        
        try {
            qrCodeDataURL = await generateQRCodeDataURL(itemLink);
            console.log('Generated QR Code Data URL length:', qrCodeDataURL ? qrCodeDataURL.length : 'null');
        } catch (qrError) {
            console.error('Erro ao gerar QR Code:', qrError);
            // Se falhar ao gerar QR code, ainda retornamos o item criado
            console.warn('Item criado sem QR code devido ao erro:', qrError.message);
        }

        // Atualizar o item com o QR code se foi gerado com sucesso
        if (qrCodeDataURL) {
            const updatedModuleData = {
                ...insertedItem.module_data,
                qr_code: itemLink,
                qr_code_image: qrCodeDataURL
            };

            const { data: updatedItem, error: updateError } = await supabase
                .from('sistemainventario')
                .update({ module_data: updatedModuleData })
                .eq('id', insertedItem.id)
                .select()
                .single();

            if (updateError) {
                console.error('Erro ao atualizar item com QR code:', updateError);
                // Retornar o item original mesmo se a atualização do QR code falhar
                res.status(201).json({
                    success: true,
                    message: 'Item criado com sucesso (QR code não pôde ser adicionado)',
                    data: insertedItem
                });
                return;
            }

            res.status(201).json({
                success: true,
                message: 'Item criado com sucesso',
                data: updatedItem
            });
        } else {
            res.status(201).json({
                success: true,
                message: 'Item criado com sucesso (sem QR code)',
                data: insertedItem
            });
        }
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// PUT - Atualizar item
app.put('/api/items/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            category,
            categoria_id,
            colaborador_id,
            company,
            location,
            status,
            value,
            brand,
            model,
            serial_number,
            purchase_date,
            warranty_date
        } = req.body;

        // Validação básica - agora aceita categoria_id ou category
        if (!name || (!categoria_id && !category) || !company || !status) {
            return res.status(400).json({
                error: 'Campos obrigatórios: name, categoria_id (ou category), company, status'
            });
        }

        // Buscar o item atual para obter a imagem existente
        const { data: currentItem, error: fetchError } = await supabase
            .from('sistemainventario')
            .select('module_data')
            .eq('id', id)
            .eq('module_type', 'inventory')
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({ 
                    error: 'Item não encontrado' 
                });
            }
            console.error('Erro ao buscar item:', fetchError);
            return res.status(500).json({ 
                error: 'Erro ao buscar item',
                details: fetchError.message 
            });
        }

        let imageUrl = currentItem.module_data.image; // Manter imagem existente por padrão

        // Se há uma nova imagem, fazer upload para o Supabase Storage
        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname}`;
            try {
                imageUrl = await uploadImageToStorage(req.file, fileName);
                
                // Opcional: Remover imagem antiga do storage se existir
                if (currentItem.module_data.image) {
                    // Extrair o nome do arquivo da URL antiga
                    const oldFileName = currentItem.module_data.image.split('/').pop();
                    if (oldFileName) {
                        await supabase.storage
                            .from('item-images')
                            .remove([oldFileName]);
                    }
                }
            } catch (uploadError) {
                console.error('Erro no upload da imagem:', uploadError);
                return res.status(500).json({
                    error: 'Erro ao fazer upload da imagem',
                    details: uploadError.message
                });
            }
        }

        const itemData = {
            module_data: {
                name: name.trim(),
                description: description?.trim() || null,
                category: category?.trim() || null,
                company: company.trim(),
                location: location?.trim() || null,
                status: status.trim(),
                value: value ? parseFloat(value) : null,
                brand: brand?.trim() || null,
                model: model?.trim() || null,
                serial_number: serial_number?.trim() || null,
                purchase_date: purchase_date || null,
                warranty_date: warranty_date || null,
                image: imageUrl
            },
            categoria_id: categoria_id || null,
            colaborador_id: colaborador_id || null,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('sistemainventario')
            .update(itemData)
            .eq('id', id)
            .eq('module_type', 'inventory')
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ 
                    error: 'Item não encontrado' 
                });
            }
            console.error('Erro ao atualizar item:', error);
            return res.status(500).json({ 
                error: 'Erro ao atualizar item',
                details: error.message 
            });
        }

        res.json({
            success: true,
            message: 'Item atualizado com sucesso',
            data: data
        });
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// DELETE - Excluir item
app.delete('/api/items/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('sistemainventario')
            .delete()
            .eq('id', id)
            .eq('module_type', 'inventory');

        if (error) {
            console.error('Erro ao excluir item:', error);
            return res.status(500).json({ 
                error: 'Erro ao excluir item',
                details: error.message 
            });
        }

        res.json({
            success: true,
            message: 'Item excluído com sucesso'
        });
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// GET - Estatísticas do inventário
app.get('/api/stats', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sistemainventario')
            .select('module_data')
            .eq('module_type', 'inventory');

        if (error) {
            console.error('Erro ao buscar estatísticas:', error);
            return res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }

        const stats = {
            total: data.length,
            byCategory: {},
            byStatus: {},
            byCompany: {},
            activeItems: data.filter(item => item.module_data?.status === 'ativo').length
        };

        // Contar por categoria
        data.forEach(item => {
            const moduleData = item.module_data || {};
            if (moduleData.category) {
                stats.byCategory[moduleData.category] = (stats.byCategory[moduleData.category] || 0) + 1;
            }
            if (moduleData.status) {
                stats.byStatus[moduleData.status] = (stats.byStatus[moduleData.status] || 0) + 1;
            }
            if (moduleData.company) {
                stats.byCompany[moduleData.company] = (stats.byCompany[moduleData.company] || 0) + 1;
            }
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// GET - Buscar itens com filtros
app.get('/api/search', async (req, res) => {
    try {
        const { q, category, company, status } = req.query;
        
        let query = supabase.from('sistemainventario')
            .select('*')
            .eq('module_type', 'inventory');

        // Aplicar filtros
        if (category && category !== '') {
            query = query.eq('module_data->>category', category);
        }
        
        if (company && company !== '') {
            query = query.eq('module_data->>company', company);
        }
        
        if (status && status !== '') {
            query = query.eq('module_data->>status', status);
        }

        // Busca textual
        if (q && q.trim() !== '') {
            query = query.or(`module_data->>name.ilike.%${q}%,module_data->>description.ilike.%${q}%,module_data->>brand.ilike.%${q}%,module_data->>model.ilike.%${q}%,module_data->>serial_number.ilike.%${q}%`);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error('Erro na busca:', error);
            return res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }

        res.json({
            success: true,
            data: data || [],
            count: data ? data.length : 0
        });
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// ===== ROTAS PARA CATEGORIAS =====

// GET - Listar todas as categorias
app.get('/api/categories', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('categoriassistemainventario')
            .select('*')
            .eq('ativo', true)
            .order('nome', { ascending: true });

        if (error) {
            console.error('Erro ao buscar categorias:', error);
            return res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }

        res.json({
            success: true,
            data: data || []
        });
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// POST - Criar nova categoria
app.post('/api/categories', async (req, res) => {
    try {
        const { nome } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({
                error: 'Nome da categoria é obrigatório'
            });
        }

        const { data, error } = await supabase
            .from('categoriassistemainventario')
            .insert([{ nome: nome.trim() }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(409).json({
                    error: 'Categoria já existe'
                });
            }
            console.error('Erro ao criar categoria:', error);
            return res.status(500).json({ 
                error: 'Erro ao criar categoria',
                details: error.message 
            });
        }

        res.status(201).json({
            success: true,
            data: data
        });
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// ===== ROTAS PARA COLABORADORES =====

// GET - Listar todos os colaboradores
app.get('/api/collaborators', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('colaboradoressistemainventario')
            .select('*')
            .eq('ativo', true)
            .order('nome', { ascending: true });

        if (error) {
            console.error('Erro ao buscar colaboradores:', error);
            return res.status(500).json({ 
                error: 'Erro interno do servidor',
                details: error.message 
            });
        }

        res.json({
            success: true,
            data: data || []
        });
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// POST - Criar novo colaborador
app.post('/api/collaborators', async (req, res) => {
    try {
        const { nome, email, cargo } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({
                error: 'Nome do colaborador é obrigatório'
            });
        }

        const collaboratorData = {
            nome: nome.trim(),
            email: email?.trim() || null,
            cargo: cargo?.trim() || null
        };

        const { data, error } = await supabase
            .from('colaboradoressistemainventario')
            .insert([collaboratorData])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(409).json({
                    error: 'Colaborador já existe'
                });
            }
            console.error('Erro ao criar colaborador:', error);
            return res.status(500).json({ 
                error: 'Erro ao criar colaborador',
                details: error.message 
            });
        }

        res.status(201).json({
            success: true,
            data: data
        });
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// Endpoint para atualizar QR codes existentes
// Endpoint para gerar QR code para um item específico
app.post('/api/items/:id/generate-qr', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔄 Gerando QR code para o item ${id}...`);

        // Buscar o item específico
        const { data: item, error: fetchError } = await supabase
            .from('sistemainventario')
            .select('*')
            .eq('id', id)
            .eq('module_type', 'inventory')
            .single();

        if (fetchError) {
            console.error('Erro ao buscar item:', fetchError);
            return res.status(404).json({ 
                error: 'Item não encontrado',
                details: fetchError.message 
            });
        }

        if (!item) {
            return res.status(404).json({
                error: 'Item não encontrado'
            });
        }

        // Gerar novo link e QR code
        const itemLink = generateItemLink(item.id);
        const newQRCodeDataURL = await generateQRCodeDataURL(itemLink);

        // Atualizar o item no banco
        const updatedModuleData = {
            ...item.module_data,
            qr_code: itemLink,
            qr_code_image: newQRCodeDataURL
        };

        const { error: updateError } = await supabase
            .from('sistemainventario')
            .update({ 
                module_data: updatedModuleData,
                updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

        if (updateError) {
            console.error(`❌ Erro ao atualizar item ${item.id}:`, updateError);
            return res.status(500).json({ 
                error: 'Erro ao atualizar item',
                details: updateError.message 
            });
        }

        console.log(`✅ QR code gerado com sucesso para o item ${item.id}`);
        
        res.json({
            success: true,
            message: 'QR code gerado com sucesso',
            item: {
                id: item.id,
                qr_code: itemLink,
                qr_code_image: newQRCodeDataURL
            }
        });

    } catch (err) {
        console.error('❌ Erro inesperado ao gerar QR code:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

app.post('/api/update-qr-codes', async (req, res) => {
    try {
        console.log('🔄 Iniciando atualização dos QR codes...');
        
        // Buscar todos os itens que possuem QR codes
        const { data: items, error: fetchError } = await supabase
            .from('sistemainventario')
            .select('*')
            .eq('module_type', 'inventory')
            .not('module_data->qr_code', 'is', null);

        if (fetchError) {
            console.error('Erro ao buscar itens:', fetchError);
            return res.status(500).json({ 
                error: 'Erro ao buscar itens',
                details: fetchError.message 
            });
        }

        if (!items || items.length === 0) {
            return res.json({
                success: true,
                message: 'Nenhum item com QR code encontrado',
                updated: 0
            });
        }

        console.log(`📋 Encontrados ${items.length} itens com QR codes`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        const errors = [];

        for (const item of items) {
            try {
                const currentQRCode = item.module_data?.qr_code;
                
                // Verificar se o QR code já está no formato correto (contém URL)
                if (currentQRCode && currentQRCode.includes('view-item.html')) {
                    console.log(`⏭️  Item ${item.id} já possui QR code atualizado`);
                    skippedCount++;
                    continue;
                }

                // Gerar novo link e QR code
                const itemLink = generateItemLink(item.id);
                const newQRCodeDataURL = await generateQRCodeDataURL(itemLink);

                // Atualizar o item no banco
                const updatedModuleData = {
                    ...item.module_data,
                    qr_code: itemLink,
                    qr_code_image: newQRCodeDataURL
                };

                const { error: updateError } = await supabase
                    .from('sistemainventario')
                    .update({ 
                        module_data: updatedModuleData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', item.id);

                if (updateError) {
                    console.error(`❌ Erro ao atualizar item ${item.id}:`, updateError);
                    errors.push(`Item ${item.id}: ${updateError.message}`);
                } else {
                    console.log(`✅ Item ${item.id} atualizado com sucesso`);
                    updatedCount++;
                }

            } catch (itemError) {
                console.error(`❌ Erro ao processar item ${item.id}:`, itemError);
                errors.push(`Item ${item.id}: ${itemError.message}`);
            }
        }

        const result = {
            success: true,
            message: `Atualização concluída: ${updatedCount} atualizados, ${skippedCount} já estavam corretos`,
            updated: updatedCount,
            skipped: skippedCount,
            total: items.length
        };

        if (errors.length > 0) {
            result.errors = errors;
            result.hasErrors = true;
        }

        console.log('🎉 Atualização dos QR codes concluída:', result);
        res.json(result);

    } catch (err) {
        console.error('❌ Erro inesperado na atualização dos QR codes:', err);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: err.message 
        });
    }
});

// GET - Endpoint para servir QR Code como imagem
// Middleware de tratamento de erros 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Rota não encontrada',
        path: req.path 
    });
});

// Middleware de tratamento de erros globais
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`🔗 Supabase URL: ${supabaseUrl}`);
    console.log(`🌟 Sistema de Inventário - Grupo AreLuna`);
});

// Tratamento de sinais para encerramento gracioso
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, encerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT, encerrando servidor...');
    process.exit(0);
});

module.exports = app;