// ============================================================
// Supabase 설정
// ============================================================
// anon key 는 공개되어도 안전 (RLS 가 데이터를 보호함).
// service_role 키는 절대 여기 넣지 말 것 — 서버 전용.
// ============================================================

window.SUPABASE_CONFIG = {
  url:     'https://jxtzdhfbuvvrfrxunsfg.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dHpkaGZidXZ2cmZyeHVuc2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MjMzMTIsImV4cCI6MjA5Mjk5OTMxMn0.dOXNVja6ZjOkcm4jtZmG1kbPrMhffrviAps5-XnT8CE'
};
