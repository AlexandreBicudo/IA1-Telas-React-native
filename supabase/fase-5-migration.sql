-- ─── fase-5: notificações in-app ─────────────────────────────────────────────

-- push_token já foi adicionado via código; garante existência
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token text;

-- Tabela de notificações in-app
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type        text        NOT NULL,   -- pedido_recebido | pedido_aceito | pedido_cancelado | servico_concluido | nova_avaliacao
  title       text        NOT NULL,
  body        text        NOT NULL,
  booking_id  uuid        REFERENCES bookings(id) ON DELETE SET NULL,
  read        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'users_own_notifications'
  ) THEN
    CREATE POLICY users_own_notifications ON notifications
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
