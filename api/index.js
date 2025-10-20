const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const multer = require('multer');
const QRCode = require('qrcode');
require('dotenv').config();

// Função para sanitizar nomes de arquivos
function sanitizeFileName(filename) {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');
}

const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requirePermission, requireRole, requireAdmin, getCurrentUser } = require('./middleware/auth');

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
        fileSize: 10 * 1024 * 1024, // 10MB - mesmo limite do Express
        fieldSize: 10 * 1024 * 1024, // 10MB para campos de texto
        fields: 50, // Máximo de 50 campos
        files: 15 // Máximo de 15 arquivos
    },
    fileFilter: (req, file, cb) => {
        console.log(`📁 Processando arquivo: ${file.originalname}, tipo: ${file.mimetype}, tamanho estimado: ${file.size || 'desconhecido'}`);
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos de imagem e PDF são permitidos'), false);
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
    // Sempre usar o domínio de produção
    return `https://erp.institutoareluna.pt/view-item.html?id=${itemId}`;
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

// Função para fazer upload de PDF para o Supabase Storage
async function uploadPdfToStorage(file, fileName) {
    try {
        const { data, error } = await supabaseAdmin.storage
            .from('item-pdfs')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            throw error;
        }

        // Obter URL pública do PDF
        const { data: publicUrlData } = supabaseAdmin.storage
            .from('item-pdfs')
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    } catch (error) {
        console.error('Erro ao fazer upload do PDF:', error);
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

// Middleware condicional para parsing JSON/URL - apenas para rotas que não usam multipart
app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    
    // Se não for multipart/form-data, aplicar parsing JSON/URL
    if (!contentType.includes('multipart/form-data')) {
        express.json({ limit: '10mb' })(req, res, (err) => {
            if (err) return next(err);
            express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
        });
    } else {
        // Para multipart, pular o parsing JSON/URL
        next();
    }
});

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Endpoint para autenticação e informações do usuário
app.get('/api/auth/me', authenticateToken, getCurrentUser);

// Rotas da API

// GET -// Rota para listar todos os itens
app.get('/api/items', authenticateToken, requirePermission('inventory', 'read'), async (req, res) => {    try {
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
            limit = 100
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
        const limitNum = Math.min(1000, Math.max(1, parseInt(limit))); // Máximo 1000 itens por página
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

        // Buscar categorias e colaboradores separadamente
        const categoryIds = [...new Set((data || []).map(item => item.categoria_id).filter(Boolean))];
        const collaboratorIds = [...new Set((data || []).map(item => item.colaborador_id).filter(Boolean))];

        let categories = {};
        let collaborators = {};

        if (categoryIds.length > 0) {
            const { data: categoryData, error: categoryError } = await supabase
                .from('categoriassistemainventario')
                .select('id, nome')
                .in('id', categoryIds);
            
            if (categoryError) {
                console.error('Erro ao buscar categorias:', categoryError);
            } else {
                categories = (categoryData || []).reduce((acc, cat) => {
                    acc[cat.id] = cat.nome;
                    return acc;
                }, {});
            }
        }

        if (collaboratorIds.length > 0) {
            const { data: collaboratorData } = await supabase
                .from('colaboradoressistemainventario')
                .select('id, nome')
                .in('id', collaboratorIds);
            
            collaborators = (collaboratorData || []).reduce((acc, col) => {
                acc[col.id] = col.nome;
                return acc;
            }, {});
        }

        // Calcular informações de paginação
        const totalPages = Math.ceil(count / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        res.json({
            success: true,
            data: (data || []).map(item => ({
                ...item,
                category: categories[item.categoria_id] || null,
                collaborator: collaborators[item.colaborador_id] || null
            })),
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
app.get('/api/items/:id', authenticateToken, requirePermission('inventory', 'read'), async (req, res) => {
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
app.post('/api/items', authenticateToken, requirePermission('inventory', 'create'), upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 10 } // Permitir até 10 PDFs
]), async (req, res) => {
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
        let pdfUrls = [];

        // Se há uma imagem, fazer upload para o Supabase Storage
        if (req.files && req.files.image && req.files.image[0]) {
            const imageFile = req.files.image[0];
            const sanitizedName = sanitizeFileName(imageFile.originalname);
            const fileName = `${Date.now()}-${sanitizedName}`;
            try {
                imageUrl = await uploadImageToStorage(imageFile, fileName);
            } catch (uploadError) {
                console.error('Erro no upload da imagem:', uploadError);
                return res.status(500).json({
                    error: 'Erro ao fazer upload da imagem',
                    details: uploadError.message
                });
            }
        }

        // Se há PDFs, fazer upload para o Supabase Storage
        if (req.files && req.files.pdf && req.files.pdf.length > 0) {
            for (const pdfFile of req.files.pdf) {
                const sanitizedName = sanitizeFileName(pdfFile.originalname);
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedName}`;
                try {
                    const pdfUrl = await uploadPdfToStorage(pdfFile, fileName);
                    pdfUrls.push(pdfUrl);
                } catch (uploadError) {
                    console.error('Erro no upload do PDF:', uploadError);
                    return res.status(500).json({
                        error: 'Erro ao fazer upload do PDF',
                        details: uploadError.message
                    });
                }
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
            pdfs: pdfUrls, // Novo campo para múltiplos PDFs
            module_data: {
                company: company.trim(),
                value: value ? parseFloat(value) : null,
                brand: brand?.trim() || null,
                model: model?.trim() || null,
                serial_number: serial_number?.trim() || null,
                purchase_date: purchase_date || null,
                warranty_date: warranty_date || null,
                image: imageUrl,
                pdf: pdfUrls.length > 0 ? pdfUrls[0] : null // Manter compatibilidade com PDF único
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
app.put('/api/items/:id', authenticateToken, requirePermission('inventory', 'manage'), upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 10 } // Permitir até 10 PDFs
]), async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            description, 
            category, 
            company, 
            location, 
            status, 
            value, 
            brand, 
            model, 
            serial_number, 
            purchase_date, 
            warranty_date,
            categoria_id,
            colaborador_id
        } = req.body;

        // Debug logs
        console.log('PUT /api/items/:id - Dados recebidos:');
        console.log('Files:', req.files);
        console.log('Body:', req.body);
        console.log('PDFs recebidos:', req.files?.pdf?.length || 0);
        console.log('removePdfs recebido:', req.body.removePdfs);

        // Validação básica - agora aceita categoria_id ou category
        if (!name || (!categoria_id && !category) || !company || !status) {
            return res.status(400).json({
                error: 'Campos obrigatórios: name, categoria_id (ou category), company, status'
            });
        }

        // Buscar o item atual para obter a imagem e PDFs existentes
        const { data: currentItem, error: fetchError } = await supabase
            .from('sistemainventario')
            .select('module_data, pdfs')
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
        let pdfUrls = Array.isArray(currentItem.pdfs) ? [...currentItem.pdfs] : []; // Clonar array de PDFs existentes

        // Migrar PDF do campo antigo para o novo array se necessário
        if (pdfUrls.length === 0 && currentItem.module_data.pdf) {
            pdfUrls = [currentItem.module_data.pdf];
            console.log('Migrando PDF do campo antigo:', currentItem.module_data.pdf);
        }

        console.log('PDFs existentes no item:', pdfUrls);
        console.log('Tamanho inicial do array pdfUrls:', pdfUrls.length);

        // Se há uma nova imagem, fazer upload para o Supabase Storage
        if (req.files && req.files.image && req.files.image[0]) {
            const sanitizedName = sanitizeFileName(req.files.image[0].originalname);
            const fileName = `${Date.now()}-${sanitizedName}`;
            try {
                imageUrl = await uploadImageToStorage(req.files.image[0], fileName);
                
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

        // Debug: Verificar o que está sendo recebido
        console.log('req.files:', req.files);
        console.log('req.files.pdf:', req.files ? req.files.pdf : 'undefined');
        
        // Se há novos PDFs, fazer upload para o Supabase Storage
        if (req.files && req.files.pdf && req.files.pdf.length > 0) {
            console.log('Fazendo upload de novos PDFs:', req.files.pdf.length);
            console.log('Array pdfUrls antes do upload:', pdfUrls);
            for (const pdfFile of req.files.pdf) {
                const sanitizedName = sanitizeFileName(pdfFile.originalname);
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedName}`;
                try {
                    const newPdfUrl = await uploadPdfToStorage(pdfFile, fileName);
                    console.log('PDF uploaded:', newPdfUrl);
                    pdfUrls.push(newPdfUrl);
                    console.log('Array pdfUrls após adicionar PDF:', pdfUrls);
                } catch (uploadError) {
                    console.error('Erro no upload do PDF:', uploadError);
                    return res.status(500).json({
                        error: 'Erro ao fazer upload do PDF',
                        details: uploadError.message
                    });
                }
            }
            console.log('Array pdfUrls final após todos os uploads:', pdfUrls);
        }

        // Processar remoção de PDFs existentes se especificado
        const removePdfs = req.body.removePdfs ? JSON.parse(req.body.removePdfs) : [];
        console.log('PDFs para remover:', removePdfs);
        if (removePdfs.length > 0) {
            // Remover PDFs do storage
            for (const pdfUrl of removePdfs) {
                try {
                    const fileName = pdfUrl.split('/').pop();
                    if (fileName) {
                        await supabase.storage
                            .from('item-pdfs')
                            .remove([fileName]);
                        console.log('PDF removido do storage:', fileName);
                    }
                } catch (error) {
                    console.warn('Erro ao remover PDF do storage:', error);
                }
            }
            // Remover PDFs da lista
            pdfUrls = pdfUrls.filter(url => !removePdfs.includes(url));
            console.log('PDFs após remoção:', pdfUrls);
        }

        const itemData = {
            pdfs: pdfUrls, // Novo campo para múltiplos PDFs
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
                image: imageUrl,
                pdf: pdfUrls.length > 0 ? pdfUrls[0] : null // Manter compatibilidade com PDF único
            },
            categoria_id: categoria_id || null,
            colaborador_id: colaborador_id || null,
            updated_at: new Date().toISOString()
        };

        console.log('Dados finais para atualização:', JSON.stringify(itemData, null, 2));

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

// Função para excluir arquivo do Supabase Storage
async function deleteFileFromStorage(bucket, filePath) {
    try {
        if (!filePath) return { success: true };
        
        // Extrair apenas o nome do arquivo da URL
        const fileName = filePath.split('/').pop();
        
        const { error } = await supabase.storage
            .from(bucket)
            .remove([fileName]);
            
        if (error) {
            console.error(`Erro ao excluir arquivo ${fileName} do bucket ${bucket}:`, error);
            return { success: false, error };
        }
        
        console.log(`Arquivo ${fileName} excluído com sucesso do bucket ${bucket}`);
        return { success: true };
    } catch (error) {
        console.error('Erro inesperado ao excluir arquivo:', error);
        return { success: false, error };
    }
}

// DELETE - Excluir item
app.delete('/api/items/:id', authenticateToken, requirePermission('inventory', 'delete'), async (req, res) => {
    try {
        const { id } = req.params;

        // Primeiro, buscar os dados do item para obter URLs dos arquivos
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

        // Excluir arquivos associados se existirem
        const deletePromises = [];
        
        if (item.module_data && item.module_data.image) {
            deletePromises.push(deleteFileFromStorage('item-images', item.module_data.image));
        }
        
        if (item.module_data && item.module_data.pdf) {
            deletePromises.push(deleteFileFromStorage('item-pdfs', item.module_data.pdf));
        }

        // Aguardar exclusão dos arquivos (não bloquear se houver erro)
        if (deletePromises.length > 0) {
            const results = await Promise.allSettled(deletePromises);
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Erro ao excluir arquivo ${index}:`, result.reason);
                }
            });
        }

        // Excluir o registro do banco de dados
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
            message: 'Item e arquivos associados excluídos com sucesso'
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
app.get('/api/stats', authenticateToken, requirePermission('inventory', 'read'), async (req, res) => {
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
app.get('/api/search', authenticateToken, requirePermission('inventory', 'read'), async (req, res) => {
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
app.get('/api/categories', authenticateToken, requirePermission('inventory', 'read'), async (req, res) => {
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
app.post('/api/categories', authenticateToken, requirePermission('inventory', 'manage'), async (req, res) => {
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
app.get('/api/collaborators', authenticateToken, requirePermission('inventory', 'read'), async (req, res) => {
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
app.post('/api/collaborators', authenticateToken, requirePermission('inventory', 'manage'), async (req, res) => {
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

// ========== PRINT QUEUE API ENDPOINTS ==========

// Endpoint para adicionar item à fila de impressão
app.post('/api/print/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { priority = 1, qrCodeSize = '25mm' } = req.body;

        // Buscar dados do item
        const { data: item, error: itemError } = await supabase
            .from('sistemainventario')
            .select('*')
            .eq('id', itemId)
            .eq('module_type', 'inventory')
            .single();

        if (itemError || !item) {
            return res.status(404).json({
                success: false,
                error: 'Item não encontrado'
            });
        }

        // Verificar se já existe um job pendente para este item
        const { data: existingJob } = await supabase
            .from('print_queue')
            .select('id')
            .eq('item_id', itemId)
            .eq('status', 'pending')
            .single();

        if (existingJob) {
            return res.json({
                success: true,
                message: 'Item já está na fila de impressão',
                job_id: existingJob.id
            });
        }

        // Gerar URL simples para o QR code
        const itemUrl = generateItemLink(itemId);

        // Adicionar à fila de impressão
        const { data: printJob, error: printError } = await supabase
            .from('print_queue')
            .insert({
                item_id: itemId,
                qr_code_data: itemUrl, // Usar URL simples em vez da imagem base64
                item_name: item.name || item.module_data?.name,
                item_code: item.code || item.id,
                priority: priority,
                status: 'pending',
                qr_code_size: qrCodeSize // Adicionar o tamanho do QR code
            })
            .select()
            .single();

        if (printError) {
            console.error('Erro ao adicionar à fila de impressão:', printError);
            return res.status(500).json({
                success: false,
                error: 'Erro ao adicionar à fila de impressão',
                details: printError.message
            });
        }

        console.log(`Item ${item.name || item.module_data?.name} adicionado à fila de impressão com tamanho QR: ${qrCodeSize}`);
        
        res.json({
            success: true,
            message: 'Item enviado para impressão',
            job_id: printJob.id,
            item_name: item.name || item.module_data?.name,
            qr_code_size: qrCodeSize
        });

    } catch (error) {
        console.error('Erro no endpoint de impressão:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// Endpoint para consultar status da fila de impressão
app.get('/api/print-status', async (req, res) => {
    try {
        const { job_id, item_id, status } = req.query;
        
        let query = supabase.from('print_queue').select('*');
        
        if (job_id) {
            query = query.eq('id', job_id);
        } else if (item_id) {
            query = query.eq('item_id', item_id);
        } else if (status) {
            query = query.eq('status', status);
        }
        
        query = query.order('created_at', { ascending: false });
        
        const { data: jobs, error } = await query;
        
        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao consultar fila de impressão',
                details: error.message
            });
        }
        
        res.json({
            success: true,
            jobs: jobs || []
        });
        
    } catch (error) {
        console.error('Erro ao consultar status da impressão:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// Endpoint para atualizar status de job de impressão (usado pelo agente local)
app.put('/api/print-status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { status, error_message } = req.body;
        
        const updateData = {
            status,
            ...(status === 'printing' && { started_at: new Date().toISOString() }),
            ...(status === 'completed' && { completed_at: new Date().toISOString() }),
            ...(status === 'failed' && { error_message })
        };
        
        const { data, error } = await supabase
            .from('print_queue')
            .update(updateData)
            .eq('id', jobId)
            .select()
            .single();
            
        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao atualizar status',
                details: error.message
            });
        }
        
        console.log(`Status do job ${jobId} atualizado para: ${status}`);
        
        res.json({
            success: true,
            job: data
        });
        
    } catch (error) {
        console.error('Erro ao atualizar status do job:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// Endpoint para monitorar status de impressão em tempo real (Server-Sent Events)
app.get('/api/print-status/stream/:jobId', async (req, res) => {
    const { jobId } = req.params;
    
    // Configurar headers para Server-Sent Events
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    try {
        // Enviar status inicial
        const { data: initialJob, error: initialError } = await supabase
            .from('print_queue')
            .select('*')
            .eq('id', jobId)
            .single();

        if (initialError) {
            res.write(`data: ${JSON.stringify({ error: 'Job não encontrado' })}\n\n`);
            res.end();
            return;
        }

        res.write(`data: ${JSON.stringify(initialJob)}\n\n`);

        // Se o job já está completo ou falhou, encerrar stream
        if (initialJob.status === 'completed' || initialJob.status === 'failed') {
            res.end();
            return;
        }

        // Configurar subscription para mudanças no job específico
        const subscription = supabase
            .channel(`print_job_${jobId}`)
            .on('postgres_changes', 
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'print_queue',
                    filter: `id=eq.${jobId}`
                }, 
                (payload) => {
                    res.write(`data: ${JSON.stringify(payload.new)}\n\n`);
                    
                    // Encerrar stream se job completou ou falhou
                    if (payload.new.status === 'completed' || payload.new.status === 'failed') {
                        subscription.unsubscribe();
                        res.end();
                    }
                }
            )
            .subscribe();

        // Cleanup quando cliente desconectar
        req.on('close', () => {
            subscription.unsubscribe();
            res.end();
        });

        // Timeout após 5 minutos
        setTimeout(() => {
            subscription.unsubscribe();
            res.end();
        }, 5 * 60 * 1000);

    } catch (error) {
        console.error('Erro no stream de status:', error);
        res.write(`data: ${JSON.stringify({ error: 'Erro interno do servidor' })}\n\n`);
        res.end();
    }
});

// Endpoint para obter histórico de impressões
app.get('/api/print-history', async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('print_queue')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: jobs, error } = await query;

        if (error) {
            throw error;
        }

        // Contar total de registros
        let countQuery = supabase
            .from('print_queue')
            .select('*', { count: 'exact', head: true });

        if (status) {
            countQuery = countQuery.eq('status', status);
        }

        const { count, error: countError } = await countQuery;

        if (countError) {
            throw countError;
        }

        res.json({
            success: true,
            data: jobs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });

    } catch (error) {
        console.error('Erro ao buscar histórico de impressões:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar histórico de impressões'
        });
    }
});

// Endpoint para estatísticas de impressão
app.get('/api/print-stats', async (req, res) => {
    try {
        const { data: stats, error } = await supabase
            .from('print_queue')
            .select('status')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24h

        if (error) {
            throw error;
        }

        const statusCount = stats.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
        }, {});

        // Buscar total geral
        const { count: totalJobs, error: totalError } = await supabase
            .from('print_queue')
            .select('*', { count: 'exact', head: true });

        if (totalError) {
            throw totalError;
        }

        res.json({
            success: true,
            data: {
                last24h: statusCount,
                total: totalJobs,
                pending: statusCount.pending || 0,
                processing: statusCount.processing || 0,
                completed: statusCount.completed || 0,
                failed: statusCount.failed || 0
            }
        });

    } catch (error) {
        console.error('Erro ao buscar estatísticas de impressão:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas de impressão'
        });
    }
});

// Endpoint para cancelar job de impressão
app.post('/api/print-cancel/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        // Verificar se o job existe e pode ser cancelado
        const { data: job, error: fetchError } = await supabase
            .from('print_queue')
            .select('*')
            .eq('id', jobId)
            .single();
            
        if (fetchError || !job) {
            return res.status(404).json({
                success: false,
                error: 'Job não encontrado'
            });
        }
        
        // Verificar se o job pode ser cancelado (apenas pending ou processing)
        if (!['pending', 'processing'].includes(job.status)) {
            return res.status(400).json({
                success: false,
                error: `Job não pode ser cancelado. Status atual: ${job.status}`
            });
        }
        
        // Atualizar status para cancelled
        const { data: updatedJob, error: updateError } = await supabase
            .from('print_queue')
            .update({
                status: 'failed',
                error_message: 'Cancelado pelo usuário',
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId)
            .select()
            .single();
            
        if (updateError) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao cancelar job',
                details: updateError.message
            });
        }
        
        console.log(`Job ${jobId} cancelado pelo usuário`);
        
        res.json({
            success: true,
            message: 'Job cancelado com sucesso',
            job: updatedJob
        });
        
    } catch (error) {
        console.error('Erro ao cancelar job:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// Endpoint para limpar jobs antigos da fila
app.delete('/api/print-cleanup', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        
        const { data, error } = await supabase
            .from('print_queue')
            .delete()
            .in('status', ['completed', 'failed'])
            .lt('created_at', cutoffDate.toISOString())
            .select();
            
        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao limpar fila',
                details: error.message
            });
        }
        
        res.json({
            success: true,
            message: `${data?.length || 0} jobs antigos removidos da fila`
        });
        
    } catch (error) {
        console.error('Erro ao limpar fila:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

// Endpoint para criar a tabela print_queue
app.post('/api/setup-print-table', async (req, res) => {
    try {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS print_queue (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                item_id UUID NOT NULL,
                qr_code_data TEXT NOT NULL,
                item_name TEXT NOT NULL,
                item_code TEXT,
                priority INTEGER DEFAULT 1,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                qr_code_size TEXT DEFAULT '128px' CHECK (qr_code_size IN ('10px', '25px', '50px', '75px', '128px')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                processed_at TIMESTAMP WITH TIME ZONE
            );

            -- Adicionar coluna qr_code_size se não existir
            ALTER TABLE print_queue ADD COLUMN IF NOT EXISTS qr_code_size TEXT DEFAULT '128px' CHECK (qr_code_size IN ('10px', '25px', '50px', '75px', '128px'));

            -- Criar índices para melhor performance
            CREATE INDEX IF NOT EXISTS idx_print_queue_status ON print_queue(status);
            CREATE INDEX IF NOT EXISTS idx_print_queue_created_at ON print_queue(created_at);
            CREATE INDEX IF NOT EXISTS idx_print_queue_item_id ON print_queue(item_id);

            -- Habilitar RLS (Row Level Security)
            ALTER TABLE print_queue ENABLE ROW LEVEL SECURITY;

            -- Criar política para permitir acesso completo ao service role
            DROP POLICY IF EXISTS "Enable all access for service role" ON print_queue;
            CREATE POLICY "Enable all access for service role" ON print_queue
                FOR ALL USING (true);
        `;

        // Executar o SQL usando o service role
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
            sql: createTableSQL
        });

        if (error) {
            // Se a função exec_sql não existir, tentar criar a tabela diretamente
            console.log('Tentando criar tabela usando método alternativo...');
            
            // Usar uma abordagem mais simples
            const { error: tableError } = await supabaseAdmin
                .from('print_queue')
                .select('id')
                .limit(1);

            if (tableError && tableError.code === '42P01') {
                // Tabela não existe, retornar instruções para criação manual
                return res.json({
                    success: false,
                    message: 'Tabela print_queue não existe. Execute o SQL manualmente no Supabase Dashboard.',
                    sql: createTableSQL,
                    instructions: [
                        '1. Acesse o Supabase Dashboard',
                        '2. Vá para SQL Editor',
                        '3. Execute o SQL fornecido',
                        '4. Tente novamente este endpoint'
                    ]
                });
            }
        }

        res.json({
            success: true,
            message: 'Tabela print_queue criada com sucesso!',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erro ao criar tabela print_queue:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message,
            sql: `
                CREATE TABLE IF NOT EXISTS print_queue (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    item_id UUID NOT NULL,
                    qr_code_data TEXT NOT NULL,
                    item_name TEXT NOT NULL,
                    item_code TEXT,
                    priority INTEGER DEFAULT 1,
                    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
                    error_message TEXT,
                    retry_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    processed_at TIMESTAMP WITH TIME ZONE
                );
            `
        });
    }
});

// =====================================================
// ENDPOINTS DE MÓDULOS DO ERP
// =====================================================

// GET - Listar todos os módulos disponíveis no sistema
app.get('/api/modules', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('modules')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Erro ao buscar módulos:', error);
            return res.status(500).json({ error: 'Erro ao buscar módulos' });
        }

        res.json({ success: true, modules: data });
    } catch (error) {
        console.error('Erro ao buscar módulos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET - Listar módulos acessíveis pelo usuário atual
app.get('/api/modules/available', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Usar a função SQL para obter módulos acessíveis
        const { data, error } = await supabaseAdmin.rpc('get_user_accessible_modules', {
            p_user_id: userId
        });

        if (error) {
            console.error('Erro ao buscar módulos acessíveis:', error);
            return res.status(500).json({ error: 'Erro ao buscar módulos acessíveis' });
        }

        res.json({ success: true, modules: data || [] });
    } catch (error) {
        console.error('Erro ao buscar módulos acessíveis:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET - Verificar se usuário tem acesso a um módulo específico
app.get('/api/modules/:moduleCode/check-access', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { moduleCode } = req.params;

        const { data, error } = await supabaseAdmin.rpc('user_has_module_access', {
            p_user_id: userId,
            p_module_code: moduleCode
        });

        if (error) {
            console.error('Erro ao verificar acesso ao módulo:', error);
            return res.status(500).json({ error: 'Erro ao verificar acesso' });
        }

        res.json({ success: true, hasAccess: data });
    } catch (error) {
        console.error('Erro ao verificar acesso ao módulo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST - Criar novo módulo (apenas admin)
app.post('/api/modules', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { code, name, description, icon, emoji, color, route, display_order } = req.body;

        if (!code || !name) {
            return res.status(400).json({ error: 'Código e nome são obrigatórios' });
        }

        const { data, error } = await supabaseAdmin
            .from('modules')
            .insert([{
                code,
                name,
                description,
                icon,
                emoji,
                color,
                route,
                display_order: display_order || 0
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar módulo:', error);
            return res.status(500).json({ error: 'Erro ao criar módulo' });
        }

        res.json({ success: true, module: data });
    } catch (error) {
        console.error('Erro ao criar módulo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT - Atualizar módulo (apenas admin)
app.put('/api/modules/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon, emoji, color, route, display_order, is_active } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (icon !== undefined) updateData.icon = icon;
        if (emoji !== undefined) updateData.emoji = emoji;
        if (color !== undefined) updateData.color = color;
        if (route !== undefined) updateData.route = route;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { data, error } = await supabaseAdmin
            .from('modules')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar módulo:', error);
            return res.status(500).json({ error: 'Erro ao atualizar módulo' });
        }

        res.json({ success: true, module: data });
    } catch (error) {
        console.error('Erro ao atualizar módulo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE - Deletar módulo (apenas admin)
app.delete('/api/modules/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('modules')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar módulo:', error);
            return res.status(500).json({ error: 'Erro ao deletar módulo' });
        }

        res.json({ success: true, message: 'Módulo deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar módulo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// =====================================================
// ENDPOINTS DE GERENCIAMENTO DE ACESSO A MÓDULOS
// =====================================================

// GET - Listar acessos de um usuário específico (apenas admin)
app.get('/api/modules/access/user/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const { data, error } = await supabaseAdmin
            .from('user_module_access')
            .select(`
                *,
                modules (
                    id,
                    code,
                    name,
                    icon,
                    emoji,
                    color
                )
            `)
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) {
            console.error('Erro ao buscar acessos do usuário:', error);
            return res.status(500).json({ error: 'Erro ao buscar acessos' });
        }

        res.json({ success: true, accesses: data });
    } catch (error) {
        console.error('Erro ao buscar acessos do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST - Conceder acesso a módulo para usuário (apenas admin)
app.post('/api/modules/access/grant', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { user_id, module_id, expires_at } = req.body;
        const grantedBy = req.user.id;

        if (!user_id || !module_id) {
            return res.status(400).json({ error: 'user_id e module_id são obrigatórios' });
        }

        // Verificar se o acesso já existe
        const { data: existing } = await supabaseAdmin
            .from('user_module_access')
            .select('id')
            .eq('user_id', user_id)
            .eq('module_id', module_id)
            .single();

        if (existing) {
            // Atualizar acesso existente
            const { data, error } = await supabaseAdmin
                .from('user_module_access')
                .update({
                    is_active: true,
                    granted_by: grantedBy,
                    granted_at: new Date().toISOString(),
                    expires_at: expires_at || null
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                console.error('Erro ao atualizar acesso:', error);
                return res.status(500).json({ error: 'Erro ao atualizar acesso' });
            }

            return res.json({ success: true, access: data, message: 'Acesso atualizado com sucesso' });
        }

        // Criar novo acesso
        const { data, error } = await supabaseAdmin
            .from('user_module_access')
            .insert([{
                user_id,
                module_id,
                granted_by: grantedBy,
                expires_at: expires_at || null
            }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao conceder acesso:', error);
            return res.status(500).json({ error: 'Erro ao conceder acesso' });
        }

        res.json({ success: true, access: data, message: 'Acesso concedido com sucesso' });
    } catch (error) {
        console.error('Erro ao conceder acesso:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE - Revogar acesso a módulo (apenas admin)
app.delete('/api/modules/access/revoke', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { user_id, module_id } = req.body;

        if (!user_id || !module_id) {
            return res.status(400).json({ error: 'user_id e module_id são obrigatórios' });
        }

        const { error } = await supabaseAdmin
            .from('user_module_access')
            .update({ is_active: false })
            .eq('user_id', user_id)
            .eq('module_id', module_id);

        if (error) {
            console.error('Erro ao revogar acesso:', error);
            return res.status(500).json({ error: 'Erro ao revogar acesso' });
        }

        res.json({ success: true, message: 'Acesso revogado com sucesso' });
    } catch (error) {
        console.error('Erro ao revogar acesso:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET - Listar todos os usuários com seus acessos (apenas admin)
app.get('/api/modules/access/all-users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Buscar todos os perfis de usuários
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name')
            .order('full_name');

        if (profilesError) {
            console.error('Erro ao buscar perfis:', profilesError);
            return res.status(500).json({ error: 'Erro ao buscar usuários' });
        }

        // Buscar acessos de cada usuário
        const usersWithAccess = await Promise.all(
            profiles.map(async (profile) => {
                const { data: accesses } = await supabaseAdmin
                    .from('user_module_access')
                    .select(`
                        *,
                        modules (
                            id,
                            code,
                            name,
                            icon,
                            emoji,
                            color
                        )
                    `)
                    .eq('user_id', profile.id)
                    .eq('is_active', true);

                return {
                    ...profile,
                    module_accesses: accesses || []
                };
            })
        );

        res.json({ success: true, users: usersWithAccess });
    } catch (error) {
        console.error('Erro ao buscar usuários com acessos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});


// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware para capturar erros do multer
app.use((error, req, res, next) => {
    console.log('🚨 Erro capturado no middleware:', {
        name: error.name,
        message: error.message,
        code: error.code,
        type: error.type,
        field: error.field,
        stack: error.stack?.substring(0, 500)
    });
    
    if (error instanceof multer.MulterError) {
        console.log('📁 Erro específico do Multer:', {
            code: error.code,
            field: error.field,
            message: error.message
        });
        
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(413).json({ 
                    error: 'Arquivo muito grande', 
                    details: `Tamanho máximo permitido: 10MB` 
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(413).json({ 
                    error: 'Muitos arquivos', 
                    details: 'Máximo de 15 arquivos permitidos' 
                });
            case 'LIMIT_FIELD_COUNT':
                return res.status(413).json({ 
                    error: 'Muitos campos', 
                    details: 'Máximo de 50 campos permitidos' 
                });
            case 'LIMIT_FIELD_SIZE':
                return res.status(413).json({ 
                    error: 'Campo muito grande', 
                    details: 'Tamanho máximo do campo: 10MB' 
                });
            default:
                return res.status(400).json({ 
                    error: 'Erro no upload', 
                    details: error.message 
                });
        }
    }
    
    if (error.type === 'entity.parse.failed') {
        console.log('🔍 Erro de parsing detectado:', {
            message: error.message,
            body: req.body ? 'Body presente' : 'Body ausente',
            contentType: req.headers['content-type'],
            contentLength: req.headers['content-length']
        });
        
        return res.status(400).json({ 
            error: 'Erro ao processar dados', 
            details: 'Falha no parsing dos dados enviados. Verifique o formato dos arquivos.' 
        });
    }
    
    next(error);
});

// Rota principal - servir dashboard.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// GET - Endpoint para servir QR Code como imagem
// Middleware de tratamento de erros 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Rota não encontrada',
        path: req.path 
    });
});

// =====================================================
// PROSTORAL - API ENDPOINTS
// =====================================================

// ==================== CLIENTES ====================

// GET - Listar todos os clientes
app.get('/api/prostoral/clients', authenticateToken, async (req, res) => {
    try {
        const { search, is_active } = req.query;
        
        let query = supabaseAdmin
            .from('prostoral_clients')
            .select('*')
            .order('name', { ascending: true });
        
        if (search) {
            query = query.or(`name.ilike.%${search}%,clinic_name.ilike.%${search}%,dentist_name.ilike.%${search}%`);
        }
        
        if (is_active !== undefined) {
            query = query.eq('is_active', is_active === 'true');
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        res.json({ success: true, clients: data });
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Buscar cliente por ID
app.get('/api/prostoral/clients/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_clients')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, client: data });
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST - Criar novo cliente
app.post('/api/prostoral/clients', authenticateToken, async (req, res) => {
    try {
        const clientData = {
            ...req.body,
            tenant_id: req.user.tenant_id || '00000000-0000-0000-0000-000000000002',
            created_by: req.user.id
        };
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_clients')
            .insert([clientData])
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, client: data });
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT - Atualizar cliente
app.put('/api/prostoral/clients/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const clientData = {
            ...req.body,
            updated_by: req.user.id
        };
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_clients')
            .update(clientData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, client: data });
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Desativar cliente
app.delete('/api/prostoral/clients/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_clients')
            .update({ is_active: false })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, client: data });
    } catch (error) {
        console.error('Erro ao desativar cliente:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Estatísticas do cliente
app.get('/api/prostoral/clients/:id/stats', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabaseAdmin
            .rpc('get_client_statistics', { p_client_id: id });
        
        if (error) throw error;
        
        res.json({ success: true, stats: data[0] });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ESTOQUE ====================

// GET - Listar estoque
app.get('/api/prostoral/inventory', authenticateToken, async (req, res) => {
    try {
        const { category, search, low_stock } = req.query;
        
        let query = supabaseAdmin
            .from('prostoral_inventory')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });
        
        if (category) {
            query = query.eq('category', category);
        }
        
        if (search) {
            query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`);
        }
        
        if (low_stock === 'true') {
            query = query.filter('quantity', 'lte', 'min_stock');
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        res.json({ success: true, items: data });
    } catch (error) {
        console.error('Erro ao buscar estoque:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST - Adicionar item ao estoque
app.post('/api/prostoral/inventory', authenticateToken, async (req, res) => {
    try {
        const itemData = {
            ...req.body,
            tenant_id: req.user.tenant_id || '00000000-0000-0000-0000-000000000002',
            created_by: req.user.id
        };
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_inventory')
            .insert([itemData])
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, item: data });
    } catch (error) {
        console.error('Erro ao criar item:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT - Atualizar item do estoque
app.put('/api/prostoral/inventory/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const itemData = {
            ...req.body,
            updated_by: req.user.id
        };
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_inventory')
            .update(itemData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, item: data });
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST - Registrar movimentação de estoque
app.post('/api/prostoral/inventory/:id/movement', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { movement_type, quantity, unit_cost, work_order_id, reason, notes } = req.body;
        
        const { data, error } = await supabaseAdmin
            .rpc('register_inventory_movement', {
                p_inventory_item_id: id,
                p_movement_type: movement_type,
                p_quantity: quantity,
                p_unit_cost: unit_cost,
                p_work_order_id: work_order_id,
                p_reference_document: null,
                p_reason: reason,
                p_notes: notes,
                p_performed_by: req.user.id,
                p_tenant_id: req.user.tenant_id || '00000000-0000-0000-0000-000000000002'
            });
        
        if (error) throw error;
        
        res.json({ success: true, movement_id: data });
    } catch (error) {
        console.error('Erro ao registrar movimentação:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Itens com estoque baixo
app.get('/api/prostoral/inventory/low-stock', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .rpc('get_low_stock_items', { 
                p_tenant_id: req.user.tenant_id || '00000000-0000-0000-0000-000000000002'
            });
        
        if (error) throw error;
        
        res.json({ success: true, items: data });
    } catch (error) {
        console.error('Erro ao buscar itens com estoque baixo:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ORDENS DE SERVIÇO ====================

// GET - Listar ordens de serviço
app.get('/api/prostoral/orders', authenticateToken, async (req, res) => {
    try {
        const { status, client_id, search, work_type_id } = req.query;
        
        let query = supabaseAdmin
            .from('prostoral_work_orders')
            .select(`
                *,
                client:prostoral_clients(id, full_name, client_type),
                work_type:prostoral_work_types(id, name, category)
            `)
            .order('created_at', { ascending: false });
        
        if (status) {
            query = query.eq('status', status);
        }
        
        if (client_id) {
            query = query.eq('client_id', client_id);
        }
        
        if (work_type_id) {
            query = query.eq('work_type_id', work_type_id);
        }
        
        if (search) {
            query = query.or(`work_order_number.ilike.%${search}%,patient_name.ilike.%${search}%,notes.ilike.%${search}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        res.json({ success: true, orders: data });
    } catch (error) {
        console.error('Erro ao buscar ordens de serviço:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Buscar OS por ID
app.get('/api/prostoral/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_work_orders')
            .select(`
                *,
                client:prostoral_clients(*),
                work_type:prostoral_work_types(*),
                materials:prostoral_work_order_materials(
                    *,
                    inventory_item:prostoral_inventory(id, name, code, unit)
                ),
                status_history:prostoral_work_order_status_history(*)
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, order: data });
    } catch (error) {
        console.error('Erro ao buscar ordem de serviço:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST - Criar nova OS
app.post('/api/prostoral/orders', authenticateToken, async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            tenant_id: req.user.tenant_id || '00000000-0000-0000-0000-000000000002',
            created_by: req.user.id,
            status: req.body.status || 'pending'
        };
        
        // Gerar número de OS
        const { data: orderNumber, error: numberError } = await supabaseAdmin
            .rpc('get_next_work_order_number', {
                p_tenant_id: orderData.tenant_id
            });
        
        if (numberError) throw numberError;
        
        orderData.work_order_number = orderNumber;
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_work_orders')
            .insert([orderData])
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, order: data });
    } catch (error) {
        console.error('Erro ao criar ordem de serviço:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT - Atualizar OS
app.put('/api/prostoral/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const orderData = {
            ...req.body,
            updated_by: req.user.id
        };
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_work_orders')
            .update(orderData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, order: data });
    } catch (error) {
        console.error('Erro ao atualizar ordem de serviço:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH - Atualizar status da OS
app.patch('/api/prostoral/orders/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_work_orders')
            .update({ 
                status,
                updated_by: req.user.id
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        // Registrar no histórico (o trigger já faz isso, mas podemos adicionar notas extras)
        if (notes) {
            await supabaseAdmin
                .from('prostoral_work_order_status_history')
                .insert([{
                    work_order_id: id,
                    from_status: data.status,
                    to_status: status,
                    notes,
                    changed_by: req.user.id
                }]);
        }
        
        res.json({ success: true, order: data });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Cancelar OS
app.delete('/api/prostoral/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_work_orders')
            .update({ 
                status: 'cancelled',
                is_active: false,
                updated_by: req.user.id
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, order: data });
    } catch (error) {
        console.error('Erro ao cancelar ordem de serviço:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Tipos de trabalho disponíveis
app.get('/api/prostoral/work-types', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('prostoral_work_types')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });
        
        if (error) throw error;
        
        res.json({ success: true, workTypes: data });
    } catch (error) {
        console.error('Erro ao buscar tipos de trabalho:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== KITS DE PROCEDIMENTOS ====================

// GET - Listar kits
app.get('/api/prostoral/kits', authenticateToken, async (req, res) => {
    try {
        const { work_type_id, search } = req.query;
        
        let query = supabaseAdmin
            .from('prostoral_procedure_kits')
            .select(`
                *,
                work_type:prostoral_work_types(id, name, category),
                items:prostoral_kit_items(
                    id,
                    standard_quantity,
                    unit,
                    display_order,
                    inventory_item:prostoral_inventory(id, name, code, unit, unit_cost)
                )
            `)
            .eq('is_active', true)
            .order('name', { ascending: true });
        
        if (work_type_id) {
            query = query.eq('work_type_id', work_type_id);
        }
        
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        res.json({ success: true, kits: data });
    } catch (error) {
        console.error('Erro ao buscar kits:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Buscar kit por ID
app.get('/api/prostoral/kits/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_procedure_kits')
            .select(`
                *,
                work_type:prostoral_work_types(*),
                items:prostoral_kit_items(
                    *,
                    inventory_item:prostoral_inventory(*)
                )
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, kit: data });
    } catch (error) {
        console.error('Erro ao buscar kit:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST - Criar novo kit
app.post('/api/prostoral/kits', authenticateToken, async (req, res) => {
    try {
        const { items, ...kitData } = req.body;
        
        const dataToInsert = {
            ...kitData,
            tenant_id: req.user.tenant_id || '00000000-0000-0000-0000-000000000002',
            created_by: req.user.id
        };
        
        const { data: kit, error: kitError } = await supabaseAdmin
            .from('prostoral_procedure_kits')
            .insert([dataToInsert])
            .select()
            .single();
        
        if (kitError) throw kitError;
        
        // Adicionar itens ao kit
        if (items && items.length > 0) {
            const kitItems = items.map((item, index) => ({
                kit_id: kit.id,
                inventory_item_id: item.inventory_item_id,
                standard_quantity: item.standard_quantity,
                unit: item.unit,
                display_order: index
            }));
            
            const { error: itemsError } = await supabaseAdmin
                .from('prostoral_kit_items')
                .insert(kitItems);
            
            if (itemsError) throw itemsError;
        }
        
        res.json({ success: true, kit });
    } catch (error) {
        console.error('Erro ao criar kit:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT - Atualizar kit
app.put('/api/prostoral/kits/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { items, ...kitData } = req.body;
        
        const dataToUpdate = {
            ...kitData,
            updated_by: req.user.id
        };
        
        const { data: kit, error: kitError } = await supabaseAdmin
            .from('prostoral_procedure_kits')
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();
        
        if (kitError) throw kitError;
        
        // Se items foi fornecido, atualizar itens do kit
        if (items !== undefined) {
            // Remover itens antigos
            await supabaseAdmin
                .from('prostoral_kit_items')
                .delete()
                .eq('kit_id', id);
            
            // Adicionar novos itens
            if (items.length > 0) {
                const kitItems = items.map((item, index) => ({
                    kit_id: id,
                    inventory_item_id: item.inventory_item_id,
                    standard_quantity: item.standard_quantity,
                    unit: item.unit,
                    display_order: index
                }));
                
                const { error: itemsError } = await supabaseAdmin
                    .from('prostoral_kit_items')
                    .insert(kitItems);
                
                if (itemsError) throw itemsError;
            }
        }
        
        res.json({ success: true, kit });
    } catch (error) {
        console.error('Erro ao atualizar kit:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Desativar kit
app.delete('/api/prostoral/kits/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_procedure_kits')
            .update({ 
                is_active: false,
                updated_by: req.user.id
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, kit: data });
    } catch (error) {
        console.error('Erro ao desativar kit:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Verificar disponibilidade de materiais do kit
app.get('/api/prostoral/kits/:id/availability', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabaseAdmin
            .rpc('check_kit_inventory_availability', { p_kit_id: id });
        
        if (error) throw error;
        
        res.json({ success: true, availability: data });
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== CONTROLE DE PRODUÇÃO ====================

// POST - Check-in (iniciar trabalho em OS)
app.post('/api/prostoral/time-tracking/checkin', authenticateToken, async (req, res) => {
    try {
        const { work_order_id, notes } = req.body;
        
        const trackingData = {
            work_order_id,
            technician_id: req.user.id,
            check_in_time: new Date().toISOString(),
            notes,
            tenant_id: req.user.tenant_id || '00000000-0000-0000-0000-000000000002'
        };
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_time_tracking')
            .insert([trackingData])
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, tracking: data });
    } catch (error) {
        console.error('Erro ao fazer check-in:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH - Check-out (finalizar trabalho)
app.patch('/api/prostoral/time-tracking/:id/checkout', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        
        const { data, error } = await supabaseAdmin
            .from('prostoral_time_tracking')
            .update({ 
                check_out_time: new Date().toISOString(),
                notes: notes || null
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, tracking: data });
    } catch (error) {
        console.error('Erro ao fazer check-out:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Listar registros de tempo
app.get('/api/prostoral/time-tracking', authenticateToken, async (req, res) => {
    try {
        const { work_order_id, technician_id, date_from, date_to } = req.query;
        
        let query = supabaseAdmin
            .from('prostoral_time_tracking')
            .select(`
                *,
                work_order:prostoral_work_orders(id, work_order_number, patient_name),
                technician:user_profiles(id, full_name)
            `)
            .order('check_in_time', { ascending: false });
        
        if (work_order_id) {
            query = query.eq('work_order_id', work_order_id);
        }
        
        if (technician_id) {
            query = query.eq('technician_id', technician_id);
        }
        
        if (date_from) {
            query = query.gte('check_in_time', date_from);
        }
        
        if (date_to) {
            query = query.lte('check_in_time', date_to);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        res.json({ success: true, timeTracking: data });
    } catch (error) {
        console.error('Erro ao buscar registros de tempo:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET - Tempo ativo (check-ins sem check-out)
app.get('/api/prostoral/time-tracking/active', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('prostoral_time_tracking')
            .select(`
                *,
                work_order:prostoral_work_orders(id, work_order_number, patient_name, client_id)
            `)
            .is('check_out_time', null)
            .eq('technician_id', req.user.id)
            .order('check_in_time', { ascending: false });
        
        if (error) throw error;
        
        res.json({ success: true, activeTracking: data });
    } catch (error) {
        console.error('Erro ao buscar tempo ativo:', error);
        res.status(500).json({ error: error.message });
    }
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