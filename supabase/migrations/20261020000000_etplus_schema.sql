-- ====================================================================
-- ETPLUS / ETPLUS-ADMIN SUPABASE SCHEMA MIGRATION
-- ====================================================================

-- 1. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Academic',
  date TEXT NOT NULL,
  author TEXT NOT NULL,
  author_username TEXT,
  pinned BOOLEAN DEFAULT false,
  link TEXT,
  is_cohort_shared BOOLEAN DEFAULT true,
  cohort TEXT DEFAULT 'R3AI',
  is_assignment BOOLEAN DEFAULT false,
  deadline_date TEXT,
  deadline_time TEXT,
  subject_code TEXT,
  subject TEXT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  faculty TEXT NOT NULL DEFAULT 'Administrator',
  publish_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  deadline_date TEXT,
  deadline_time TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  submission_mode TEXT DEFAULT 'Online',
  max_marks NUMERIC,
  obtained_marks NUMERIC,
  attachment_name TEXT,
  attachment_url TEXT,
  external_url TEXT DEFAULT 'https://tkmce.etlab.in/student/assignments',
  announcement_id TEXT REFERENCES public.announcements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. STUDY MATERIALS TABLE
CREATE TABLE IF NOT EXISTS public.study_materials (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  faculty TEXT NOT NULL DEFAULT 'Faculty',
  uploaded_date TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  file_size TEXT,
  download_url TEXT NOT NULL,
  topic TEXT,
  category TEXT NOT NULL DEFAULT 'notes',
  description TEXT,
  uploaded_by TEXT DEFAULT 'Administrator',
  uploader_username TEXT,
  is_shared BOOLEAN DEFAULT true,
  semester NUMERIC DEFAULT 3,
  unit TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON public.announcements(category);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_code ON public.assignments(subject_code);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_study_materials_subject_code ON public.study_materials(subject_code);
CREATE INDEX IF NOT EXISTS idx_study_materials_category ON public.study_materials(category);

-- 6. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES

-- Announcements policies
CREATE POLICY "Public Read Announcements"
  ON public.announcements FOR SELECT
  USING (true);

CREATE POLICY "Admin All Announcements"
  ON public.announcements FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Assignments policies
CREATE POLICY "Public Read Assignments"
  ON public.assignments FOR SELECT
  USING (true);

CREATE POLICY "Admin All Assignments"
  ON public.assignments FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Study Materials policies
CREATE POLICY "Public Read Study Materials"
  ON public.study_materials FOR SELECT
  USING (true);

CREATE POLICY "Admin All Study Materials"
  ON public.study_materials FOR ALL
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Storage bucket configuration for uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Materials Storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'materials');

CREATE POLICY "Admin Upload Materials Storage"
  ON storage.objects FOR INSERT
  TO authenticated, service_role
  WITH CHECK (bucket_id = 'materials');

CREATE POLICY "Admin Delete Materials Storage"
  ON storage.objects FOR DELETE
  TO authenticated, service_role
  USING (bucket_id = 'materials');
