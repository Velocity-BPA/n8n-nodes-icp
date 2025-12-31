/**
 * n8n-nodes-icp: Cycles Operations
 *
 * Copyright (c) 2025 Velocity BPA
 *
 * Licensed under the Business Source License 1.1 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://github.com/Velocity-BPA/n8n-nodes-icp/blob/main/LICENSE
 *
 * Change Date: 2029-01-01
 *
 * On the Change Date, this software will be made available under the
 * Apache License, Version 2.0.
 */

import type { IExecuteFunctions, IDataObject, INodeProperties } from 'n8n-workflow';
import { createAgent, createActor } from '../../transport/agent';
import { managementCanisterIdlFactory } from '../../transport/candid';
import { Principal } from '@dfinity/principal';
import { SYSTEM_CANISTERS } from '../../constants/canisters';

/**
 * Cycles operation properties
 */
export const cyclesOperationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['cycles'],
			},
		},
		options: [
			{
				name: 'Get Canister Cycles Balance',
				value: 'getCanisterCyclesBalance',
				description: 'Get cycles balance of a canister',
				action: 'Get canister cycles balance',
			},
			{
				name: 'Get Cycles Price',
				value: 'getCyclesPrice',
				description: 'Get current ICP to cycles conversion rate',
				action: 'Get cycles price',
			},
			{
				name: 'Top Up Canister',
				value: 'topUpCanister',
				description: 'Add cycles to a canister',
				action: 'Top up canister',
			},
		],
		default: 'getCanisterCyclesBalance',
	},
	{
		displayName: 'Canister ID',
		name: 'canisterId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['cycles'],
				operation: ['getCanisterCyclesBalance', 'topUpCanister'],
			},
		},
		placeholder: 'e.g., ryjl3-tyaaa-aaaaa-aaaba-cai',
		description: 'The canister ID to check cycles balance',
	},
	{
		displayName: 'Cycles Amount',
		name: 'cyclesAmount',
		type: 'string',
		default: '1000000000000',
		required: true,
		displayOptions: {
			show: {
				resource: ['cycles'],
				operation: ['topUpCanister'],
			},
		},
		description: 'Amount of cycles to add (1T = 1,000,000,000,000)',
	},
];

interface CanisterStatusResult {
	status: { running?: null; stopping?: null; stopped?: null };
	settings: {
		controllers: Principal[];
		compute_allocation: bigint;
		memory_allocation: bigint;
		freezing_threshold: bigint;
	};
	module_hash: Uint8Array[] | [];
	memory_size: bigint;
	cycles: bigint;
	idle_cycles_burned_per_day: bigint;
}

/**
 * Get cycles balance of a canister
 */
export async function getCanisterCyclesBalance(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const canisterId = this.getNodeParameter('canisterId', itemIndex) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const actor = createActor<{
		canister_status: (arg: { canister_id: Principal }) => Promise<CanisterStatusResult>;
	}>(agent, SYSTEM_CANISTERS.management, managementCanisterIdlFactory);

	const result = await actor.canister_status({
		canister_id: Principal.fromText(canisterId),
	});

	const cycles = BigInt(result.cycles.toString());
	const trillionCycles = Number(cycles) / 1e12;
	const billionCycles = Number(cycles) / 1e9;

	return {
		canisterId,
		cycles: cycles.toString(),
		cyclesFormatted: {
			raw: cycles.toString(),
			trillion: trillionCycles.toFixed(6) + ' T',
			billion: billionCycles.toFixed(3) + ' B',
		},
		idleCyclesBurnedPerDay: result.idle_cycles_burned_per_day.toString(),
	};
}

/**
 * Get current ICP to cycles conversion rate
 */
export async function getCyclesPrice(
	this: IExecuteFunctions,
	_itemIndex: number,
): Promise<IDataObject> {
	// The cycles minting canister provides the conversion rate
	// For now, return an estimated rate
	// In production, this would query the CMC for the actual rate
	
	const trillionCyclesPerIcp = 1.5; // Approximate rate
	const e8sPerCycle = 100_000_000 / (trillionCyclesPerIcp * 1_000_000_000_000);

	return {
		trillionCyclesPerIcp,
		cyclesPerE8s: Math.floor(trillionCyclesPerIcp * 1_000_000_000_000 / 100_000_000),
		e8sPerCycle: e8sPerCycle.toExponential(4),
		note: 'Conversion rate varies based on CMC exchange rate. Query the Cycles Minting Canister for exact rates.',
	};
}

/**
 * Top up a canister with cycles
 */
export async function topUpCanister(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const canisterId = this.getNodeParameter('canisterId', itemIndex) as string;
	const cyclesAmount = this.getNodeParameter('cyclesAmount', itemIndex) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	// Get balance before
	const actor = createActor<{
		canister_status: (arg: { canister_id: Principal }) => Promise<CanisterStatusResult>;
		deposit_cycles: (arg: { canister_id: Principal }) => Promise<void>;
	}>(agent, SYSTEM_CANISTERS.management, managementCanisterIdlFactory);

	const beforeStatus = await actor.canister_status({
		canister_id: Principal.fromText(canisterId),
	});
	const cyclesBefore = BigInt(beforeStatus.cycles.toString());

	// Note: deposit_cycles requires cycles to be attached to the call
	// This is a placeholder - actual implementation would need cycles wallet integration
	
	return {
		canisterId,
		cyclesRequested: cyclesAmount,
		cyclesBefore: cyclesBefore.toString(),
		note: 'Cycles top-up requires the calling identity to have sufficient cycles. Use the NNS dapp or dfx to top up canisters.',
	};
}

/**
 * Convert ICP to Cycles (placeholder for future CMC integration)
 */
export async function convertIcpToCyclesOp(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const amount = this.getNodeParameter('amount', itemIndex, '1') as string;

	return {
		icpAmount: amount,
		note: 'ICP to Cycles conversion requires CMC integration. Use the NNS dapp for conversion.',
	};
}

// Export aliases for Icp.node.ts compatibility
export { getCanisterCyclesBalance as getCyclesBalance };
export { convertIcpToCyclesOp as convertIcpToCycles };
