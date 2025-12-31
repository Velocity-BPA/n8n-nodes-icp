/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { createRosettaClient, getNetworkIdentifier, getAccountBalance, ICP_CURRENCY } from '../../transport/rosetta';

export const description: INodeProperties[] = [
	{
		displayName: 'Account Identifier',
		name: 'accountIdentifier',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., 8b84c3a3529d02a9decb5b1a27e7c8d886e17e07a0c17c6b81e42d2e8b5f5c7f',
		description: 'The 64-character hex account identifier to check balance for',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['getBalance'],
			},
		},
	},
	{
		displayName: 'Block Index (Optional)',
		name: 'blockIndex',
		type: 'number',
		default: 0,
		description: 'Optional block index to get historical balance. Leave at 0 for current balance.',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['getBalance'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpRosetta');

	const accountIdentifier = this.getNodeParameter('accountIdentifier', index) as string;
	const blockIndex = this.getNodeParameter('blockIndex', index) as number;

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

	const blockIdentifier = blockIndex > 0 ? { index: blockIndex } : undefined;

	const response = await getAccountBalance(
		client,
		networkIdentifier,
		accountIdentifier,
		blockIdentifier,
	);

	// Find ICP balance
	const icpBalance = response.balances.find(
		(b) => b.currency.symbol === ICP_CURRENCY.symbol,
	);

	const balanceE8s = icpBalance ? BigInt(icpBalance.value) : BigInt(0);
	const balanceIcp = Number(balanceE8s) / 100_000_000;

	return [
		{
			json: {
				accountIdentifier,
				balance: {
					e8s: balanceE8s.toString(),
					icp: balanceIcp,
				},
				blockIdentifier: response.block_identifier,
				rawBalances: response.balances,
			},
		},
	];
}

// Alias export for Icp.node.ts compatibility
export const getBalance = execute;
