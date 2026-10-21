-- AttendIQ School Attendance & Management System SQL Schema
-- Run this in your Supabase SQL Editor if you enable cloud synchronization

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  room TEXT,
  teacher_id TEXT,
  teacher_name TEXT,
  schedule_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  roll_number TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT,
  photo_url TEXT,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  date_of_birth DATE,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  total_present INTEGER DEFAULT 0,
  total_absent INTEGER DEFAULT 0,
  consecutive_absences INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id TEXT,
  teacher_name TEXT,
  records JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  is_auto_finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, class_id)
);

CREATE TABLE IF NOT EXISTS parent_alerts (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT,
  parent_email TEXT,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'delivered',
  channel TEXT DEFAULT 'Both',
  message TEXT NOT NULL,
  trigger_reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  chronic_absence_threshold INTEGER DEFAULT 3,
  window_days INTEGER DEFAULT 14,
  notification_timing TEXT DEFAULT 'immediate',
  auto_absent_cutoff_time TEXT DEFAULT '15:00',
  notify_admin_on_threshold BOOLEAN DEFAULT TRUE,
  notify_parent_on_threshold BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
