-- Tabela de fila de impressão para Brother QL-810Wc
-- Execute este SQL no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS print_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  qr_code_data text NOT NULL,
  item_name text NOT NULL,
  item_code text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'completed', 'failed')),
  error_message text,
  qr_code_size text DEFAULT '128px' CHECK (qr_code_size IN ('10px', '25px', '50px', '75px', '128px')),
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  retry_count integer DEFAULT 0,
  priority integer DEFAULT 1 -- 1 = normal, 2 = high, 3 = urgent
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_print_queue_status ON print_queue(status);
CREATE INDEX IF NOT EXISTS idx_print_queue_created_at ON print_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_print_queue_item_id ON print_queue(item_id);

-- RLS (Row Level Security) - opcional, ajuste conforme necessário
ALTER TABLE print_queue ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção e leitura (ajuste conforme suas regras de auth)
CREATE POLICY "Allow print queue operations" ON print_queue
  FOR ALL USING (true);

-- Função para limpar registros antigos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_print_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM print_queue 
  WHERE status IN ('completed', 'failed') 
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE print_queue IS 'Fila de impressão para etiquetas QR Code na Brother QL-810Wc';
COMMENT ON COLUMN print_queue.status IS 'Status: pending, printing, completed, failed';
COMMENT ON COLUMN print_queue.qr_code_size IS 'Tamanho do QR code: 10px, 25px, 50px, 75px, 128px';
COMMENT ON COLUMN print_queue.priority IS 'Prioridade: 1=normal, 2=alta, 3=urgente';
COMMENT ON COLUMN print_queue.retry_count IS 'Contador de tentativas de reimpressão';