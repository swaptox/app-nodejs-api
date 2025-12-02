import { Errors, createClient } from 'https://esm.sh/@farcaster/quick-auth';
import { corsHeaders } from '../_cors.ts';
import { supabase } from '../_database.ts';
const client = createClient();
async function getUserInfo(fid) {
	try {
		const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': Deno.env.get('NEYNAR_API_KEY')
			}
		});
		//console.log('getUserInfo', response);
		if (response.ok) {
			const data = await response.json();
			return data.users[0];
		}
	} catch (error) {
		console.error('getUserInfo', error);
	}
	return {
		is_error: true
	};
}
async function farcasterUser(fid, userResult) {
	try {
		const myUser = await supabase.from('farcaster-user').select('*').eq('fid', fid).limit(1);
		let dataid = '';
		if (myUser.data.length > 0) {
			const updatedAt = myUser.data[0].update_at;
			const updatedAtDate = new Date(updatedAt).getTime();
			const now = new Date().getTime();
			const timeDiff = now - updatedAtDate;
			const twelveHoursInMs = 6 * 60 * 60 * 1000; // 6小时 * 60分钟 * 60秒 * 1000毫秒
			if (timeDiff < twelveHoursInMs) {
				return Object.assign({}, myUser.data[0], userResult);
			}
			dataid = myUser.data[0].id;
		}
		let uInfo = await getUserInfo(fid);
		if (uInfo.is_error) {
			return userResult;
		}
		let updateData = {
			username: uInfo.username || '',
			display_name: uInfo.display_name || '',
			pfp_url: uInfo.pfp_url || '',
			bio_text: uInfo?.profile?.bio?.text || '',
			url: uInfo.url || '',
			address: userResult.address
		};
		if (dataid) {
			await supabase.from('farcaster-user').update(Object.assign({
				update_at: new Date()
			}, updateData)).eq('id', dataid);
		} else {
			await supabase.from('farcaster-user').insert(Object.assign({
				'fid': fid
			}, updateData));
		}
		return Object.assign({}, updateData, userResult);
	} catch (err) { }
	return {
		is_error: true
	};
}
async function resolveUser(fid) {
	let userResult = {};
	try {
		const response = await fetch(`https://api.farcaster.xyz/fc/primary-address?fid=${fid}&protocol=ethereum`);
		const result = await response.json();
		userResult = result.result.address;
	} catch (err) { }
	return await farcasterUser(fid, userResult);
}
export const farcasterAuth = async (chain, req) => {
	const authorization = req.headers?.get('Authorization');
	if (!authorization || !authorization.startsWith('Bearer ')) {
		return new Response(JSON.stringify({
			error: 'Missing token'
		}), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 401
		});
	}
	const url = new URL(req.url);
	const searchParams = url.searchParams;
	const hostname = searchParams.get('hostname') || '';
	if (!hostname) {
		return new Response(JSON.stringify({
			error: 'hostname is Empty'
		}), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 400
		});
	}
	const token = req.headers?.get('Authorization')?.replace('Bearer ', '');
	try {
		const payload = await client.verifyJwt({
			'token': token,
			'domain': hostname
		});
		const user = await resolveUser(payload.sub);
		if (user.is_error || !user.address) {
			return new Response(JSON.stringify({
				error: 'Request error'
			}), {
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json'
				},
				status: 401
			});
		}
		return new Response(JSON.stringify(user), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 200
		});
	} catch (e) {
		if (e instanceof Errors.InvalidTokenError) {
			console.error('Invalid token:', e.message);
			return new Response(JSON.stringify({
				error: 'Invalid token'
			}), {
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json'
				},
				status: 401
			});
		}
	}
};
