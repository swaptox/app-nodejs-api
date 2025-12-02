import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import process from "node:process";

console.log('SUPABASE_URL', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY);

export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
