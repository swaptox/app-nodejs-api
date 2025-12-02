
const baseRpcUrls = [];
if(Deno.env.get('BASE_RPC_1')){baseRpcUrls.push(Deno.env.get('BASE_RPC_1'));}
if(Deno.env.get('BASE_RPC_2')){baseRpcUrls.push(Deno.env.get('BASE_RPC_2'));}
if(Deno.env.get('BASE_RPC_3')){baseRpcUrls.push(Deno.env.get('BASE_RPC_3'));}
if(Deno.env.get('BASE_RPC_4')){baseRpcUrls.push(Deno.env.get('BASE_RPC_4'));}
if(Deno.env.get('BASE_RPC_5')){baseRpcUrls.push(Deno.env.get('BASE_RPC_5'));}
const randomUrl = baseRpcUrls[Math.floor(Math.random() * baseRpcUrls.length)];







export const config = {
	'base': {
		'routeAddress': '0x044C6cF8994aED67fd7B95aE1D9b714724eF6a6c',
		'rpc': randomUrl,
		'ether': {
			'native': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
			'wrapped': '0x4200000000000000000000000000000000000006',
		},
	}
};
