/**
 * Configurações do Supabase
 * Grupo AreLuna - Sistema de Inventário
 */

// Configurações do Supabase
const SUPABASE_URL = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTMyMDksImV4cCI6MjA3NDQ2OTIwOX0.r260qHrvkLMHG60Pbld2zyjwXBY3B94Edk51YDpLXM4';

// Tornar as configurações globalmente disponíveis
window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
};