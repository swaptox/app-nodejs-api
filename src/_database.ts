import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import process from "node:process";
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
