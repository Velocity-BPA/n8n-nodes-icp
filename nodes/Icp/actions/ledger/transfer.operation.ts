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
	constructTransfer,
	submitTransaction,
	createTransferOperations,
} from '../../transport/rosetta';
import { IcpError, ICP_ERROR_CODES } from '../../constants/errors';

export const description: INodeProperties[] = [
	{
		displayName: 'From Account',
		name: 'fromAccount',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., 8b84c3a3529d02a9decb5b1a27e7c8d886e17e07a0c17c6b81e42d2e8b5f5c7f',
		description: 'The sender account identifier (64-character hex)',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['transfer'],
			},
		},
	},
	{
		displayName: 'To Account',
		name: 'toAccount',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
		description: 'The recipient account identifier (64-character hex)',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['transfer'],
			},
		},
	},
	{
		displayName: 'Amount (ICP)',
		name: 'amountIcp',
		type: 'number',
		required: true,
		default: 0,
		description: 'Amount to transfer in ICP',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['transfer'],
			},
		},
	},
	{
		displayName: 'Fee (e8s)',
		name: 'feeE8s',
		type: 'string',
		default: '10000',
		description: 'Transaction fee in e8s (default: 10000 = 0.0001 ICP)',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['transfer'],
			},
		},
	},
	{
		displayName: 'Public Key (Hex)',
		name: 'publicKeyHex',
		type: 'string',
		required: true,
		default: '',
		description: 'Your public key in hex format for signing',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['transfer'],
			},
		},
	},
	{
		displayName: 'Signature (Hex)',
		name: 'signatureHex',
		type: 'string',
		required: true,
		default: '',
		description: 'Pre-computed signature for the transaction (must be generated externally)',
		displayOptions: {
			show: {
				resource: ['ledger'],
				operation: ['transfer'],
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
				operation: ['transfer'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpRosetta');

	const fromAccount = this.getNodeParameter('fromAccount', index) as string;
	const toAccount = this.getNodeParameter('toAccount', index) as string;
	const amountIcp = this.getNodeParameter('amountIcp', index) as number;
	const feeE8s = this.getNodeParameter('feeE8s', index) as string;
	const publicKeyHex = this.getNodeParameter('publicKeyHex', index) as string;
	const signatureHex = this.getNodeParameter('signatureHex', index) as string;
	const curveType = this.getNodeParameter('curveType', index) as string;

	if (amountIcp <= 0) {
		throw new IcpError(
			ICP_ERROR_CODES.INVALID_REQUEST,
			'Transfer amount must be greater than 0',
		);
	}

	// Convert ICP to e8s
	const amountE8s = Math.floor(amountIcp * 100_000_000).toString();

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

	// Create transfer operations
	const operations = createTransferOperations(fromAccount, toAccount, amountE8s, feeE8s);

	// Construct the transaction
	const constructResult = await constructTransfer(client, networkIdentifier, operations);

	// Submit with pre-computed signature
	const signatures = constructResult.payloads.map((payload) => ({
		signing_payload: {
			hex_bytes: payload.hex_bytes,
			address: payload.address,
		},
		public_key: {
			hex_bytes: publicKeyHex,
			curve_type: curveType,
		},
		signature_type: curveType === 'edwards25519' ? 'ed25519' : 'ecdsa',
		hex_bytes: signatureHex,
	}));

	const submitResult = await submitTransaction(
		client,
		networkIdentifier,
		constructResult.unsigned_transaction,
		signatures,
	);

	return [
		{
			json: {
				success: true,
				transactionHash: submitResult.transaction_identifier.hash,
				fromAccount,
				toAccount,
				amount: {
					icp: amountIcp,
					e8s: amountE8s,
				},
				fee: {
					e8s: feeE8s,
					icp: parseInt(feeE8s) / 100_000_000,
				},
				metadata: submitResult.metadata,
			},
		},
	];
}

// Alias export for Icp.node.ts compatibility
export const transfer = execute;
