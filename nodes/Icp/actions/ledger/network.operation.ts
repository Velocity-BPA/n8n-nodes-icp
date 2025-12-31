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
	getNetworkStatus as rosettaGetNetworkStatus,
	getNetworkOptions as rosettaGetNetworkOptions,
	deriveAccountIdentifier,
} from '../../transport/rosetta';

export const deriveAccountDescription: INodeProperties[] = [
	{
		displayName: 'Public Key (Hex)',
		name: 'publicKeyHex',
		type: 'string',
		required: true,
		default: '',
		description: 'The public key in hexadecimal format',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['deriveAccountIdentifier'],
			},
		},
	},
	{
		displayName: 'Curve Type',
		name: 'curveType',
		type: 'options',
		options: [
			{ name: 'Ed25519', value: 'edwards25519' },
			{ name: 'Secp256k1', value: 'secp256k1' },
		],
		default: 'edwards25519',
		description: 'The cryptographic curve type used for the key',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['deriveAccountIdentifier'],
			},
		},
	},
];

export async function executeNetworkStatus(
	this: IExecuteFunctions,
	_index: number,
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

	const response = await rosettaGetNetworkStatus(client, networkIdentifier);

	return [
		{
			json: {
				currentBlock: response.current_block_identifier,
				currentBlockTimestamp: response.current_block_timestamp,
				currentBlockDate: new Date(response.current_block_timestamp).toISOString(),
				genesisBlock: response.genesis_block_identifier,
				oldestBlock: response.oldest_block_identifier,
				syncStatus: response.sync_status,
				peers: response.peers,
			},
		},
	];
}

export async function executeNetworkOptions(
	this: IExecuteFunctions,
	_index: number,
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

	const response = await rosettaGetNetworkOptions(client, networkIdentifier);

	return [
		{
			json: {
				version: response.version,
				operationStatuses: response.allow.operation_statuses,
				operationTypes: response.allow.operation_types,
				errors: response.allow.errors,
				historicalBalanceLookup: response.allow.historical_balance_lookup,
				callMethods: response.allow.call_methods,
			},
		},
	];
}

export async function executeDeriveAccountIdentifier(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpRosetta');

	const publicKeyHex = this.getNodeParameter('publicKeyHex', index) as string;
	const curveType = this.getNodeParameter('curveType', index) as string;

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

	const response = await deriveAccountIdentifier(client, networkIdentifier, {
		hex_bytes: publicKeyHex,
		curve_type: curveType,
	});

	return [
		{
			json: {
				accountIdentifier: response.account_identifier.address,
				address: response.address,
				publicKeyHex,
				curveType,
			},
		},
	];
}

// Alias exports for Icp.node.ts compatibility
export const getNetworkStatus = executeNetworkStatus;
export const getNetworkOptions = executeNetworkOptions;
export const deriveAccount = executeDeriveAccountIdentifier;
