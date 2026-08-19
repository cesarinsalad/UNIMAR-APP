-- ═══════════════════════════════════════════════════════════════════
-- Migración: bucket de adjuntos + índice + política DELETE
-- Paso 2 — Commit 3
-- ═══════════════════════════════════════════════════════════════════

-- Bucket privado para adjuntos de comunicados. El BFF es el único que habla
-- con Storage usando la service-role key; el cliente nunca accede directo.
INSERT INTO storage.buckets (id, name, public)
VALUES ('comunicado-adjuntos', 'comunicado-adjuntos', false)
ON CONFLICT (id) DO NOTHING;

-- Índice para listar adjuntos de un comunicado sin escanear toda la tabla.
CREATE INDEX IF NOT EXISTS idx_adjuntos_comunicado ON comunicado_adjuntos (comunicado_id);

-- Política DELETE faltante en la migración base: solo ADMIN o el autor del
-- comunicado padre puede borrar adjuntos. Fail-closed (sin política = denegado).
CREATE POLICY adjuntos_delete ON comunicado_adjuntos FOR DELETE USING (
  (auth.jwt() ->> 'role') = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM comunicados c
    WHERE c.id = comunicado_id
      AND c.autor_id = (auth.jwt() ->> 'sub')::uuid
  )
);
