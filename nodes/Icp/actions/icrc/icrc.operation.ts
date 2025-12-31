/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, IDataObject, INodeProperties } from 'n8n-workflow';
import { createAgent, createActor } from '../../transport/agent';
import { icrc1IdlFactory, icrc2IdlFactory } from '../../transport/candid';
import { Principal } from '@dfinity/principal';

export const icrcOperationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['icrc'],
			},
		},
		options: [
			{
				name: 'Approve (ICRC-2)',
				value: 'approve',
				description: 'Approve a spender to transfer tokens',
				action: 'Approve spender',
			},
			{
				name: 'Get Allowance (ICRC-2)',
				value: 'getAllowance',
				description: 'Get token allowance for a spender',
				action: 'Get allowance',
			},
			{
				name: 'Get Balance (ICRC-1)',
				value: 'getBalance',
				description: 'Get ICRC-1 token balance for an account',
				action: 'Get balance',
			},
			{
				name: 'Get Metadata (ICRC-1)',
				value: 'getMetadata',
				description: 'Get token metadata (name, symbol, decimals, fee)',
				action: 'Get metadata',
			},
			{
				name: 'Get Transactions (ICRC-3)',
				value: 'getTransactions',
				description: 'Get token transaction history',
				action: 'Get transactions',
			},
			{
				name: 'Transfer (ICRC-1)',
				value: 'transfer',
				description: 'Transfer ICRC-1 tokens',
				action: 'Transfer tokens',
			},
			{
				name: 'Transfer From (ICRC-2)',
				value: 'transferFrom',
				description: 'Transfer tokens on behalf of another account',
				action: 'Transfer from',
			},
		],
		default: 'getMetadata',
	},
	{
		displayName: 'Token Canister ID',
		name: 'tokenCanisterId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['icrc'],
			},
		},
		placeholder: 'e.g., ryjl3-tyaaa-aaaaa-aaaba-cai',
		description: 'The canister ID of the ICRC token',
	},
	{
		displayName: 'Owner Principal',
		name: 'ownerPrincipal',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['icrc'],
				operation: ['getBalance', 'getAllowance'],
			},
		},
		description: 'Principal ID of the account owner (leave empty to use caller)',
	},
	{
		displayName: 'Spender Principal',
		name: 'spenderPrincipal',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['icrc'],
				operation: ['approve', 'getAllowance'],
			},
		},
		description: 'Principal ID of the spender',
	},
	{
		displayName: 'To Principal',
		name: 'toPrincipal',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['icrc'],
				operation: ['transfer', 'transferFrom'],
			},
		},
		description: 'Principal ID of the recipient',
	},
	{
		displayName: 'From Principal',
		name: 'fromPrincipal',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['icrc'],
				operation: ['transferFrom'],
			},
		},
		description: 'Principal ID of the account to transfer from',
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['icrc'],
				operation: ['transfer', 'approve', 'transferFrom'],
			},
		},
		description: 'Amount to transfer or approve (in smallest unit)',
	},
];

interface Icrc1Service {
	icrc1_name: () => Promise<string>;
	icrc1_symbol: () => Promise<string>;
	icrc1_decimals: () => Promise<number>;
	icrc1_fee: () => Promise<bigint>;
	icrc1_total_supply: () => Promise<bigint>;
	icrc1_balance_of: (account: { owner: Principal; subaccount: [] | [Uint8Array] }) => Promise<bigint>;
	icrc1_transfer: (args: {
		from_subaccount: [] | [Uint8Array];
		to: { owner: Principal; subaccount: [] | [Uint8Array] };
		amount: bigint;
		fee: [] | [bigint];
		memo: [] | [Uint8Array];
		created_at_time: [] | [bigint];
	}) => Promise<{ Ok: bigint } | { Err: unknown }>;
}

interface Icrc2Service {
	icrc2_approve: (args: {
		from_subaccount: [] | [Uint8Array];
		spender: { owner: Principal; subaccount: [] | [Uint8Array] };
		amount: bigint;
		expected_allowance: [] | [bigint];
		expires_at: [] | [bigint];
		fee: [] | [bigint];
		memo: [] | [Uint8Array];
		created_at_time: [] | [bigint];
	}) => Promise<{ Ok: bigint } | { Err: unknown }>;
	icrc2_transfer_from: (args: {
		spender_subaccount: [] | [Uint8Array];
		from: { owner: Principal; subaccount: [] | [Uint8Array] };
		to: { owner: Principal; subaccount: [] | [Uint8Array] };
		amount: bigint;
		fee: [] | [bigint];
		memo: [] | [Uint8Array];
		created_at_time: [] | [bigint];
	}) => Promise<{ Ok: bigint } | { Err: unknown }>;
	icrc2_allowance: (args: {
		account: { owner: Principal; subaccount: [] | [Uint8Array] };
		spender: { owner: Principal; subaccount: [] | [Uint8Array] };
	}) => Promise<{ allowance: bigint; expires_at: [] | [bigint] }>;
}

export async function getMetadata(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const tokenCanisterId = this.getNodeParameter('tokenCanisterId', itemIndex) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const actor = createActor<Icrc1Service>(agent, tokenCanisterId, icrc1IdlFactory);

	const [name, symbol, decimals, fee, totalSupply] = await Promise.all([
		actor.icrc1_name(),
		actor.icrc1_symbol(),
		actor.icrc1_decimals(),
		actor.icrc1_fee(),
		actor.icrc1_total_supply(),
	]);

	return {
		tokenCanisterId,
		name,
		symbol,
		decimals,
		fee: fee.toString(),
		totalSupply: totalSupply.toString(),
	};
}

export async function getBalance(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const tokenCanisterId = this.getNodeParameter('tokenCanisterId', itemIndex) as string;
	const ownerPrincipal = this.getNodeParameter('ownerPrincipal', itemIndex, '') as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const owner = ownerPrincipal ? Principal.fromText(ownerPrincipal) : Principal.anonymous();
	const actor = createActor<Icrc1Service>(agent, tokenCanisterId, icrc1IdlFactory);

	const balance = await actor.icrc1_balance_of({
		owner,
		subaccount: [],
	});

	return {
		tokenCanisterId,
		owner: owner.toText(),
		balance: balance.toString(),
	};
}

export async function transfer(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const tokenCanisterId = this.getNodeParameter('tokenCanisterId', itemIndex) as string;
	const toPrincipal = this.getNodeParameter('toPrincipal', itemIndex) as string;
	const amount = this.getNodeParameter('amount', itemIndex) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const actor = createActor<Icrc1Service>(agent, tokenCanisterId, icrc1IdlFactory);

	const result = await actor.icrc1_transfer({
		from_subaccount: [],
		to: {
			owner: Principal.fromText(toPrincipal),
			subaccount: [],
		},
		amount: BigInt(amount),
		fee: [],
		memo: [],
		created_at_time: [],
	});

	if ('Ok' in result) {
		return {
			success: true,
			blockIndex: result.Ok.toString(),
			tokenCanisterId,
			to: toPrincipal,
			amount,
		};
	}

	return {
		success: false,
		error: JSON.stringify(result.Err),
		tokenCanisterId,
		to: toPrincipal,
		amount,
	};
}

export async function approve(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const tokenCanisterId = this.getNodeParameter('tokenCanisterId', itemIndex) as string;
	const spenderPrincipal = this.getNodeParameter('spenderPrincipal', itemIndex) as string;
	const amount = this.getNodeParameter('amount', itemIndex) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const actor = createActor<Icrc2Service>(agent, tokenCanisterId, icrc2IdlFactory);

	const result = await actor.icrc2_approve({
		from_subaccount: [],
		spender: {
			owner: Principal.fromText(spenderPrincipal),
			subaccount: [],
		},
		amount: BigInt(amount),
		expected_allowance: [],
		expires_at: [],
		fee: [],
		memo: [],
		created_at_time: [],
	});

	if ('Ok' in result) {
		return {
			success: true,
			blockIndex: result.Ok.toString(),
			tokenCanisterId,
			spender: spenderPrincipal,
			amount,
		};
	}

	return {
		success: false,
		error: JSON.stringify(result.Err),
		tokenCanisterId,
		spender: spenderPrincipal,
		amount,
	};
}

export async function transferFrom(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const tokenCanisterId = this.getNodeParameter('tokenCanisterId', itemIndex) as string;
	const fromPrincipal = this.getNodeParameter('fromPrincipal', itemIndex) as string;
	const toPrincipal = this.getNodeParameter('toPrincipal', itemIndex) as string;
	const amount = this.getNodeParameter('amount', itemIndex) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const actor = createActor<Icrc2Service>(agent, tokenCanisterId, icrc2IdlFactory);

	const result = await actor.icrc2_transfer_from({
		spender_subaccount: [],
		from: {
			owner: Principal.fromText(fromPrincipal),
			subaccount: [],
		},
		to: {
			owner: Principal.fromText(toPrincipal),
			subaccount: [],
		},
		amount: BigInt(amount),
		fee: [],
		memo: [],
		created_at_time: [],
	});

	if ('Ok' in result) {
		return {
			success: true,
			blockIndex: result.Ok.toString(),
			tokenCanisterId,
			from: fromPrincipal,
			to: toPrincipal,
			amount,
		};
	}

	return {
		success: false,
		error: JSON.stringify(result.Err),
		tokenCanisterId,
		from: fromPrincipal,
		to: toPrincipal,
		amount,
	};
}

export async function getAllowance(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const tokenCanisterId = this.getNodeParameter('tokenCanisterId', itemIndex) as string;
	const ownerPrincipal = this.getNodeParameter('ownerPrincipal', itemIndex, '') as string;
	const spenderPrincipal = this.getNodeParameter('spenderPrincipal', itemIndex) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const owner = ownerPrincipal ? Principal.fromText(ownerPrincipal) : Principal.anonymous();
	const actor = createActor<Icrc2Service>(agent, tokenCanisterId, icrc2IdlFactory);

	const result = await actor.icrc2_allowance({
		account: {
			owner,
			subaccount: [],
		},
		spender: {
			owner: Principal.fromText(spenderPrincipal),
			subaccount: [],
		},
	});

	return {
		tokenCanisterId,
		owner: owner.toText(),
		spender: spenderPrincipal,
		allowance: result.allowance.toString(),
		expiresAt: result.expires_at && result.expires_at.length > 0 ? result.expires_at[0].toString() : null,
	};
}

export async function getTransactions(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const tokenCanisterId = this.getNodeParameter('tokenCanisterId', itemIndex) as string;

	return {
		tokenCanisterId,
		transactions: [],
		note: 'ICRC-3 get_transactions not yet implemented',
	};
}

// Export aliases for Icp.node.ts compatibility
export { getMetadata as getIcrcMetadata };
export { getBalance as getIcrcBalance };
export { transfer as icrcTransfer };
export { approve as icrcApprove };
export { transferFrom as icrcTransferFrom };
export { getAllowance as getIcrcAllowance };
export { getTransactions as getIcrcTransactions };
