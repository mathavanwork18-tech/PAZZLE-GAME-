import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jammauesxmzpuyatgssv.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_DFk-DB9_592RknpOlv5bnQ_ghFbEZGV';

export const supabase = createClient(supabaseUrl, supabaseKey);
