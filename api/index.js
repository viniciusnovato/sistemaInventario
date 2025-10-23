const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const multer = require('multer');
const QRCode = require('qrcode');
const { sanitizeFileName } = require('../sanitize-filename');
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
        fileSize: 50 * 1024 * 1024 // 50MB - aumentado para permitir PDFs maiores
    },
    fileFilter: (req, file, cb) => {
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rota principal - servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
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
app.post('/api/items', upload.fields([
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

        // Processar imagem - pode vir como arquivo (multer) ou como caminho já enviado
        const imagePath = req.body.image_path;
        
        if (imagePath) {
            // Imagem já foi enviada para o Supabase Storage pelo frontend
            imageUrl = `${supabaseUrl}/storage/v1/object/public/item-images/${imagePath}`;
        } else if (req.files && req.files.image && req.files.image[0]) {
            // Fallback: upload tradicional via multer
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

        // Processar PDFs - pode vir como arquivo (multer) ou como caminhos já enviados
        const pdfPaths = req.body['pdf_paths[]'];
        
        if (pdfPaths) {
            // PDFs já foram enviados para o Supabase Storage pelo frontend
            const paths = Array.isArray(pdfPaths) ? pdfPaths : [pdfPaths];
            pdfUrls = paths.map(path => `${supabaseUrl}/storage/v1/object/public/item-pdfs/${path}`);
        } else if (req.files && req.files.pdf && req.files.pdf.length > 0) {
            // Fallback: upload tradicional via multer (pode exceder 4.5MB na Vercel)
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
app.put('/api/items/:id', upload.fields([
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
        console.log('req.body["pdf_paths[]"]:', req.body['pdf_paths[]']);
        
        // Processar PDFs - pode vir como arquivo (multer) ou como caminhos já enviados
        const pdfPaths = req.body['pdf_paths[]'];
        
        if (pdfPaths) {
            // PDFs já foram enviados para o Supabase Storage pelo frontend
            console.log('Processando PDFs já enviados ao Storage:', pdfPaths);
            const paths = Array.isArray(pdfPaths) ? pdfPaths : [pdfPaths];
            const newPdfUrls = paths.map(path => `${supabaseUrl}/storage/v1/object/public/item-pdfs/${path}`);
            pdfUrls.push(...newPdfUrls);
            console.log('PDFs adicionados ao array:', newPdfUrls);
        } else if (req.files && req.files.pdf && req.files.pdf.length > 0) {
            // Fallback: upload tradicional via multer (pode exceder 4.5MB na Vercel)
            console.log('Fazendo upload de novos PDFs via multer:', req.files.pdf.length);
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
app.delete('/api/items/:id', async (req, res) => {
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