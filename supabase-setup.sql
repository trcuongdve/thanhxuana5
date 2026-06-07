-- ============================================================
--  THANH XUÂN A5 – Supabase Setup SQL
--  Chạy toàn bộ file này trong SQL Editor của Supabase
-- ============================================================

-- 1. Tạo bảng wishes
CREATE TABLE IF NOT EXISTS wishes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender      TEXT NOT NULL,
  receiver    TEXT NOT NULL,
  message     TEXT NOT NULL CHECK (char_length(message) <= 500),
  color       TEXT NOT NULL DEFAULT 'pink'
              CHECK (color IN ('pink','peach','mint','sky','lavender','yellow')),
  photo_url   TEXT,          -- URL ảnh từ Storage
  video_url   TEXT,          -- URL video từ Storage
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Index để sort nhanh
CREATE INDEX IF NOT EXISTS wishes_created_at_idx ON wishes (created_at DESC);

-- 3. Bật Row Level Security
ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;

-- 4. Policy: ai cũng đọc được
CREATE POLICY "Public read"
  ON wishes FOR SELECT
  USING (true);

-- 5. Policy: ai cũng thêm được
CREATE POLICY "Public insert"
  ON wishes FOR INSERT
  WITH CHECK (true);

-- 6. Policy: ai cũng xoá được (nếu muốn khoá lại thì xoá policy này)
CREATE POLICY "Public delete"
  ON wishes FOR DELETE
  USING (true);

-- ============================================================
--  STORAGE BUCKETS
--  Vào Storage → New bucket → tạo 2 bucket sau:
--    • wish-photos  (Public: ON)
--    • wish-videos  (Public: ON)
--
--  Hoặc chạy SQL dưới đây (cần extension storage đã bật):
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('wish-photos', 'wish-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('wish-videos', 'wish-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies – cho phép mọi người upload & đọc
CREATE POLICY "Public photo upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wish-photos');

CREATE POLICY "Public photo read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wish-photos');

CREATE POLICY "Public photo delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'wish-photos');

CREATE POLICY "Public video upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wish-videos');

CREATE POLICY "Public video read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wish-videos');

CREATE POLICY "Public video delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'wish-videos');
