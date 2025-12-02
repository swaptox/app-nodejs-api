import * as BunnySDK from "https://esm.sh/@bunny.net/edgescript-sdk@0.11.2";

import { corsHeaders } from './_cors.ts';

import { getToken } from './api/get-token.ts';

BunnySDK.net.http.serve(async (request : Request) : Response | Promise<Response> => {

	if (request.method === 'OPTIONS') {
		return new Response('ok', {
			headers: corsHeaders,
			status: 200
		});
	}

	const url = new URL(request.url);
	const pathname = url.pathname.split('/');
	const network = pathname[pathname.length - 2];
	const command = pathname.pop();

	if (command === 'get-token') {
		return await getToken(network, request);
	}
	
	
	return new Response(JSON.stringify({
		error: 'ApiError:' + network + '/' + command
	}), {
		headers: {
			...corsHeaders,
			'Content-Type': 'application/json'
		},
		status: 400
	});
});
