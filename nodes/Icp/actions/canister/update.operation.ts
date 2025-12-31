/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { createAgent, updateCanister } from '../../transport/agent';
import { candidToJson, parseJsonToCandidArgs } from '../../helpers/candid';
import { DEFAULT_TIMEOUT } from '../../constants/networks';

export const description: INodeProperties[] = [
	{
		displayName: 'Canister ID',
		name: 'canisterId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., ryjl3-tyaaa-aaaaa-aaaba-cai',
		description: 'The canister ID to update',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Method Name',
		name: 'methodName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., store',
		description: 'The name of the update method to call',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Arguments (JSON)',
		name: 'arguments',
		type: 'json',
		default: '[]',
		description: 'Arguments to pass to the method as a JSON array',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Argument Types',
		name: 'argumentTypes',
		type: 'options',
		options: [
			{ name: 'Auto-Detect', value: 'auto' },
			{ name: 'Raw Bytes', value: 'raw' },
			{ name: 'Text', value: 'text' },
			{ name: 'Nat', value: 'nat' },
			{ name: 'Int', value: 'int' },
			{ name: 'Bool', value: 'bool' },
			{ name: 'Principal', value: 'principal' },
		],
		default: 'auto',
		description: 'The Candid type of the arguments',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Timeout (ms)',
		name: 'timeout',
		type: 'number',
		default: 60000,
		description: 'Maximum time to wait for the update call to complete',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['update'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgent');

	const canisterId = this.getNodeParameter('canisterId', index) as string;
	const methodName = this.getNodeParameter('methodName', index) as string;
	const argumentsJson = this.getNodeParameter('arguments', index) as string;
	const argumentTypes = this.getNodeParameter('argumentTypes', index) as string;
	const timeout = this.getNodeParameter('timeout', index) as number || DEFAULT_TIMEOUT;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	// Parse arguments
	let args: ArrayBuffer;
	if (argumentTypes === 'raw') {
		const parsed = JSON.parse(argumentsJson);
		if (typeof parsed === 'string') {
			const hex = parsed.replace(/^0x/, '');
			const bytes = new Uint8Array(hex.length / 2);
			for (let i = 0; i < hex.length; i += 2) {
				bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
			}
			args = bytes.buffer;
		} else {
			args = new ArrayBuffer(0);
		}
	} else {
		const parsedArgs = parseJsonToCandidArgs(argumentsJson);
		
		let types: IDL.Type[] = [];
		if (argumentTypes === 'text') {
			types = parsedArgs.map(() => IDL.Text);
		} else if (argumentTypes === 'nat') {
			types = parsedArgs.map(() => IDL.Nat);
		} else if (argumentTypes === 'int') {
			types = parsedArgs.map(() => IDL.Int);
		} else if (argumentTypes === 'bool') {
			types = parsedArgs.map(() => IDL.Bool);
		} else if (argumentTypes === 'principal') {
			types = parsedArgs.map(() => IDL.Principal);
		} else {
			types = parsedArgs.map((arg) => {
				if (typeof arg === 'string') {
					try {
						Principal.fromText(arg as string);
						return IDL.Principal;
					} catch {
						return IDL.Text;
					}
				}
				if (typeof arg === 'number') return IDL.Nat;
				if (typeof arg === 'bigint') return IDL.Nat;
				if (typeof arg === 'boolean') return IDL.Bool;
				return IDL.Text;
			});
		}

		const processedArgs = parsedArgs.map((arg, i) => {
			if (types[i] === IDL.Principal && typeof arg === 'string') {
				return Principal.fromText(arg as string);
			}
			return arg;
		});

		args = IDL.encode(types, processedArgs);
	}

	// Make the update call
	const response = await updateCanister(agent, canisterId, methodName, args, timeout);

	// Try to decode the response
	let decodedResponse: unknown;
	try {
		const tryTypes = [
			[IDL.Text],
			[IDL.Nat],
			[IDL.Int],
			[IDL.Bool],
			[IDL.Principal],
			[IDL.Vec(IDL.Nat8)],
			[IDL.Null],
		];

		for (const types of tryTypes) {
			try {
				decodedResponse = IDL.decode(types, response);
				break;
			} catch {
				continue;
			}
		}

		if (!decodedResponse) {
			decodedResponse = Array.from(new Uint8Array(response))
				.map((b) => b.toString(16).padStart(2, '0'))
				.join('');
		}
	} catch {
		decodedResponse = Array.from(new Uint8Array(response))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
	}

	return [
		{
			json: {
				canisterId,
				methodName,
				success: true,
				response: candidToJson(decodedResponse as never) as Record<string, unknown>,
				rawResponse: Array.from(new Uint8Array(response))
					.map((b) => b.toString(16).padStart(2, '0'))
					.join(''),
			},
		},
	];
}

// Alias export for Icp.node.ts compatibility
export { execute as updateCanisterMethod };
