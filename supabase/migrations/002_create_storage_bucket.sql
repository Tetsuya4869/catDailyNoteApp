-- Create the photos bucket (run this in Supabase Dashboard > Storage > New Bucket)
-- Name: photos
-- Public: true

-- Or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for photos bucket
-- Users can upload to their own folder: {user_id}/...
CREATE POLICY "photos_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "photos_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "photos_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "photos_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Public read access (for displaying photos)
CREATE POLICY "photos_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');
