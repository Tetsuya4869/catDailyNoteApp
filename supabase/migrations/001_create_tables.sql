-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== CATS TABLE =====
CREATE TABLE cats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('orange', 'black', 'white', 'gray', 'calico', 'tabby')),
  gender TEXT CHECK (gender IN ('male', 'female', 'unknown')),
  birth_date DATE,
  weight_goal NUMERIC(4,2),
  photo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cats_user_id ON cats(user_id);

ALTER TABLE cats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cats_select" ON cats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cats_insert" ON cats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cats_update" ON cats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cats_delete" ON cats FOR DELETE USING (auth.uid() = user_id);


-- ===== DIARY_ENTRIES TABLE =====
CREATE TABLE diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cat_id UUID REFERENCES cats(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  mood TEXT NOT NULL CHECK (mood IN ('happy', 'sleepy', 'playful', 'hungry', 'relaxed')),
  photo_path TEXT,
  category TEXT CHECK (category IN ('meal', 'play', 'sleep', 'health', 'grooming', 'other')),
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diary_entries_user_id ON diary_entries(user_id);
CREATE INDEX idx_diary_entries_cat_id ON diary_entries(cat_id);
CREATE INDEX idx_diary_entries_date ON diary_entries(date DESC);

ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diary_select" ON diary_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "diary_insert" ON diary_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "diary_update" ON diary_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "diary_delete" ON diary_entries FOR DELETE USING (auth.uid() = user_id);


-- ===== HEALTH_RECORDS TABLE =====
CREATE TABLE health_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cat_id UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weight', 'vet', 'vaccine', 'medication')),
  date DATE NOT NULL,
  weight_kg NUMERIC(4,2),
  title TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_records_user_id ON health_records(user_id);
CREATE INDEX idx_health_records_cat_id ON health_records(cat_id);
CREATE INDEX idx_health_records_date ON health_records(date DESC);

ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_select" ON health_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "health_insert" ON health_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "health_update" ON health_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "health_delete" ON health_records FOR DELETE USING (auth.uid() = user_id);


-- ===== APPOINTMENTS TABLE =====
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cat_id UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('vet', 'vaccine')),
  date TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_cat_id ON appointments(cat_id);
CREATE INDEX idx_appointments_date ON appointments(date);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appt_select" ON appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "appt_insert" ON appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appt_update" ON appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "appt_delete" ON appointments FOR DELETE USING (auth.uid() = user_id);


-- ===== UPDATED_AT TRIGGER =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cats_updated_at
  BEFORE UPDATE ON cats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diary_entries_updated_at
  BEFORE UPDATE ON diary_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
