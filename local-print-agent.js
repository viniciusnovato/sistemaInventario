#!/usr/bin/env node

/**
 * Local Print Agent for Brother QL-810Wc - PDF Optimized Version
 * 
 * Este daemon monitora a fila de impressão no Supabase e gera etiquetas PDF
 * com dimensões exatas (62mm x altura calculada) para impressão sem margens.
 * 
 * Requisitos:
 * - Node.js 18+
 * - Driver Brother QL-810Wc instalado
 * - npm install @supabase/supabase-js qrcode pdfkit
 * 
 * Uso:
 * node local-print-agent.js
 */

const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

// Configuração do Supabase
const SUPABASE_URL = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg5MzIwOSwiZXhwIjoyMDc0NDY5MjA5fQ.giS313veFHErBnXpfafLS-c9loqVbeD6pggVHyYy7zY';

// Configuração da impressora
const PRINTER_CONFIG = {
    name: 'Brother_QL_810W', // Nome da impressora no sistema
    labelWidthMM: 62, // Largura fixa da etiqueta em mm
    dpi: 600, // DPI para impressão de alta qualidade (aumentado para melhor nitidez)
    maxRetries: 3 // Máximo de tentativas de impressão
};

// Configurações de layout (em mm)
const LAYOUT_CONFIG = {
    safetyMarginMM: 0.5, // Margem de segurança padrão
    minTopMarginMM: 2.5, // Margem superior mínima (aumentada para evitar corte)
    minBottomMarginMM: 1.0, // Margem inferior mínima
    qrTextSpacingMM: 2.0, // Espaçamento entre QR e texto
    lineSpacingMM: 1.2, // Espaçamento entre linhas de texto
    maxTextWidthMM: 58, // Largura máxima do texto (62mm - 4mm margens)
    fontSizes: {
        itemName: 10, // Tamanho da fonte para nome do item
        itemCode: 8   // Tamanho da fonte para código do item
    }
};

// Diretório temporário para arquivos de impressão
const TEMP_DIR = path.join(os.tmpdir(), 'qr-print-agent');

class PrintAgent {
    constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        this.isRunning = false;
        this.pollingInterval = null;
        this.subscription = null;
        
        // Criar diretório temporário se não existir
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
        
        console.log('🖨️  Print Agent PDF Optimized inicializado');
        console.log(`📁 Diretório temporário: ${TEMP_DIR}`);
        console.log(`📏 Configuração: ${PRINTER_CONFIG.labelWidthMM}mm x altura calculada`);
    }

    /**
     * Converte milímetros para pontos PDF (1mm = 2.834645669 pontos)
     */
    mmToPoints(mm) {
        return mm * 2.834645669;
    }

    /**
     * Converte pontos PDF para milímetros
     */
    pointsToMM(points) {
        return points / 2.834645669;
    }

    /**
     * Valida o payload do job antes do processamento
     * @param {Object} job - Job da fila de impressão
     * @returns {Array} - Array de erros encontrados
     */
    validateJobPayload(job) {
        const errors = [];
        
        // Campos obrigatórios da tabela print_queue
        if (!job.id) errors.push('id é obrigatório');
        if (!job.qr_code_data) errors.push('qr_code_data é obrigatório');
        if (!job.item_name) errors.push('item_name é obrigatório');
        if (!job.item_id) errors.push('item_id é obrigatório');
        
        // Validações de formato
        if (job.qr_code_data && job.qr_code_data.length > 2000) {
            errors.push('qr_code_data muito longo (máximo 2000 caracteres)');
        }
        
        if (job.item_name && job.item_name.length > 100) {
            errors.push('item_name muito longo (máximo 100 caracteres)');
        }
        
        if (job.item_code && job.item_code.length > 50) {
            errors.push('item_code muito longo (máximo 50 caracteres)');
        }
        
        // Validar qr_code_size (formato da tabela: '5mm', '10mm', etc.)
        if (job.qr_code_size) {
            const validSizes = ['5mm', '10mm', '15mm', '20mm', '25mm', '30mm', '35mm', '40mm', '45mm', '50mm', '55mm'];
            if (!validSizes.includes(job.qr_code_size)) {
                errors.push(`qr_code_size deve ser um dos valores: ${validSizes.join(', ')}`);
            }
        }
        
        return errors;
    }

    /**
     * Calcula a altura mínima necessária para a etiqueta
     */
    calculateLabelHeight(qrSizeMM, textLines, safetyMarginMM = LAYOUT_CONFIG.safetyMarginMM) {
        const topMargin = Math.max(LAYOUT_CONFIG.minTopMarginMM, safetyMarginMM);
        const bottomMargin = Math.max(LAYOUT_CONFIG.minBottomMarginMM, safetyMarginMM);
        const qrTextSpacing = LAYOUT_CONFIG.qrTextSpacingMM;
        
        // Altura do texto (aproximada)
        const lineHeightMM = LAYOUT_CONFIG.fontSizes.itemName * 0.35; // Aproximação: 1pt ≈ 0.35mm
        const codeHeightMM = LAYOUT_CONFIG.fontSizes.itemCode * 0.35;
        const textHeightMM = (textLines.length * lineHeightMM * LAYOUT_CONFIG.lineSpacingMM) + 
                            (textLines.hasCode ? codeHeightMM + LAYOUT_CONFIG.lineSpacingMM : 0);
        
        const totalHeight = topMargin + qrSizeMM + qrTextSpacing + textHeightMM + bottomMargin;
        
        console.log(`📐 Cálculo de altura: QR=${qrSizeMM}mm, Texto=${textHeightMM.toFixed(1)}mm, Total=${totalHeight.toFixed(1)}mm`);
        
        return Math.ceil(totalHeight); // Arredondar para cima
    }

    /**
     * Quebra texto em linhas que cabem na largura especificada
     */
    wrapTextForPDF(doc, text, maxWidthMM, fontSize) {
        doc.fontSize(fontSize);
        const maxWidthPoints = this.mmToPoints(maxWidthMM);
        
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = doc.widthOfString(testLine);
            
            if (testWidth <= maxWidthPoints) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    // Palavra muito longa, forçar quebra
                    lines.push(word);
                }
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️  Print Agent já está rodando');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Iniciando Print Agent...');

        try {
            // Verificar conexão com Supabase
            await this.testSupabaseConnection();
            
            // Verificar impressora
            await this.checkPrinter();
            
            // Processar jobs pendentes
            await this.processPendingJobs();
            
            // Configurar subscription para novos jobs
            await this.setupRealtimeSubscription();
            
            // Iniciar polling como backup (verifica a cada 10 segundos)
            this.startPolling();
            
            console.log('✅ Print Agent rodando e monitorando fila de impressão');
            
        } catch (error) {
            console.error('❌ Erro ao iniciar Print Agent:', error);
            this.isRunning = false;
            throw error;
        }
    }

    async stop() {
        if (!this.isRunning) return;
        
        console.log('🛑 Parando Print Agent...');
        
        // Parar polling
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
        
        this.isRunning = false;
        console.log('✅ Print Agent parado');
    }

    startPolling() {
        // Polling a cada 10 segundos como backup
        this.pollingInterval = setInterval(async () => {
            if (this.isRunning) {
                console.log('🔄 Verificando jobs pendentes (polling)...');
                await this.processPendingJobs();
            }
        }, 10000); // 10 segundos
        
        console.log('⏰ Polling iniciado (backup a cada 10s)');
    }

    async testSupabaseConnection() {
        try {
            const { data, error } = await this.supabase
                .from('print_queue')
                .select('count')
                .limit(1);
                
            if (error) throw error;
            console.log('✅ Conexão com Supabase estabelecida');
        } catch (error) {
            console.error('❌ Erro na conexão com Supabase:', error);
            throw error;
        }
    }

    async checkPrinter() {
        return new Promise((resolve, reject) => {
            // Verificar se a impressora está disponível no sistema
            const command = process.platform === 'darwin' 
                ? `lpstat -p | grep "${PRINTER_CONFIG.name}"` 
                : `lpstat -p ${PRINTER_CONFIG.name}`;
                
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Impressora não encontrada:', PRINTER_CONFIG.name);
                    console.log('💡 Verifique se a impressora Brother QL-810Wc está conectada e configurada');
                    reject(new Error(`Impressora ${PRINTER_CONFIG.name} não encontrada`));
                } else {
                    console.log('✅ Impressora encontrada:', PRINTER_CONFIG.name);
                    resolve();
                }
            });
        });
    }

    async processPendingJobs() {
        try {
            const { data: jobs, error } = await this.supabase
                .from('print_queue')
                .select('*')
                .eq('status', 'pending')
                .order('priority', { ascending: false })
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (jobs && jobs.length > 0) {
                console.log(`📋 Processando ${jobs.length} job(s) pendente(s)`);
                
                for (const job of jobs) {
                    await this.processJob(job);
                }
            } else {
                console.log('📋 Nenhum job pendente encontrado');
            }
        } catch (error) {
            console.error('❌ Erro ao processar jobs pendentes:', error);
        }
    }

    async setupRealtimeSubscription() {
        try {
            this.subscription = this.supabase
                .channel('print_queue_changes')
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'print_queue',
                        filter: 'status=eq.pending'
                    }, 
                    (payload) => {
                        console.log('🔔 Novo job de impressão recebido:', payload.new.id);
                        this.processJob(payload.new);
                    }
                )
                .subscribe();

            console.log('👂 Monitorando mudanças na fila de impressão');
        } catch (error) {
            console.error('❌ Erro ao configurar subscription:', error);
            throw error;
        }
    }

    async processJob(job) {
        console.log(`🖨️  Processando job ${job.id}: ${job.item_name}`);

        try {
            // Atualizar status para processing
            await this.updateJobStatus(job.id, 'processing');

            // Validar payload
            const validationErrors = this.validateJobPayload(job);
            if (validationErrors.length > 0) {
                throw new Error(`Payload inválido: ${validationErrors.join(', ')}`);
            }

            // Gerar PDF da etiqueta
            const pdfPath = await this.generateLabelPDF(job);
            console.log(`📄 PDF gerado: ${pdfPath}`);

            // Imprimir PDF
            await this.printPDF(pdfPath, job);
            console.log(`✅ Job ${job.id} impresso com sucesso`);

            // Atualizar status para completed
            await this.updateJobStatus(job.id, 'completed');

            // Limpar arquivo temporário
            this.cleanupTempFile(pdfPath);

        } catch (error) {
            console.error(`❌ Erro ao processar job ${job.id}:`, error);
            
            // Atualizar status para failed
            await this.updateJobStatus(job.id, 'failed', error.message);
            
            // Tentar novamente se não excedeu o limite
            if (job.retry_count < 3) {
                await this.retryJob(job.id);
            }
        }
    }

    /**
     * Gera PDF da etiqueta com dimensões exatas
     */
    async generateLabelPDF(job) {
        // Converter qr_code_size de '25mm' para número em mm (agora direto)
        let qrSizeMM = 25; // padrão
        if (job.qr_code_size) {
            // Extrair o número do formato '25mm'
            const sizeMatch = job.qr_code_size.match(/(\d+)mm/);
            if (sizeMatch) {
                qrSizeMM = parseInt(sizeMatch[1]);
            }
        }
        
        const safetyMarginMM = LAYOUT_CONFIG.safetyMarginMM;
        const printerName = PRINTER_CONFIG.name;
        
        console.log(`📐 Gerando PDF: QR=${qrSizeMM}mm, Margem=${safetyMarginMM}mm, Impressora=${printerName}`);

        // Criar documento PDF temporário para calcular dimensões do texto
        const tempDoc = new PDFDocument({ margin: 0 });
        
        // Quebrar texto em linhas
        const itemNameLines = this.wrapTextForPDF(tempDoc, job.item_name, LAYOUT_CONFIG.maxTextWidthMM, LAYOUT_CONFIG.fontSizes.itemName);
        
        // Calcular altura necessária (sem código do produto)
        const labelHeightMM = this.calculateLabelHeight(qrSizeMM, { 
            length: itemNameLines.length, 
            hasCode: false 
        }, safetyMarginMM);

        console.log(`📏 Dimensões calculadas: ${PRINTER_CONFIG.labelWidthMM}mm x ${labelHeightMM}mm`);

        // Criar PDF final com dimensões exatas
        const doc = new PDFDocument({
            size: [this.mmToPoints(PRINTER_CONFIG.labelWidthMM), this.mmToPoints(labelHeightMM)],
            margin: 0,
            info: {
                Title: `Etiqueta QR - ${job.item_name}`,
                Subject: `Job ${job.id}`,
                Creator: 'Print Agent PDF Optimized'
            }
        });

        // Gerar QR Code como buffer
        const qrBuffer = await QRCode.toBuffer(job.qr_code_data, {
            width: Math.round(qrSizeMM * PRINTER_CONFIG.dpi / 25.4), // Converter mm para pixels
            margin: 0, // Sem margem interna
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
        });

        // Posições em pontos
        const topMarginPoints = this.mmToPoints(Math.max(LAYOUT_CONFIG.minTopMarginMM, safetyMarginMM));
        const qrSizePoints = this.mmToPoints(qrSizeMM);
        const labelWidthPoints = this.mmToPoints(PRINTER_CONFIG.labelWidthMM);
        
        // Centralizar QR horizontalmente
        const qrX = (labelWidthPoints - qrSizePoints) / 2;
        const qrY = topMarginPoints;

        // Inserir QR Code no PDF
        doc.image(qrBuffer, qrX, qrY, {
            width: qrSizePoints,
            height: qrSizePoints
        });

        // Posição inicial do texto
        let textY = qrY + qrSizePoints + this.mmToPoints(LAYOUT_CONFIG.qrTextSpacingMM);

        // Adicionar nome do item
        doc.fontSize(LAYOUT_CONFIG.fontSizes.itemName);
        doc.fillColor('black');
        
        itemNameLines.forEach(line => {
            const textWidth = doc.widthOfString(line);
            const textX = (labelWidthPoints - textWidth) / 2; // Centralizar
            doc.text(line, textX, textY);
            textY += LAYOUT_CONFIG.fontSizes.itemName * LAYOUT_CONFIG.lineSpacingMM;
        });

        // Salvar PDF
        const fileName = `label_${job.job_id}_${Date.now()}.pdf`;
        const filePath = path.join(TEMP_DIR, fileName);
        
        return new Promise((resolve, reject) => {
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);
            doc.end();
            
            stream.on('finish', () => {
                console.log(`✅ PDF salvo: ${filePath}`);
                resolve(filePath);
            });
            
            stream.on('error', reject);
        });
    }

    /**
     * Imprime PDF usando lpr com configurações personalizadas
     */
    async printPDF(pdfPath, job) {
        const printerName = job.printer_name || PRINTER_CONFIG.name;
        const qrSizeMM = parseFloat(job.qr_size_mm) || 30;
        const safetyMarginMM = parseFloat(job.safety_margin_mm) || LAYOUT_CONFIG.safetyMarginMM;
        
        // Calcular altura da etiqueta
        const tempDoc = new PDFDocument({ margin: 0 });
        const itemNameLines = this.wrapTextForPDF(tempDoc, job.item_name, LAYOUT_CONFIG.maxTextWidthMM, LAYOUT_CONFIG.fontSizes.itemName);
        const labelHeightMM = this.calculateLabelHeight(qrSizeMM, { 
            length: itemNameLines.length, 
            hasCode: false 
        }, safetyMarginMM);

        // Comando lpr com configurações personalizadas
        const lprCommand = [
            'lpr',
            `-P "${printerName}"`,
            '-o fit-to-page',
            `-o media=Custom.${PRINTER_CONFIG.labelWidthMM}x${labelHeightMM}mm`,
            '-o orientation-requested=3', // Portrait
            '-o print-quality=5', // Máxima qualidade
            '-o ColorModel=Gray', // Modo escala de cinza para melhor contraste
            '-o Resolution=600dpi', // Resolução específica para alta qualidade
            '-o Darkness=5', // Escuridão máxima para melhor contraste
            '-o MediaType=Labels', // Tipo de mídia específico para etiquetas
            `"${pdfPath}"`
        ].join(' ');

        console.log(`🖨️  Comando de impressão: ${lprCommand}`);

        return new Promise((resolve, reject) => {
            exec(lprCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ Erro na impressão: ${error.message}`);
                    console.error(`stderr: ${stderr}`);
                    reject(error);
                    return;
                }
                
                if (stderr) {
                    console.warn(`⚠️  Aviso da impressora: ${stderr}`);
                }
                
                console.log(`✅ PDF enviado para impressora ${printerName}`);
                if (stdout) {
                    console.log(`stdout: ${stdout}`);
                }
                
                resolve();
            });
        });
    }

    /**
     * Remove arquivo temporário
     */
    cleanupTempFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`🗑️  Arquivo temporário removido: ${filePath}`);
            }
        } catch (error) {
            console.warn(`⚠️  Erro ao remover arquivo temporário ${filePath}:`, error.message);
        }
    }

    async generateQRCodeImage(job) {
        // Dimensões compactas para etiqueta Brother QL-810W 62mm
        // Canvas com resolução aumentada para melhor qualidade (2x)
        const canvasScale = 2; // Fator de escala para alta resolução
        const baseWidth = 200;
        const baseHeight = 280;
        const canvas = createCanvas(baseWidth * canvasScale, baseHeight * canvasScale);
        const ctx = canvas.getContext('2d');
        
        // Configurar escala para alta resolução
        ctx.scale(canvasScale, canvasScale);
        
        // Fundo branco
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, baseWidth, baseHeight);
        
        // Definir tamanho do QR code baseado na configuração (em pixels para canvas)
        // Converter mm para pixels aproximados para o canvas (1mm ≈ 7.56 pixels a 192 DPI para alta resolução)
        let qrSizePixels = 95; // padrão para 25mm
        if (job.qr_code_size) {
            const sizeMatch = job.qr_code_size.match(/(\d+)mm/);
            if (sizeMatch) {
                const sizeMM = parseInt(sizeMatch[1]);
                qrSizePixels = Math.round(sizeMM * 7.56); // Conversão mm para pixels com alta resolução
            }
        }
        
        const qrSize = qrSizePixels;
        const qrX = (baseWidth - qrSize) / 2; // Centralizar horizontalmente
        const qrY = 15; // Margem superior mínima
        
        // Gerar QR Code com tamanho dinâmico e configurações de alta qualidade
        const qrCodeDataURL = await QRCode.toDataURL(job.qr_code_data, {
            width: qrSize,
            margin: 1, // Margem reduzida para melhor aproveitamento do espaço
            errorCorrectionLevel: 'H', // Nível alto de correção de erro para melhor qualidade
            type: 'image/png',
            quality: 1.0, // Qualidade máxima
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        
        // Carregar imagem do QR Code
        const qrImage = await this.loadImage(qrCodeDataURL);
        
        // Desenhar QR Code centralizado
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
        
        // Adicionar texto do item (layout compacto)
        ctx.fillStyle = 'black';
        ctx.font = 'bold 12px Arial'; // Fonte ainda menor
        ctx.textAlign = 'center';
        
        // Nome do item (quebrar linha se necessário)
        const itemName = job.item_name || 'Item sem nome';
        const maxWidth = 180; // Largura máxima para nova dimensão (baseWidth-20 margem)
        const lines = this.wrapText(ctx, itemName, maxWidth);
        
        // Calcular posição Y do texto baseada no tamanho do QR code
        let y = qrY + qrSize + 10; // Espaçamento mínimo
        lines.forEach(line => {
            ctx.fillText(line, baseWidth / 2, y); // Centro horizontal
            y += 15; // Espaçamento mínimo entre linhas
        });
        
        // Código do item (mais compacto)
        if (job.item_code) {
            ctx.font = '10px Arial'; // Fonte bem pequena
            ctx.fillText(`Código: ${job.item_code}`, baseWidth / 2, y + 5);
        }
        
        // Salvar imagem temporária
        const fileName = `qr_${job.id}_${Date.now()}.png`;
        const filePath = path.join(TEMP_DIR, fileName);
        
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filePath, buffer);
        
        console.log(`QR Code gerado com tamanho ${job.qr_code_size || '25mm'} (${qrSize}px) para job ${job.id}`);
        
        return filePath;
    }

    async loadImage(dataURL) {
        const { Image } = require('canvas');
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataURL;
        });
    }

    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    async printQRCode(imagePath, job) {
        return new Promise((resolve, reject) => {
            // Comando para imprimir na Brother QL-810Wc
            // Ajuste conforme o driver instalado no seu sistema
            const printCommand = process.platform === 'darwin'
                ? `lpr -P "${PRINTER_CONFIG.name}" -o media=Custom.62x100mm -o fit-to-page "${imagePath}"`
                : `lpr -P "${PRINTER_CONFIG.name}" "${imagePath}"`;
            
            console.log(`🖨️  Enviando para impressora: ${job.item_name}`);
            
            exec(printCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Erro na impressão:', error);
                    reject(error);
                } else {
                    console.log('✅ Impressão enviada com sucesso');
                    resolve();
                }
            });
        });
    }

    async updateJobStatus(jobId, status, errorMessage = null) {
        try {
            const updateData = {
                status,
                updated_at: new Date().toISOString()
            };
            
            if (status === 'completed') {
                updateData.processed_at = new Date().toISOString();
            }
            
            if (errorMessage) {
                updateData.error_message = errorMessage;
            }
            
            const { error } = await this.supabase
                .from('print_queue')
                .update(updateData)
                .eq('id', jobId);
                
            if (error) throw error;
            
        } catch (error) {
            console.error(`❌ Erro ao atualizar status do job ${jobId}:`, error);
        }
    }

    async retryJob(jobId) {
        try {
            // First get current retry count
            const { data: currentJob, error: fetchError } = await this.supabase
                .from('print_queue')
                .select('retry_count')
                .eq('id', jobId)
                .single();
                
            if (fetchError) throw fetchError;
            
            const { error } = await this.supabase
                .from('print_queue')
                .update({
                    status: 'pending',
                    retry_count: (currentJob.retry_count || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', jobId);
                
            if (error) throw error;
            
            console.log(`🔄 Job ${jobId} reagendado para retry`);
            
        } catch (error) {
            console.error(`❌ Erro ao reagendar job ${jobId}:`, error);
        }
    }
}

// Função principal
async function main() {
    const agent = new PrintAgent();
    
    // Handlers para encerramento gracioso
    process.on('SIGINT', async () => {
        console.log('\n🛑 Recebido SIGINT, encerrando...');
        await agent.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Recebido SIGTERM, encerrando...');
        await agent.stop();
        process.exit(0);
    });
    
    try {
        await agent.start();
        
        // Manter o processo rodando
        console.log('💡 Pressione Ctrl+C para parar o agent');
        
    } catch (error) {
        console.error('❌ Falha ao iniciar Print Agent:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = PrintAgent;