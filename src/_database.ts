import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
//import process from "node:process";

console.log('=========url----------', Deno.env.get('SUPABASE_URL'));
console.log('=========key----------', Deno.env.get('SUPABASE_ANON_KEY'));

export const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));
