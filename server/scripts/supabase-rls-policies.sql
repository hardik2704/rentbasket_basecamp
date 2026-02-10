-- ==========================================
-- RENTBASKET RLS POLICIES
-- Run this in Supabase Dashboard → SQL Editor
-- Fixes all RLS security warnings
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES
-- Since your backend uses service_role key (bypasses RLS),
-- these policies only apply to direct client access via anon key.
-- We block all direct anon access since auth is handled by your backend.
-- ==========================================

-- USERS: Block direct access (backend handles all user operations)
CREATE POLICY "Backend only - users" ON users
    FOR ALL USING (false);

-- PROJECTS: Block direct access
CREATE POLICY "Backend only - projects" ON projects
    FOR ALL USING (false);

-- PROJECT_MEMBERS: Block direct access  
CREATE POLICY "Backend only - project_members" ON project_members
    FOR ALL USING (false);

-- TASKS: Block direct access
CREATE POLICY "Backend only - tasks" ON tasks
    FOR ALL USING (false);

-- MESSAGES: Block direct access
CREATE POLICY "Backend only - messages" ON messages
    FOR ALL USING (false);

-- FILES: Block direct access
CREATE POLICY "Backend only - files" ON files
    FOR ALL USING (false);

-- NOTIFICATIONS: Block direct access
CREATE POLICY "Backend only - notifications" ON notifications
    FOR ALL USING (false);

-- ==========================================
-- FIX FUNCTION SEARCH PATH WARNING
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- VERIFICATION
-- ==========================================
-- Run this to confirm RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
