// ========================================
// CONFIG
// Description: Supabase configuration and client initialization
// Dependencies: Supabase CDN must be loaded first
// ========================================

const SUPABASE_URL = 'https://rdipxnnqljdgcfmdemzi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaXB4bm5xbGpkZ2NmbWRlbXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzIyMzQsImV4cCI6MjA4MzkwODIzNH0.TSJFCV2DTzZchL_cLKPsMSB40bjbNuMW0ysVwf-Z7YA';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
