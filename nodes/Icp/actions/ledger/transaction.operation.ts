/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import {
	createRosettaClient,
	getNetworkIdentifier,
	searchTransactions,
	getAccountTransactions,
} from '../../transport/rosetta';

export const searchDescription: INodeProperties[] = [
	{
		displayName: 'Account Identifier (Optional)',
		name: 'accountIdentifier',
		type: 'string',
		default: '',
		placeholder: 'e.g., 8b84c3a3529d02a9decb5b1a27e7c8d886e17e07a0c17c6b81e42d2e8b5f5c7f',
		description: 'Filter by account identifier',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['searchTransactions'],
			},
		},
	},
	{
		displayName: 'Operation Type (Optional)',
		name: 'operationType',
		type: 'options',
		options: [
			{ name: 'All', value: '' },
			{ name: 'Transaction', value: 'TRANSACTION' },
			{ name: 'Fee', value: 'FEE' },
			{ name: 'Mint', value: 'MINT' },
			{ name: 'Burn', value: 'BURN' },
		],
		default: '',
		description: 'Filter by operation type',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['searchTransactions'],
			},
		},
	},
	{
		displayName: 'Max Block',
		name: 'maxBlock',
		type: 'number',
		default: 0,
		description: 'Maximum block index to search (0 for latest)',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['searchTransactions'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'Maximum number of transactions to return',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['searchTransactions'],
			},
		},
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		description: 'Offset for pagination',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['searchTransactions'],
			},
		},
	},
];

export const accountTransactionsDescription: INodeProperties[] = [
	{
		displayName: 'Account Identifier',
		name: 'accountIdentifier',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., 8b84c3a3529d02a9decb5b1a27e7c8d886e17e07a0c17c6b81e42d2e8b5f5c7f',
		description: 'The account identifier to get transactions for',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['getAccountTransactions'],
			},
		},
	},
	{
		displayName: 'Max Block',
		name: 'maxBlock',
		type: 'number',
		default: 0,
		description: 'Maximum block index to search (0 for latest)',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['getAccountTransactions'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'Maximum number of transactions to return',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['getAccountTransactions'],
			},
		},
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		description: 'Offset for pagination',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['getAccountTransactions'],
			},
		},
	},
];

export async function executeSearch(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpRosetta');

	const accountIdentifier = this.getNodeParameter('accountIdentifier', index) as string;
	const operationType = this.getNodeParameter('operationType', index) as string;
	const maxBlock = this.getNodeParameter('maxBlock', index) as number;
	const limit = this.getNodeParameter('limit', index) as number;
	const offset = this.getNodeParameter('offset', index) as number;

	const client = createRosettaClient({
		rosettaUrl: credentials.rosettaUrl as string,
		networkIdentifier: credentials.networkIdentifier as string,
		customBlockchain: credentials.customBlockchain as string | undefined,
		customNetwork: credentials.customNetwork as string | undefined,
	});

	const networkIdentifier = getNetworkIdentifier({
		rosettaUrl: credentials.rosettaUrl as string,
		networkIdentifier: credentials.networkIdentifier as string,
		customBlockchain: credentials.customBlockchain as string | undefined,
		customNetwork: credentials.customNetwork as string | undefined,
	});

	const options: {
		account_identifier?: { address: string };
		type?: string;
		max_block?: number;
		limit?: number;
		offset?: number;
	} = {
		limit,
		offset,
	};

	if (accountIdentifier) {
		options.account_identifier = { address: accountIdentifier };
	}

	if (operationType) {
		options.type = operationType;
	}

	if (maxBlock > 0) {
		options.max_block = maxBlock;
	}

	const response = await searchTransactions(client, networkIdentifier, options);

	return [
		{
			json: {
				totalCount: response.total_count,
				transactionCount: response.transactions.length,
				nextOffset: response.next_offset,
				transactions: response.transactions.map((tx) => ({
					blockIndex: tx.block_identifier.index,
					blockHash: tx.block_identifier.hash,
					transactionHash: tx.transaction.transaction_identifier.hash,
					operations: tx.transaction.operations,
				})),
			},
		},
	];
}

export async function executeAccountTransactions(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpRosetta');

	const accountIdentifier = this.getNodeParameter('accountIdentifier', index) as string;
	const maxBlock = this.getNodeParameter('maxBlock', index) as number;
	const limit = this.getNodeParameter('limit', index) as number;
	const offset = this.getNodeParameter('offset', index) as number;

	const client = createRosettaClient({
		rosettaUrl: credentials.rosettaUrl as string,
		networkIdentifier: credentials.networkIdentifier as string,
		customBlockchain: credentials.customBlockchain as string | undefined,
		customNetwork: credentials.customNetwork as string | undefined,
	});

	const networkIdentifier = getNetworkIdentifier({
		rosettaUrl: credentials.rosettaUrl as string,
		networkIdentifier: credentials.networkIdentifier as string,
		customBlockchain: credentials.customBlockchain as string | undefined,
		customNetwork: credentials.customNetwork as string | undefined,
	});

	const options: { max_block?: number; limit?: number; offset?: number } = { limit, offset };

	if (maxBlock > 0) {
		options.max_block = maxBlock;
	}

	const response = await getAccountTransactions(
		client,
		networkIdentifier,
		accountIdentifier,
		options,
	);

	return [
		{
			json: {
				accountIdentifier,
				totalCount: response.total_count,
				transactionCount: response.transactions.length,
				nextOffset: response.next_offset,
				transactions: response.transactions.map((tx) => ({
					blockIndex: tx.block_identifier.index,
					blockHash: tx.block_identifier.hash,
					transactionHash: tx.transaction.transaction_identifier.hash,
					operations: tx.transaction.operations,
				})),
			},
		},
	];
}

// Alias exports for Icp.node.ts compatibility
export { executeSearch as searchTransactions };
export { executeAccountTransactions as getAccountTransactions };
