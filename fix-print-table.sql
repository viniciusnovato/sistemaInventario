-- Script para corrigir a tabela print_queue adicionando a coluna qr_code_size
-- Execute este SQL no Supabase Dashboard > SQL Editor

-- Primeiro, vamos dropar a tabela existente para recriar com a nova estrutura
DROP TABLE IF EXISTS print_queue CASCADE;

-- Criar tabela print_queue para o sistema de impressão
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

-- Comentários para documentação
COMMENT ON TABLE print_queue IS 'Fila de impressão para QR codes do sistema de inventário';
COMMENT ON COLUMN print_queue.id IS 'Identificador único do job de impressão';
COMMENT ON COLUMN print_queue.item_id IS 'ID do item a ser impresso';
COMMENT ON COLUMN print_queue.qr_code_data IS 'Dados do QR code (URL)';
COMMENT ON COLUMN print_queue.item_name IS 'Nome do item para identificação';
COMMENT ON COLUMN print_queue.item_code IS 'Código do item (opcional)';
COMMENT ON COLUMN print_queue.priority IS 'Prioridade do job (1=alta, 5=baixa)';
COMMENT ON COLUMN print_queue.status IS 'Status do job: pending, processing, completed, failed';
COMMENT ON COLUMN print_queue.error_message IS 'Mensagem de erro em caso de falha';
COMMENT ON COLUMN print_queue.retry_count IS 'Número de tentativas de reprocessamento';
COMMENT ON COLUMN print_queue.qr_code_size IS 'Tamanho do QR code: 10px, 25px, 50px, 75px, 128px';
COMMENT ON COLUMN print_queue.created_at IS 'Data/hora de criação do job';
COMMENT ON COLUMN print_queue.updated_at IS 'Data/hora da última atualização';
COMMENT ON COLUMN print_queue.processed_at IS 'Data/hora do processamento';