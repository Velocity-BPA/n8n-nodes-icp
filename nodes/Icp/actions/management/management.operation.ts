/**
 * Management Canister Operations for Internet Computer
 *
 * Copyright © 2025 Velocity BPA. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE file in the project root for full license information.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { createAgent, createActor, AgentCredentials } from '../../transport/agent';
import { SYSTEM_CANISTERS } from '../../constants/canisters';
import { IcpError, ICP_ERROR_CODES } from '../../constants/errors';
import { Principal } from '@dfinity/principal';

// Management canister IDL factory
const managementIdlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
	const CanisterSettings = IDL.Record({
		controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
		compute_allocation: IDL.Opt(IDL.Nat),
		memory_allocation: IDL.Opt(IDL.Nat),
		freezing_threshold: IDL.Opt(IDL.Nat),
	});

	const CreateCanisterArgs = IDL.Record({
		settings: IDL.Opt(CanisterSettings),
	});

	const UpdateSettingsArgs = IDL.Record({
		canister_id: IDL.Principal,
		settings: CanisterSettings,
	});

	const CanisterIdRecord = IDL.Record({
		canister_id: IDL.Principal,
	});

	const EcdsaPublicKeyArgs = IDL.Record({
		canister_id: IDL.Opt(IDL.Principal),
		derivation_path: IDL.Vec(IDL.Vec(IDL.Nat8)),
		key_id: IDL.Record({
			curve: IDL.Variant({ secp256k1: IDL.Null }),
			name: IDL.Text,
		}),
	});

	const EcdsaPublicKeyResult = IDL.Record({
		public_key: IDL.Vec(IDL.Nat8),
		chain_code: IDL.Vec(IDL.Nat8),
	});

	const SignWithEcdsaArgs = IDL.Record({
		message_hash: IDL.Vec(IDL.Nat8),
		derivation_path: IDL.Vec(IDL.Vec(IDL.Nat8)),
		key_id: IDL.Record({
			curve: IDL.Variant({ secp256k1: IDL.Null }),
			name: IDL.Text,
		}),
	});

	const SignWithEcdsaResult = IDL.Record({
		signature: IDL.Vec(IDL.Nat8),
	});

	const HttpHeader = IDL.Record({
		name: IDL.Text,
		value: IDL.Text,
	});

	const HttpRequestArgs = IDL.Record({
		url: IDL.Text,
		max_response_bytes: IDL.Opt(IDL.Nat64),
		method: IDL.Variant({
			get: IDL.Null,
			post: IDL.Null,
			head: IDL.Null,
		}),
		headers: IDL.Vec(HttpHeader),
		body: IDL.Opt(IDL.Vec(IDL.Nat8)),
		transform: IDL.Opt(IDL.Record({
			function: IDL.Func([IDL.Record({
				context: IDL.Vec(IDL.Nat8),
				response: IDL.Record({
					status: IDL.Nat,
					headers: IDL.Vec(HttpHeader),
					body: IDL.Vec(IDL.Nat8),
				}),
			})], [IDL.Record({
				body: IDL.Vec(IDL.Nat8),
			})], ['query']),
			context: IDL.Vec(IDL.Nat8),
		})),
	});

	const HttpRequestResult = IDL.Record({
		status: IDL.Nat,
		headers: IDL.Vec(HttpHeader),
		body: IDL.Vec(IDL.Nat8),
	});

	const BitcoinNetwork = IDL.Variant({
		mainnet: IDL.Null,
		testnet: IDL.Null,
	});

	const BitcoinGetBalanceArgs = IDL.Record({
		address: IDL.Text,
		network: BitcoinNetwork,
		min_confirmations: IDL.Opt(IDL.Nat32),
	});

	const Outpoint = IDL.Record({
		txid: IDL.Vec(IDL.Nat8),
		vout: IDL.Nat32,
	});

	const Utxo = IDL.Record({
		outpoint: Outpoint,
		value: IDL.Nat64,
		height: IDL.Nat32,
	});

	const BitcoinGetUtxosArgs = IDL.Record({
		address: IDL.Text,
		network: BitcoinNetwork,
		filter: IDL.Opt(IDL.Variant({
			min_confirmations: IDL.Nat32,
			page: IDL.Vec(IDL.Nat8),
		})),
	});

	const BitcoinGetUtxosResult = IDL.Record({
		utxos: IDL.Vec(Utxo),
		tip_block_hash: IDL.Vec(IDL.Nat8),
		tip_height: IDL.Nat32,
		next_page: IDL.Opt(IDL.Vec(IDL.Nat8)),
	});

	const BitcoinSendTransactionArgs = IDL.Record({
		transaction: IDL.Vec(IDL.Nat8),
		network: BitcoinNetwork,
	});

	return IDL.Service({
		create_canister: IDL.Func([CreateCanisterArgs], [CanisterIdRecord], []),
		update_settings: IDL.Func([UpdateSettingsArgs], [], []),
		ecdsa_public_key: IDL.Func([EcdsaPublicKeyArgs], [EcdsaPublicKeyResult], []),
		sign_with_ecdsa: IDL.Func([SignWithEcdsaArgs], [SignWithEcdsaResult], []),
		http_request: IDL.Func([HttpRequestArgs], [HttpRequestResult], []),
		bitcoin_get_balance: IDL.Func([BitcoinGetBalanceArgs], [IDL.Nat64], []),
		bitcoin_get_utxos: IDL.Func([BitcoinGetUtxosArgs], [BitcoinGetUtxosResult], []),
		bitcoin_send_transaction: IDL.Func([BitcoinSendTransactionArgs], [], []),
		raw_rand: IDL.Func([], [IDL.Vec(IDL.Nat8)], []),
	});
};

// Management service interface
interface ManagementService {
	create_canister: (args: {
		settings: [] | [{
			controllers: [] | [Principal[]];
			compute_allocation: [] | [bigint];
			memory_allocation: [] | [bigint];
			freezing_threshold: [] | [bigint];
		}];
	}) => Promise<{ canister_id: Principal }>;

	update_settings: (args: {
		canister_id: Principal;
		settings: {
			controllers: [] | [Principal[]];
			compute_allocation: [] | [bigint];
			memory_allocation: [] | [bigint];
			freezing_threshold: [] | [bigint];
		};
	}) => Promise<void>;

	ecdsa_public_key: (args: {
		canister_id: [] | [Principal];
		derivation_path: Uint8Array[];
		key_id: { curve: { secp256k1: null }; name: string };
	}) => Promise<{ public_key: Uint8Array; chain_code: Uint8Array }>;

	sign_with_ecdsa: (args: {
		message_hash: Uint8Array;
		derivation_path: Uint8Array[];
		key_id: { curve: { secp256k1: null }; name: string };
	}) => Promise<{ signature: Uint8Array }>;

	http_request: (args: {
		url: string;
		max_response_bytes: [] | [bigint];
		method: { get: null } | { post: null } | { head: null };
		headers: Array<{ name: string; value: string }>;
		body: [] | [Uint8Array];
		transform: [];
	}) => Promise<{
		status: bigint;
		headers: Array<{ name: string; value: string }>;
		body: Uint8Array;
	}>;

	bitcoin_get_balance: (args: {
		address: string;
		network: { mainnet: null } | { testnet: null };
		min_confirmations: [] | [number];
	}) => Promise<bigint>;

	bitcoin_get_utxos: (args: {
		address: string;
		network: { mainnet: null } | { testnet: null };
		filter: [] | [{ min_confirmations: number } | { page: Uint8Array }];
	}) => Promise<{
		utxos: Array<{
			outpoint: { txid: Uint8Array; vout: number };
			value: bigint;
			height: number;
		}>;
		tip_block_hash: Uint8Array;
		tip_height: number;
		next_page: [] | [Uint8Array];
	}>;

	bitcoin_send_transaction: (args: {
		transaction: Uint8Array;
		network: { mainnet: null } | { testnet: null };
	}) => Promise<void>;

	raw_rand: () => Promise<Uint8Array>;
}

// Helper to get credentials
function getAgentCredentials(credentials: unknown): AgentCredentials {
	const creds = credentials as {
		network?: string;
		customNetworkUrl?: string;
		identityType?: string;
		privateKey?: string;
	};
	return {
		network: creds.network || 'mainnet',
		customNetworkUrl: creds.customNetworkUrl,
		identityType: (creds.identityType || 'anonymous') as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: creds.privateKey,
	};
}

/**
 * Management operation properties
 */
export const managementOperationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['management'],
			},
		},
		options: [
			{
				name: 'Create Canister',
				value: 'createCanister',
				description: 'Create a new canister on the IC',
				action: 'Create canister',
			},
			{
				name: 'Update Settings',
				value: 'updateSettings',
				description: 'Update canister settings',
				action: 'Update settings',
			},
			{
				name: 'Get ECDSA Public Key',
				value: 'getEcdsaPublicKey',
				description: 'Get threshold ECDSA public key',
				action: 'Get ECDSA public key',
			},
			{
				name: 'Sign With ECDSA',
				value: 'signWithEcdsa',
				description: 'Sign a message with threshold ECDSA',
				action: 'Sign with ECDSA',
			},
			{
				name: 'HTTP Outcall',
				value: 'httpOutcall',
				description: 'Make an HTTP request from the IC',
				action: 'HTTP outcall',
			},
			{
				name: 'Get Bitcoin Balance',
				value: 'getBitcoinBalance',
				description: 'Get Bitcoin balance for an address',
				action: 'Get Bitcoin balance',
			},
			{
				name: 'Get Bitcoin UTXOs',
				value: 'getBitcoinUtxos',
				description: 'Get Bitcoin UTXOs for an address',
				action: 'Get Bitcoin UTXOs',
			},
			{
				name: 'Send Bitcoin Transaction',
				value: 'sendBitcoinTransaction',
				description: 'Send a Bitcoin transaction',
				action: 'Send Bitcoin transaction',
			},
			{
				name: 'Get Random Bytes',
				value: 'getRandomBytes',
				description: 'Get cryptographically secure random bytes',
				action: 'Get random bytes',
			},
		],
		default: 'createCanister',
	},
	// Create canister fields
	{
		displayName: 'Controllers',
		name: 'controllers',
		type: 'string',
		default: '',
		description: 'Comma-separated list of controller principals',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['createCanister', 'updateSettings'],
			},
		},
	},
	{
		displayName: 'Compute Allocation',
		name: 'computeAllocation',
		type: 'number',
		default: 0,
		description: 'Compute allocation percentage (0-100)',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['createCanister', 'updateSettings'],
			},
		},
	},
	{
		displayName: 'Memory Allocation',
		name: 'memoryAllocation',
		type: 'number',
		default: 0,
		description: 'Memory allocation in bytes',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['createCanister', 'updateSettings'],
			},
		},
	},
	{
		displayName: 'Freezing Threshold',
		name: 'freezingThreshold',
		type: 'number',
		default: 2592000,
		description: 'Freezing threshold in seconds',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['createCanister', 'updateSettings'],
			},
		},
	},
	{
		displayName: 'Cycles Amount',
		name: 'cyclesAmount',
		type: 'number',
		default: 0,
		description: 'Amount of cycles to deposit',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['createCanister'],
			},
		},
	},
	// Update settings fields
	{
		displayName: 'Canister ID',
		name: 'canisterId',
		type: 'string',
		default: '',
		required: true,
		description: 'Target canister ID',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['updateSettings'],
			},
		},
	},
	// ECDSA fields
	{
		displayName: 'Key Name',
		name: 'keyName',
		type: 'string',
		default: 'dfx_test_key',
		description: 'Name of the threshold ECDSA key',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['getEcdsaPublicKey', 'signWithEcdsa'],
			},
		},
	},
	{
		displayName: 'Derivation Path',
		name: 'derivationPath',
		type: 'string',
		default: '',
		description: 'Derivation path as hex-encoded bytes separated by /',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['getEcdsaPublicKey', 'signWithEcdsa'],
			},
		},
	},
	{
		displayName: 'Message Hash',
		name: 'messageHash',
		type: 'string',
		default: '',
		required: true,
		description: '32-byte message hash in hex format',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['signWithEcdsa'],
			},
		},
	},
	// HTTP Outcall fields
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		description: 'URL to fetch',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['httpOutcall'],
			},
		},
	},
	{
		displayName: 'HTTP Method',
		name: 'httpMethod',
		type: 'options',
		options: [
			{ name: 'GET', value: 'get' },
			{ name: 'POST', value: 'post' },
			{ name: 'HEAD', value: 'head' },
		],
		default: 'get',
		description: 'HTTP method to use',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['httpOutcall'],
			},
		},
	},
	{
		displayName: 'Request Headers',
		name: 'requestHeaders',
		type: 'json',
		default: '{}',
		description: 'Request headers as JSON object',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['httpOutcall'],
			},
		},
	},
	{
		displayName: 'Request Body',
		name: 'requestBody',
		type: 'string',
		default: '',
		description: 'Request body (for POST requests)',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['httpOutcall'],
			},
		},
	},
	{
		displayName: 'Max Response Bytes',
		name: 'maxResponseBytes',
		type: 'number',
		default: 2000000,
		description: 'Maximum response size in bytes',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['httpOutcall'],
			},
		},
	},
	// Bitcoin fields
	{
		displayName: 'Bitcoin Address',
		name: 'bitcoinAddress',
		type: 'string',
		default: '',
		required: true,
		description: 'Bitcoin address',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['getBitcoinBalance', 'getBitcoinUtxos'],
			},
		},
	},
	{
		displayName: 'Bitcoin Network',
		name: 'bitcoinNetwork',
		type: 'options',
		options: [
			{ name: 'Mainnet', value: 'mainnet' },
			{ name: 'Testnet', value: 'testnet' },
		],
		default: 'mainnet',
		description: 'Bitcoin network',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['getBitcoinBalance', 'getBitcoinUtxos', 'sendBitcoinTransaction'],
			},
		},
	},
	{
		displayName: 'Min Confirmations',
		name: 'minConfirmations',
		type: 'number',
		default: 1,
		description: 'Minimum number of confirmations',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['getBitcoinBalance', 'getBitcoinUtxos'],
			},
		},
	},
	{
		displayName: 'Transaction Hex',
		name: 'transactionHex',
		type: 'string',
		default: '',
		required: true,
		description: 'Signed Bitcoin transaction in hex format',
		displayOptions: {
			show: {
				resource: ['management'],
				operation: ['sendBitcoinTransaction'],
			},
		},
	},
];

/**
 * Create a new canister on the IC
 */
export async function createCanister(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);

	const controllersInput = this.getNodeParameter('controllers', index, '') as string;
	const computeAllocation = this.getNodeParameter('computeAllocation', index, 0) as number;
	const memoryAllocation = this.getNodeParameter('memoryAllocation', index, 0) as number;
	const freezingThreshold = this.getNodeParameter('freezingThreshold', index, 2592000) as number;
	const cyclesAmount = this.getNodeParameter('cyclesAmount', index, 0) as number;

	const agent = await createAgent(agentCredentials);

	const controllers = controllersInput
		? controllersInput.split(',').map((c: string) => Principal.fromText(c.trim()))
		: [];

	const settings = {
		controllers: controllers.length > 0 ? [controllers] : [] as [] | [Principal[]],
		compute_allocation: computeAllocation > 0 ? [BigInt(computeAllocation)] : [] as [] | [bigint],
		memory_allocation: memoryAllocation > 0 ? [BigInt(memoryAllocation)] : [] as [] | [bigint],
		freezing_threshold: freezingThreshold > 0 ? [BigInt(freezingThreshold)] : [] as [] | [bigint],
	};

	try {
		const actor = createActor<ManagementService>(
			agent,
			SYSTEM_CANISTERS.management,
			managementIdlFactory as any,
		);

		const result = await actor.create_canister({
			settings: [settings],
		} as any);

		return [
			{
				json: {
					success: true,
					canisterId: result.canister_id.toText(),
					settings: {
						controllers: controllers.map((c: Principal) => c.toText()),
						computeAllocation,
						memoryAllocation,
						freezingThreshold,
					},
					cyclesDeposited: cyclesAmount,
				},
			},
		];
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Failed to create canister: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Update canister settings
 */
export async function updateSettings(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);

	const canisterId = this.getNodeParameter('canisterId', index) as string;
	const controllersInput = this.getNodeParameter('controllers', index, '') as string;
	const computeAllocation = this.getNodeParameter('computeAllocation', index, 0) as number;
	const memoryAllocation = this.getNodeParameter('memoryAllocation', index, 0) as number;
	const freezingThreshold = this.getNodeParameter('freezingThreshold', index, 2592000) as number;

	const agent = await createAgent(agentCredentials);

	const controllers = controllersInput
		? controllersInput.split(',').map((c: string) => Principal.fromText(c.trim()))
		: [];

	const settings = {
		controllers: controllers.length > 0 ? [controllers] : [] as [] | [Principal[]],
		compute_allocation: computeAllocation > 0 ? [BigInt(computeAllocation)] : [] as [] | [bigint],
		memory_allocation: memoryAllocation > 0 ? [BigInt(memoryAllocation)] : [] as [] | [bigint],
		freezing_threshold: freezingThreshold > 0 ? [BigInt(freezingThreshold)] : [] as [] | [bigint],
	};

	try {
		const actor = createActor<ManagementService>(
			agent,
			SYSTEM_CANISTERS.management,
			managementIdlFactory as any,
		);

		await actor.update_settings({
			canister_id: Principal.fromText(canisterId),
			settings,
		} as any);

		return [
			{
				json: {
					success: true,
					canisterId,
					updatedSettings: {
						controllers: controllers.map((c: Principal) => c.toText()),
						computeAllocation,
						memoryAllocation,
						freezingThreshold,
					},
				},
			},
		];
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get threshold ECDSA public key
 */
export async function getEcdsaPublicKey(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);

	const keyName = this.getNodeParameter('keyName', index, 'dfx_test_key') as string;
	const derivationPathStr = this.getNodeParameter('derivationPath', index, '') as string;

	const derivationPath: Uint8Array[] = derivationPathStr
		? derivationPathStr.split('/').map((p) => new Uint8Array(Buffer.from(p, 'hex')))
		: [];

	const agent = await createAgent(agentCredentials);

	try {
		const actor = createActor<ManagementService>(
			agent,
			SYSTEM_CANISTERS.management,
			managementIdlFactory as any,
		);

		const result = await actor.ecdsa_public_key({
			canister_id: [],
			derivation_path: derivationPath,
			key_id: {
				curve: { secp256k1: null },
				name: keyName,
			},
		});

		return [
			{
				json: {
					success: true,
					publicKey: Buffer.from(result.public_key).toString('hex'),
					chainCode: Buffer.from(result.chain_code).toString('hex'),
					keyId: {
						curve: 'secp256k1',
						name: keyName,
					},
				},
			},
		];
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Failed to get ECDSA public key: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Sign with threshold ECDSA
 */
export async function signWithEcdsa(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);

	const keyName = this.getNodeParameter('keyName', index, 'dfx_test_key') as string;
	const derivationPathStr = this.getNodeParameter('derivationPath', index, '') as string;
	const messageHashHex = this.getNodeParameter('messageHash', index) as string;

	const derivationPath: Uint8Array[] = derivationPathStr
		? derivationPathStr.split('/').map((p) => new Uint8Array(Buffer.from(p, 'hex')))
		: [];

	const messageHash = new Uint8Array(Buffer.from(messageHashHex.replace(/^0x/, ''), 'hex'));

	if (messageHash.length !== 32) {
		throw new IcpError(
			ICP_ERROR_CODES.VALIDATION_ERROR,
			'Message hash must be exactly 32 bytes',
		);
	}

	const agent = await createAgent(agentCredentials);

	try {
		const actor = createActor<ManagementService>(
			agent,
			SYSTEM_CANISTERS.management,
			managementIdlFactory as any,
		);

		const result = await actor.sign_with_ecdsa({
			message_hash: messageHash,
			derivation_path: derivationPath,
			key_id: {
				curve: { secp256k1: null },
				name: keyName,
			},
		});

		return [
			{
				json: {
					success: true,
					signature: Buffer.from(result.signature).toString('hex'),
					keyId: {
						curve: 'secp256k1',
						name: keyName,
					},
				},
			},
		];
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Failed to sign with ECDSA: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Make an HTTP outcall
 */
export async function httpOutcall(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);

	const url = this.getNodeParameter('url', index) as string;
	const httpMethod = this.getNodeParameter('httpMethod', index, 'get') as string;
	const headersJson = this.getNodeParameter('requestHeaders', index, '{}') as string;
	const body = this.getNodeParameter('requestBody', index, '') as string;
	const maxResponseBytes = this.getNodeParameter('maxResponseBytes', index, 2000000) as number;

	const headers: Array<{ name: string; value: string }> = [];
	try {
		const parsedHeaders = JSON.parse(headersJson);
		for (const [name, value] of Object.entries(parsedHeaders)) {
			headers.push({ name, value: String(value) });
		}
	} catch {
		// Invalid JSON, ignore
	}

	const agent = await createAgent(agentCredentials);

	try {
		const actor = createActor<ManagementService>(
			agent,
			SYSTEM_CANISTERS.management,
			managementIdlFactory as any,
		);

		const methodVariant = httpMethod === 'post' 
			? { post: null } 
			: httpMethod === 'head' 
				? { head: null } 
				: { get: null };

		const result = await actor.http_request({
			url,
			max_response_bytes: [BigInt(maxResponseBytes)],
			method: methodVariant as { get: null } | { post: null } | { head: null },
			headers,
			body: body ? [new Uint8Array(Buffer.from(body))] : [],
			transform: [],
		});

		const responseHeaders: Record<string, string> = {};
		for (const h of result.headers) {
			responseHeaders[h.name] = h.value;
		}

		return [
			{
				json: {
					success: true,
					status: Number(result.status),
					headers: responseHeaders,
					body: Buffer.from(result.body).toString('utf-8'),
					bodyHex: Buffer.from(result.body).toString('hex'),
				},
			},
		];
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`HTTP outcall failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get Bitcoin balance
 */
export async function getBitcoinBalance(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);

	const address = this.getNodeParameter('bitcoinAddress', index) as string;
	const network = this.getNodeParameter('bitcoinNetwork', index, 'mainnet') as string;
	const minConfirmations = this.getNodeParameter('minConfirmations', index, 1) as number;

	const agent = await createAgent(agentCredentials);

	try {
		const actor = createActor<ManagementService>(
			agent,
			SYSTEM_CANISTERS.management,
			managementIdlFactory as any,
		);

		const networkVariant = network === 'testnet' 
			? { testnet: null } 
			: { mainnet: null };

		const balance = await actor.bitcoin_get_balance({
			address,
			network: networkVariant as { mainnet: null } | { testnet: null },
			min_confirmations: minConfirmations > 0 ? [minConfirmations] : [],
		});

		return [
			{
				json: {
					success: true,
					address,
					network,
					balance: balance.toString(),
					balanceSatoshis: Number(balance),
					balanceBtc: Number(balance) / 100000000,
				},
			},
		];
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Failed to get Bitcoin balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get Bitcoin UTXOs
 */
export async function getBitcoinUtxos(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);

	const address = this.getNodeParameter('bitcoinAddress', index) as string;
	const network = this.getNodeParameter('bitcoinNetwork', index, 'mainnet') as string;
	const minConfirmations = this.getNodeParameter('minConfirmations', index, 1) as number;

	const agent = await createAgent(agentCredentials);

	try {
		const actor = createActor<ManagementService>(
			agent,
			SYSTEM_CANISTERS.management,
			managementIdlFactory as any,
		);

		const networkVariant = network === 'testnet' 
			? { testnet: null } 
			: { mainnet: null };

		const result = await actor.bitcoin_get_utxos({
			address,
			network: networkVariant as { mainnet: null } | { testnet: null },
			filter: minConfirmations > 0 ? [{ min_confirmations: minConfirmations }] : [],
		});

		const utxos = result.utxos.map((utxo) => ({
			txid: Buffer.from(utxo.outpoint.txid).toString('hex'),
			vout: utxo.outpoint.vout,
			value: utxo.value.toString(),
			valueSatoshis: Number(utxo.value),
			height: utxo.height,
		}));

		return [
			{
				json: {
					success: true,
					address,
					network,
					utxos,
					tipBlockHash: Buffer.from(result.tip_block_hash).toString('hex'),
					tipHeight: result.tip_height,
					hasNextPage: result.next_page.length > 0,
				},
			},
		];
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Failed to get Bitcoin UTXOs: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Send Bitcoin transaction
 */
export async function sendBitcoinTransaction(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);

	const transactionHex = this.getNodeParameter('transactionHex', index) as string;
	const network = this.getNodeParameter('bitcoinNetwork', index, 'mainnet') as string;

	const transaction = new Uint8Array(Buffer.from(transactionHex.replace(/^0x/, ''), 'hex'));

	const agent = await createAgent(agentCredentials);

	try {
		const actor = createActor<ManagementService>(
			agent,
			SYSTEM_CANISTERS.management,
			managementIdlFactory as any,
		);

		const networkVariant = network === 'testnet' 
			? { testnet: null } 
			: { mainnet: null };

		await actor.bitcoin_send_transaction({
			transaction,
			network: networkVariant as { mainnet: null } | { testnet: null },
		});

		return [
			{
				json: {
					success: true,
					network,
					transactionHex,
					message: 'Transaction submitted to the Bitcoin network',
				},
			},
		];
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Failed to send Bitcoin transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get cryptographically secure random bytes
 */
export async function getRandomBytes(
	this: IExecuteFunctions,
	_index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);

	const agent = await createAgent(agentCredentials);

	try {
		const actor = createActor<ManagementService>(
			agent,
			SYSTEM_CANISTERS.management,
			managementIdlFactory as any,
		);

		const randomBytes = await actor.raw_rand();

		return [
			{
				json: {
					success: true,
					randomBytes: Buffer.from(randomBytes).toString('hex'),
					length: randomBytes.length,
				},
			},
		];
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Failed to get random bytes: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

// Export aliases for Icp.node.ts compatibility
export {
	createCanister as createNewCanister,
	updateSettings as updateCanisterSettings,
	getEcdsaPublicKey as getThresholdEcdsaPublicKey,
	signWithEcdsa as signWithThresholdEcdsa,
	httpOutcall as makeHttpOutcall,
	httpOutcall as httpRequest,
	getBitcoinBalance as getBtcBalance,
	getBitcoinUtxos as getBtcUtxos,
	sendBitcoinTransaction as sendBtcTransaction,
	sendBitcoinTransaction as sendBitcoin,
	getRandomBytes as getRandom,
	getRandomBytes as getRawRand,
};
