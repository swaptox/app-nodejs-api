import { corsHeaders } from '../_cors.ts';
import { supabase } from '../_database.ts';
export const getToken = async (chain, req) => {
	//const url = new URL(req.url);
	//const searchParams = url.searchParams;

	return new Response(JSON.stringify(req), {
		headers: {
			...corsHeaders,
			'Content-Type': 'application/json'
		},
		status: 200
	});
	
	
};
