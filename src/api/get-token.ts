import { corsHeaders } from '../_cors.ts';
import { supabase } from '../_database.ts';
export const getToken = async (chain, req) => {
	const url = new URL(req.url);
	const searchParams = url.searchParams;
	const page = parseInt(searchParams.get('page') || '1');
	const pageSize = parseInt(searchParams.get('size') || '100');
	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;


console.log('page', page);
console.log('pageSize', pageSize);


	
	let query = supabase.from(`${chain}-token`).select('decimals, name, symbol, address, logo, has_permit, price_usd');
	let keyword = searchParams.get('keyword');
	if (keyword) {
		query = query.or(`name.ilike.%${keyword}%,symbol.ilike.%${keyword}%,address.ilike.%${keyword}%`); // 搜索
	}
	query = query.eq('disabled', false);
	let onlyVerified = searchParams.get('onlyVerified')?.toString();
	if (onlyVerified === 'true') {
		query = query.eq('is_verified', true); // *新增筛选条件*
	}
	const { data, error } = await query.order('sorting', {
		ascending: false // 根据 sorting 降序排列
	}).order('id', {
		ascending: true
	}).range(from, to);
	if (error) {
		throw error;
	}
	return new Response(JSON.stringify(data), {
		headers: {
			...corsHeaders,
			'Content-Type': 'application/json'
		},
		status: 200
	});
};
