import { corsHeaders } from '../_cors.ts';
import { supabase } from '../_database.ts';
import { config } from '../config.ts';


export const getTokenPrices = async (chain, req) => {
	
	const url = new URL(req.url);
	const searchParams = url.searchParams;
	let token = searchParams.get('token') || '';
	if (!token) {
		return new Response(JSON.stringify({
			error: 'token is Empty'
		}), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 400
		});
	} else {
		token = token.toLowerCase();
	}
	let fanToken = {
		price_usd: '',
		price_last_updated: '',
	};
	let queryToken = '';
	if (token === config[chain].ether.native) {
		queryToken = config[chain].ether.wrapped;
		const qToken = await supabase.from('base-token').select('*').in('address', [
			config[chain].ether.native,
			config[chain].ether.wrapped
		]);
		let tData = qToken.data;
		if (tData && tData.length === 2) {
			if (tData[0].address === token) {
				fanToken = tData[0];
				fanToken.price_usd = tData[1].price_usd;
				fanToken.price_last_updated = tData[1].price_last_updated;
			} else {
				fanToken = tData[1];
				fanToken.price_usd = tData[0].price_usd;
				fanToken.price_last_updated = tData[0].price_last_updated;
			}
		} else {
			return new Response(JSON.stringify({
				error: 'data error'
			}), {
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json'
				},
				status: 400
			});
		}
	} else {
		queryToken = token;
		const qToken = await supabase.from('base-token').select('*').eq('address', queryToken);
		let tData = qToken.data;
		if (tData && tData.length === 1) {
			fanToken = tData[0];
		} else {
			return new Response(JSON.stringify({
				error: 'data error 2'
			}), {
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json'
				},
				status: 400
			});
		}
	}
	
	
	const since = new Date();
	since.setHours(since.getHours() - 24);
	const { data, error } = await supabase.from('base-token-price').select('created_at,price').eq('token', queryToken) // 条件 1：token 匹配
		.gte('created_at', since.toISOString()) // 条件 2：最近 24 小时
		.order('id', {
			ascending: true
		}).order('created_at', {
			ascending: true
		}).limit(50); // 可选：按时间倒序
	if (error) {
		console.error('查询失败:', error);
		return new Response(JSON.stringify(error), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 400
		});
	}


	if (data.length) {
		data.push({
			'created_at': fanToken.price_last_updated,
			'price': fanToken.price_usd,
		});
	}



	return new Response(JSON.stringify({
		'data': fanToken,
		'price': data
	}), {
		headers: {
			...corsHeaders,
			'Content-Type': 'application/json'
		},
		status: 200
	});
};
