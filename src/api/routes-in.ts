
import { Interface } from 'https://esm.sh/ethers@5.7.2/lib/utils';

import { corsHeaders } from '../_cors.ts';
import { supabase } from '../_database.ts';
import { config } from '../_config.ts';

import routeAbi from '../abi/routeAbi.json' with { type: 'json' };

function getPoolId(token0, token1) {
	return BigInt(token0) < BigInt(token1) ? `${token0.toLowerCase()}-${token1.toLowerCase()}` : `${token1.toLowerCase()}-${token0.toLowerCase()}`;
}

const poolobj = {};
// 1. 构建邻接表
function buildGraph(pools) {
	const graph = {};
	for (const { tokens, data, pool_number } of pools) {
		for (let j = 0; j < tokens.length; j++) {
			for (let k = j + 1; k < tokens.length; k++) {
				let token0 = tokens[j];
				let token1 = tokens[k];
				poolobj[getPoolId(token0, token1)] = {
					tokens,
					data,
					pool_number
				};
				if (!graph[token0]) graph[token0] = new Set();
				if (!graph[token1]) graph[token1] = new Set();
				graph[token0].add(token1);
				graph[token1].add(token0);
			}
		}
	}
	return graph;
}
// 2. DFS 查找所有闭环路径
function findPaths(startToken, endToken, graph, maxDepth = 3) {
	const result = [];
	const path = [
		startToken
	];
	function dfs(current, depth) {
		if (depth >= maxDepth) return;
		for (const neighbor of graph[current] || []) {
			if (neighbor === endToken) {
				result.push([
					...path,
					endToken
				]);
			} else if (!path.includes(neighbor)) {
				path.push(neighbor);
				dfs(neighbor, depth + 1);
				path.pop();
			}
		}
	}
	dfs(startToken, 0);
	return result;
}
function getPoolData(paths) {
	let poolNumber = 0;
	let poolData = [];
	for (let i = 0; i < paths.length - 1; i++) {
		let pid = getPoolId(paths[i], paths[i + 1]);
		if (poolobj[pid]) {
			if (poolobj[pid]?.pool_number) {
				poolNumber += poolobj[pid].pool_number;
			}
			if (poolobj[pid]?.data?.length) {
				poolData = poolData.concat(poolobj[pid].data);
			}
		}
	}
	return {
		'pool_number': poolNumber,
		'paths': paths,
		'pairs': poolData
	};
}
function customSliceArray(inputArray) {
	const maxLength = 10;
	// 如果数组少于10个元素，直接返回
	if (inputArray.length <= maxLength) return inputArray;
	// 前4个元素
	const firstPart = inputArray.slice(0, 4);
	// 剩下的元素（排除前4个）
	const remaining = inputArray.slice(4);
	// 随机数 3~6（包含3和6），但不超过剩下元素的长度
	const randomCount = Math.min(remaining.length, Math.floor(Math.random() * 4) + 3);
	// 打乱剩下的元素（Fisher–Yates 洗牌算法）
	for (let i = remaining.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[remaining[i], remaining[j]] = [
			remaining[j],
			remaining[i]
		];
	}
	// 取出打乱后的前 randomCount 个元素
	const randomPart = remaining.slice(0, randomCount);
	// 合并并返回（最多10个）
	return [
		...firstPart,
		...randomPart
	];
}
function getPathsPairsData(data) {
	let poolexist = {};
	let poolArr = [];
	let pathArr = [];
	for (let i = 0; i < data.length; i++) {
		pathArr.push(data[i].paths);
		let pairs = data[i].pairs;
		for (let j = 0; j < pairs.length; j++) {
			let poolid = pairs[j].pool;
			if (!poolexist[poolid]) {
				poolexist[poolid] = true;
				poolArr.push(pairs[j]);
			}
		}
	}
	return {
		'paths': pathArr,
		'pools': poolArr
	};
}
//const NativeETH = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
export const routesIn = async (chain, req) => {
	const url = new URL(req.url);
	const searchParams = url.searchParams;
	let tokenIn = searchParams.get('tokenIn') || '';
	let tokenOut = searchParams.get('tokenOut') || '';
	let amountStr = searchParams.get('amountIn') || '';
	let tokenInclude = searchParams.get('tokenInclude');
	if (tokenInclude) {
		tokenInclude = tokenInclude.toString();
	}
	let amountIn = 0n;
	if (!tokenIn) {
		return new Response(JSON.stringify({
			error: 'tokenIn is Empty'
		}), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 400
		});
	} else {
		tokenIn = tokenIn.toLowerCase();
		if(tokenIn === config[chain].ether.native.toLowerCase()){
			tokenIn = config[chain].ether.wrapped.toLowerCase();
		}
	}
	if (!tokenOut) {
		return new Response(JSON.stringify({
			error: 'tokenOut is Empty'
		}), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 400
		});
	} else {
		tokenOut = tokenOut.toLowerCase();
		if(tokenOut === config[chain].ether.native.toLowerCase()){
			tokenOut = config[chain].ether.wrapped.toLowerCase();
		}
	}
	if (!amountStr) {
		return new Response(JSON.stringify({
			error: 'amountIn is Empty'
		}), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 400
		});
	} else {
		amountIn = BigInt(amountStr);
	}
	const { data, error } = await supabase.from(`${chain}-pool`).select('tokens, data, pool_number').order('pool_number', {
		ascending: false
	}).limit(10000);
	if (error) {
		return new Response(JSON.stringify({
			message: error?.message ?? error
		}), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 400
		});
	}
	const graph = buildGraph(data);
	const allPaths = findPaths(tokenIn, tokenOut, graph);
	if (allPaths.length === 0) {
		return new Response(JSON.stringify({
			routes: [],
			tokens: []
		}), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 200
		});
	}
	let pathsJump1 = [];
	let pathsJump2 = [];
	let pathsJump3 = [];
	if (allPaths.length > 21) {
		for (let i = 0; i < allPaths.length; i++) {
			if (allPaths[i].length === 2) {
				pathsJump1.push(getPoolData(allPaths[i]));
			} else if (allPaths[i].length === 3) {
				pathsJump2.push(getPoolData(allPaths[i]));
			} else if (allPaths[i].length === 4) {
				pathsJump3.push(getPoolData(allPaths[i]));
			}
		}
		pathsJump2.sort((a, b) => b.pool_number - a.pool_number);
		pathsJump3.sort((a, b) => b.pool_number - a.pool_number);
		pathsJump1 = pathsJump1.concat(customSliceArray(pathsJump2));
		pathsJump1 = pathsJump1.concat(customSliceArray(pathsJump3));
	} else {
		for (let i = 0; i < allPaths.length; i++) {
			pathsJump1.push(getPoolData(allPaths[i]));
		}
	}
	let fanData = getPathsPairsData(pathsJump1);
	const iface = new Interface(routeAbi);
	const calldata = iface.encodeFunctionData("maxPathsOutput", [
		amountIn,
		fanData.paths,
		fanData.pools
	]);
	const postData = {
		"jsonrpc": "2.0",
		"id": 1,
		"method": "eth_call",
		"params": [
			{
				"data": calldata,
				"to": config[chain].routeAddress
			},
			"latest"
		]
	};
	try {
		const response = await fetch(config[chain].rpc, {
			method: "POST",
			body: JSON.stringify(postData)
		});
		const result = await response.json();
		//=================================================
		const isAddToken = {};
		const tokenList = [];
		const getPathsToken = (paths) => {
			let toPaths = [];
			for (let i = 0; i < paths.length; i++) {
				toPaths.push(paths[i].toLowerCase());
				if (!isAddToken[paths[i]]) {
					isAddToken[paths[i]] = true;
					tokenList.push(paths[i].toLowerCase());
				}
			}
			return toPaths;
		};
		const decodeMaxPathsOutput = (returnData) => {
			const decoded = iface.decodeFunctionResult("maxPathsOutput", returnData);
			// decoded[0] 就是 SwapData[]
			return decoded[0].map((swap) => ({
				amountIn: swap.amountIn.toString(),
				amountOut: swap.amountOut.toString(),
				output: swap.output.map((o) => ({
					amountOut: o.amountOut.toString(),
					realAmountOut: o.realAmountOut.toString(),
					realAmountIn: o.realAmountIn.toString(),
					gasEstimate: o.gasEstimate.toString()
				})),
				data: swap.data,
				blockNumber: swap.blockNumber.toString(),
				paths: getPathsToken(swap.paths),
				pools: swap.pools.map((p) => ({
					version: p.version.toString(),
					dapp_id: p.dapp_id.toString()
				}))
			}));
		};
		const getroutes = decodeMaxPathsOutput(result.result);
		let CallbackData = {
			routes: getroutes.sort((a, b) => Number(b.amountOut) - Number(a.amountOut)),
			tokens: []
		};
		if (tokenInclude === 'true') {
			const querytoken = await supabase.from(`${chain}-token`).select('decimals, name, symbol, address, logo, has_permit, price_usd').in('address', tokenList);
			CallbackData.tokens = querytoken.data;
		}
		//==================================================================
		return new Response(JSON.stringify(CallbackData), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 200
		});
	} catch (err) {

		console.log('询价失败', err, config[chain].rpc);
		
		return new Response(JSON.stringify({
			message: 'request error' //err?.message ?? err
		}), {
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			},
			status: 400
		});
	}
};
