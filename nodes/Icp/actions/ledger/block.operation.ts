/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { createRosettaClient, getNetworkIdentifier, getBlock, getBlockTransaction } from '../../transport/rosetta';

export const description: INodeProperties[] = [
	{
		displayName: 'Block Identifier Type',
		name: 'blockIdentifierType',
		type: 'options',
		options: [
			{ name: 'By Index', value: 'index' },
			{ name: 'By Hash', value: 'hash' },
		],
		default: 'index',
		description: 'How to identify the block',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['getBlock'],
			},
		},
	},
	{
		displayName: 'Block Index',
		name: 'blockIndex',
		type: 'number',
		required: true,
		default: 0,
		description: 'The block height/index to retrieve',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['getBlock'],
				blockIdentifierType: ['index'],
			},
		},
	},
	{
		displayName: 'Block Hash',
		name: 'blockHash',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., 0x1234...',
		description: 'The block hash to retrieve',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['getBlock'],
				blockIdentifierType: ['hash'],
			},
		},
	},
];

export const transactionDescription: INodeProperties[] = [
	{
		displayName: 'Block Index',
		name: 'blockIndex',
		type: 'number',
		required: true,
		default: 0,
		description: 'The block containing the transaction',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['getBlockTransaction'],
			},
		},
	},
	{
		displayName: 'Transaction Hash',
		name: 'transactionHash',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., 0x1234...',
		description: 'The hash of the transaction to retrieve',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['getBlockTransaction'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpRosetta');
	const operation = this.getNodeParameter('operation', index) as string;

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

	if (operation === 'getBlock') {
		const blockIdentifierType = this.getNodeParameter('blockIdentifierType', index) as string;

		let blockIdentifier: { index?: number; hash?: string };
		if (blockIdentifierType === 'index') {
			blockIdentifier = { index: this.getNodeParameter('blockIndex', index) as number };
		} else {
			blockIdentifier = { hash: this.getNodeParameter('blockHash', index) as string };
		}

		const response = await getBlock(client, networkIdentifier, blockIdentifier);

		return [
			{
				json: {
					blockIdentifier: response.block.block_identifier,
					parentBlockIdentifier: response.block.parent_block_identifier,
					timestamp: response.block.timestamp,
					timestampDate: new Date(response.block.timestamp).toISOString(),
					transactionCount: response.block.transactions.length,
					transactions: response.block.transactions.map((tx) => ({
						hash: tx.transaction_identifier.hash,
						operationCount: tx.operations.length,
						operations: tx.operations,
					})),
					metadata: response.block.metadata,
				},
			},
		];
	} else {
		// getBlockTransaction
		const blockIndex = this.getNodeParameter('blockIndex', index) as number;
		const transactionHash = this.getNodeParameter('transactionHash', index) as string;

		const response = await getBlockTransaction(
			client,
			networkIdentifier,
			{ index: blockIndex },
			{ hash: transactionHash },
		);

		return [
			{
				json: {
					transactionHash: response.transaction.transaction_identifier.hash,
					blockIndex,
					operations: response.transaction.operations,
					operationCount: response.transaction.operations.length,
					metadata: response.transaction.metadata,
				},
			},
		];
	}
}

// Separate functions for each block operation
export async function executeGetBlock(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpRosetta');

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

	const blockIdentifierType = this.getNodeParameter('blockIdentifierType', index) as string;

	let blockIdentifier: { index?: number; hash?: string };
	if (blockIdentifierType === 'index') {
		blockIdentifier = { index: this.getNodeParameter('blockIndex', index) as number };
	} else {
		blockIdentifier = { hash: this.getNodeParameter('blockHash', index) as string };
	}

	const response = await getBlock(client, networkIdentifier, blockIdentifier);

	return [
		{
			json: {
				blockIdentifier: response.block.block_identifier,
				parentBlockIdentifier: response.block.parent_block_identifier,
				timestamp: response.block.timestamp,
				timestampDate: new Date(response.block.timestamp).toISOString(),
				transactionCount: response.block.transactions.length,
				transactions: response.block.transactions.map((tx) => ({
					hash: tx.transaction_identifier.hash,
					operationCount: tx.operations.length,
					operations: tx.operations,
				})),
				metadata: response.block.metadata,
			},
		},
	];
}

export async function executeGetBlockTransaction(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpRosetta');

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

	const blockIndex = this.getNodeParameter('blockIndex', index) as number;
	const transactionHash = this.getNodeParameter('transactionHash', index) as string;

	const response = await getBlockTransaction(
		client,
		networkIdentifier,
		{ index: blockIndex },
		{ hash: transactionHash },
	);

	return [
		{
			json: {
				transactionHash: response.transaction.transaction_identifier.hash,
				blockIndex,
				operations: response.transaction.operations,
				operationCount: response.transaction.operations.length,
				metadata: response.transaction.metadata,
			},
		},
	];
}

// Alias exports for Icp.node.ts compatibility
export { executeGetBlock as getBlock };
export { executeGetBlockTransaction as getBlockTransaction };
