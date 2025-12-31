/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { IcpError, ICP_ERROR_CODES } from '../constants/errors';
import { NETWORK_IDENTIFIER, ROSETTA_ENDPOINTS, DEFAULT_TIMEOUT } from '../constants/networks';

export interface RosettaCredentials {
	rosettaUrl: string;
	networkIdentifier: string;
	customBlockchain?: string;
	customNetwork?: string;
}

export interface NetworkIdentifier {
	blockchain: string;
	network: string;
}

export interface AccountIdentifier {
	address: string;
	sub_account?: {
		address: string;
	};
}

export interface Amount {
	value: string;
	currency: Currency;
}

export interface Currency {
	symbol: string;
	decimals: number;
}

export interface Operation {
	operation_identifier: {
		index: number;
	};
	type: string;
	status?: string;
	account?: AccountIdentifier;
	amount?: Amount;
	metadata?: Record<string, unknown>;
}

export interface Transaction {
	transaction_identifier: {
		hash: string;
	};
	operations: Operation[];
	metadata?: Record<string, unknown>;
}

export interface Block {
	block_identifier: {
		index: number;
		hash: string;
	};
	parent_block_identifier: {
		index: number;
		hash: string;
	};
	timestamp: number;
	transactions: Transaction[];
	metadata?: Record<string, unknown>;
}

export interface RosettaError {
	code: number;
	message: string;
	description?: string;
	retriable: boolean;
	details?: Record<string, unknown>;
}

/**
 * Creates a Rosetta API client
 */
export function createRosettaClient(credentials: RosettaCredentials): AxiosInstance {
	const baseURL = credentials.rosettaUrl || ROSETTA_ENDPOINTS.MAINNET;

	return axios.create({
		baseURL,
		timeout: DEFAULT_TIMEOUT,
		headers: {
			'Content-Type': 'application/json',
		},
	});
}

/**
 * Gets the network identifier based on credentials
 */
export function getNetworkIdentifier(credentials: RosettaCredentials): NetworkIdentifier {
	if (credentials.networkIdentifier === 'custom') {
		return {
			blockchain: credentials.customBlockchain || NETWORK_IDENTIFIER.blockchain,
			network: credentials.customNetwork || NETWORK_IDENTIFIER.network,
		};
	}

	return {
		blockchain: NETWORK_IDENTIFIER.blockchain,
		network: NETWORK_IDENTIFIER.network,
	};
}

/**
 * Handles Rosetta API errors
 */
function handleRosettaError(error: unknown): never {
	if (axios.isAxiosError(error)) {
		const axiosError = error as AxiosError<{ code?: number; message?: string; description?: string }>;
		if (axiosError.response?.data) {
			const rosettaError = axiosError.response.data;
			throw new IcpError(
				ICP_ERROR_CODES.ROSETTA_ERROR,
				rosettaError.message || 'Rosetta API error',
				{
					code: rosettaError.code,
					description: rosettaError.description,
				},
			);
		}
		throw new IcpError(
			ICP_ERROR_CODES.NETWORK_ERROR,
			axiosError.message,
			error,
		);
	}

	throw new IcpError(
		ICP_ERROR_CODES.ROSETTA_ERROR,
		(error as Error).message || 'Unknown Rosetta error',
		error,
	);
}

/**
 * Gets account balance using Rosetta API
 */
export async function getAccountBalance(
	client: AxiosInstance,
	networkIdentifier: NetworkIdentifier,
	accountIdentifier: string,
	blockIdentifier?: { index?: number; hash?: string },
): Promise<{ balances: Amount[]; block_identifier: { index: number; hash: string } }> {
	try {
		const response = await client.post('/account/balance', {
			network_identifier: networkIdentifier,
			account_identifier: {
				address: accountIdentifier,
			},
			...(blockIdentifier && { block_identifier: blockIdentifier }),
		});

		return response.data;
	} catch (error) {
		handleRosettaError(error);
	}
}

/**
 * Gets a block by index or hash
 */
export async function getBlock(
	client: AxiosInstance,
	networkIdentifier: NetworkIdentifier,
	blockIdentifier: { index?: number; hash?: string },
): Promise<{ block: Block }> {
	try {
		const response = await client.post('/block', {
			network_identifier: networkIdentifier,
			block_identifier: blockIdentifier,
		});

		return response.data;
	} catch (error) {
		handleRosettaError(error);
	}
}

/**
 * Gets a transaction from a block
 */
export async function getBlockTransaction(
	client: AxiosInstance,
	networkIdentifier: NetworkIdentifier,
	blockIdentifier: { index?: number; hash?: string },
	transactionIdentifier: { hash: string },
): Promise<{ transaction: Transaction }> {
	try {
		const response = await client.post('/block/transaction', {
			network_identifier: networkIdentifier,
			block_identifier: blockIdentifier,
			transaction_identifier: transactionIdentifier,
		});

		return response.data;
	} catch (error) {
		handleRosettaError(error);
	}
}

/**
 * Searches for transactions
 */
export async function searchTransactions(
	client: AxiosInstance,
	networkIdentifier: NetworkIdentifier,
	options: {
		account_identifier?: AccountIdentifier;
		max_block?: number;
		offset?: number;
		limit?: number;
		operator?: string;
		type?: string;
		status?: string;
		address?: string;
	},
): Promise<{
	transactions: { block_identifier: { index: number; hash: string }; transaction: Transaction }[];
	total_count: number;
	next_offset?: number;
}> {
	try {
		const response = await client.post('/search/transactions', {
			network_identifier: networkIdentifier,
			...options,
		});

		return response.data;
	} catch (error) {
		handleRosettaError(error);
	}
}

/**
 * Gets network status
 */
export async function getNetworkStatus(
	client: AxiosInstance,
	networkIdentifier: NetworkIdentifier,
): Promise<{
	current_block_identifier: { index: number; hash: string };
	current_block_timestamp: number;
	genesis_block_identifier: { index: number; hash: string };
	oldest_block_identifier?: { index: number; hash: string };
	sync_status?: {
		current_index?: number;
		target_index?: number;
		stage?: string;
		synced?: boolean;
	};
	peers?: Array<{ peer_id: string; metadata?: Record<string, unknown> }>;
}> {
	try {
		const response = await client.post('/network/status', {
			network_identifier: networkIdentifier,
		});

		return response.data;
	} catch (error) {
		handleRosettaError(error);
	}
}

/**
 * Gets network options
 */
export async function getNetworkOptions(
	client: AxiosInstance,
	networkIdentifier: NetworkIdentifier,
): Promise<{
	version: {
		rosetta_version: string;
		node_version: string;
		middleware_version?: string;
	};
	allow: {
		operation_statuses: Array<{ status: string; successful: boolean }>;
		operation_types: string[];
		errors: RosettaError[];
		historical_balance_lookup: boolean;
		timestamp_start_index?: number;
		call_methods?: string[];
		balance_exemptions?: Array<{
			sub_account_address?: string;
			currency?: Currency;
			exemption_type?: string;
		}>;
		mempool_coins?: boolean;
	};
}> {
	try {
		const response = await client.post('/network/options', {
			network_identifier: networkIdentifier,
		});

		return response.data;
	} catch (error) {
		handleRosettaError(error);
	}
}

/**
 * Gets the list of available networks
 */
export async function getNetworkList(
	client: AxiosInstance,
): Promise<{ network_identifiers: NetworkIdentifier[] }> {
	try {
		const response = await client.post('/network/list', {
			metadata: {},
		});

		return response.data;
	} catch (error) {
		handleRosettaError(error);
	}
}

/**
 * Derives an account identifier from a public key
 */
export async function deriveAccountIdentifier(
	client: AxiosInstance,
	networkIdentifier: NetworkIdentifier,
	publicKey: { hex_bytes: string; curve_type: string },
): Promise<{ account_identifier: AccountIdentifier; address: string }> {
	try {
		const response = await client.post('/construction/derive', {
			network_identifier: networkIdentifier,
			public_key: publicKey,
		});

		return response.data;
	} catch (error) {
		handleRosettaError(error);
	}
}

/**
 * Constructs a transfer transaction
 */
export async function constructTransfer(
	client: AxiosInstance,
	networkIdentifier: NetworkIdentifier,
	operations: Operation[],
	metadata?: Record<string, unknown>,
): Promise<{
	unsigned_transaction: string;
	payloads: Array<{
		address: string;
		hex_bytes: string;
		signature_type: string;
	}>;
}> {
	try {
		// First, preprocess to get required metadata
		const preprocessResponse = await client.post('/construction/preprocess', {
			network_identifier: networkIdentifier,
			operations,
			metadata,
		});

		// Get metadata
		const metadataResponse = await client.post('/construction/metadata', {
			network_identifier: networkIdentifier,
			options: preprocessResponse.data.options,
		});

		// Create payloads
		const payloadsResponse = await client.post('/construction/payloads', {
			network_identifier: networkIdentifier,
			operations,
			metadata: metadataResponse.data.metadata,
		});

		return payloadsResponse.data;
	} catch (error) {
		handleRosettaError(error);
	}
}

/**
 * Combines signatures and submits a transaction
 */
export async function submitTransaction(
	client: AxiosInstance,
	networkIdentifier: NetworkIdentifier,
	unsignedTransaction: string,
	signatures: Array<{
		signing_payload: {
			hex_bytes: string;
			address: string;
		};
		public_key: {
			hex_bytes: string;
			curve_type: string;
		};
		signature_type: string;
		hex_bytes: string;
	}>,
): Promise<{ transaction_identifier: { hash: string }; metadata?: Record<string, unknown> }> {
	try {
		// Combine signatures
		const combineResponse = await client.post('/construction/combine', {
			network_identifier: networkIdentifier,
			unsigned_transaction: unsignedTransaction,
			signatures,
		});

		// Submit transaction
		const submitResponse = await client.post('/construction/submit', {
			network_identifier: networkIdentifier,
			signed_transaction: combineResponse.data.signed_transaction,
		});

		return submitResponse.data;
	} catch (error) {
		handleRosettaError(error);
	}
}

/**
 * Gets account transactions
 */
export async function getAccountTransactions(
	client: AxiosInstance,
	networkIdentifier: NetworkIdentifier,
	accountIdentifier: string,
	options?: {
		max_block?: number;
		offset?: number;
		limit?: number;
	},
): Promise<{
	transactions: Array<{
		block_identifier: { index: number; hash: string };
		transaction: Transaction;
	}>;
	total_count: number;
	next_offset?: number;
}> {
	return searchTransactions(client, networkIdentifier, {
		account_identifier: { address: accountIdentifier },
		...options,
	});
}

/**
 * ICP currency definition
 */
export const ICP_CURRENCY: Currency = {
	symbol: 'ICP',
	decimals: 8,
};

/**
 * Creates transfer operations for ICP
 */
export function createTransferOperations(
	fromAccount: string,
	toAccount: string,
	amountE8s: string,
	feeE8s: string = '10000',
): Operation[] {
	return [
		{
			operation_identifier: { index: 0 },
			type: 'TRANSACTION',
			account: { address: fromAccount },
			amount: {
				value: `-${amountE8s}`,
				currency: ICP_CURRENCY,
			},
		},
		{
			operation_identifier: { index: 1 },
			type: 'TRANSACTION',
			account: { address: toAccount },
			amount: {
				value: amountE8s,
				currency: ICP_CURRENCY,
			},
		},
		{
			operation_identifier: { index: 2 },
			type: 'FEE',
			account: { address: fromAccount },
			amount: {
				value: `-${feeE8s}`,
				currency: ICP_CURRENCY,
			},
		},
	];
}
