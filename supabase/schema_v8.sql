-- ==========================================
-- STUDENT MODULE EXTENSIONS (V8)
-- New tables: notifications
-- ==========================================

-- 1. Notifications for students
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_uid TEXT NOT NULL REFERENCES public.students(uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('attendance', 'marks', 'result', 'assignment', 'general')),
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_uid);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(recipient_uid, is_read);
