-- ─── fase-6: trigger de rating e políticas de experiências ──────────────────

-- Função que recalcula rating_avg / rating_count sempre que uma review é
-- inserida ou removida. Roda com SECURITY DEFINER para contornar RLS.
CREATE OR REPLACE FUNCTION fn_refresh_chef_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_chef_id uuid;
BEGIN
  SELECT b.chef_id INTO v_chef_id
  FROM bookings b
  WHERE b.id = COALESCE(NEW.booking_id, OLD.booking_id);

  IF v_chef_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  UPDATE chef_profiles
  SET
    rating_avg = COALESCE((
      SELECT ROUND(AVG(r.rating::numeric), 1)
      FROM reviews r
      JOIN bookings b ON b.id = r.booking_id
      WHERE b.chef_id = v_chef_id
    ), 0),
    rating_count = (
      SELECT COUNT(*)
      FROM reviews r
      JOIN bookings b ON b.id = r.booking_id
      WHERE b.chef_id = v_chef_id
    )
  WHERE id = v_chef_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_chef_rating ON reviews;
CREATE TRIGGER trg_refresh_chef_rating
  AFTER INSERT OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION fn_refresh_chef_rating();
