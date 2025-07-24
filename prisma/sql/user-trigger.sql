-- Buat function yang kirim sinyal ke channel 'nasabah_updated'
CREATE OR REPLACE FUNCTION notify_nasabah_change() 
RETURNS trigger AS $$
BEGIN
  -- Mengirim notifikasi ke channel 'nasabah_updated' dengan payload berupa JSON
  -- yang berisi informasi tentang perubahan yang terjadi
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_notify('nasabah_updated', 
      json_build_object(
        'operation', TG_OP,
        'id', OLD.id
      )::text);
  ELSE
    PERFORM pg_notify('nasabah_updated', 
      json_build_object(
        'operation', TG_OP,
        'id', NEW.id,
        'data', row_to_json(NEW)
      )::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Buat trigger yang memanggil function itu setiap data nasabah berubah
DROP TRIGGER IF EXISTS trigger_nasabah_change ON nasabah;

CREATE TRIGGER trigger_nasabah_change
AFTER INSERT OR UPDATE OR DELETE ON nasabah
FOR EACH ROW
EXECUTE FUNCTION notify_nasabah_change();