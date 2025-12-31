/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { Principal } from '@dfinity/principal';
import { Actor } from '@dfinity/agent';
import { createAgent } from '../../transport/agent';
import { managementCanisterIdlFactory } from '../../transport/candid';
import { MANAGEMENT_CANISTER_ID } from '../../constants/canisters';
import { bytesToHex } from '../../helpers/accountId';

export const statusDescription: INodeProperties[] = [
	{
		displayName: 'Canister ID',
		name: 'canisterId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., ryjl3-tyaaa-aaaaa-aaaba-cai',
		description: 'The canister ID to get status for',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['getStatus'],
			},
		},
	},
];

export const infoDescription: INodeProperties[] = [
	{
		displayName: 'Canister ID',
		name: 'canisterId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., ryjl3-tyaaa-aaaaa-aaaba-cai',
		description: 'The canister ID to get info for',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['getInfo', 'getModuleHash', 'getControllers', 'getCyclesBalance'],
			},
		},
	},
];

interface CanisterStatus {
	status: { running: null } | { stopping: null } | { stopped: null };
	settings: {
		controllers: Principal[];
		compute_allocation: bigint;
		memory_allocation: bigint;
		freezing_threshold: bigint;
	};
	module_hash: [] | [Uint8Array];
	memory_size: bigint;
	cycles: bigint;
	idle_cycles_burned_per_day: bigint;
}

export async function executeGetStatus(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgent');
	const canisterId = this.getNodeParameter('canisterId', index) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const managementCanister = Actor.createActor<{
		canister_status: (args: { canister_id: Principal }) => Promise<CanisterStatus>;
	}>(managementCanisterIdlFactory, {
		agent,
		canisterId: Principal.fromText(MANAGEMENT_CANISTER_ID),
	});

	const status = await managementCanister.canister_status({
		canister_id: Principal.fromText(canisterId),
	});

	// Determine status string
	let statusStr = 'unknown';
	if ('running' in status.status) statusStr = 'running';
	else if ('stopping' in status.status) statusStr = 'stopping';
	else if ('stopped' in status.status) statusStr = 'stopped';

	return [
		{
			json: {
				canisterId,
				status: statusStr,
				memorySize: status.memory_size.toString(),
				memorySizeMB: Number(status.memory_size) / (1024 * 1024),
				cycles: status.cycles.toString(),
				cyclesTrillion: Number(status.cycles) / 1_000_000_000_000,
				idleCyclesBurnedPerDay: status.idle_cycles_burned_per_day.toString(),
				moduleHash: status.module_hash.length > 0 && status.module_hash[0]
					? bytesToHex(status.module_hash[0])
					: null,
				controllers: status.settings.controllers.map((c) => c.toText()),
				computeAllocation: status.settings.compute_allocation.toString(),
				memoryAllocation: status.settings.memory_allocation.toString(),
				freezingThreshold: status.settings.freezing_threshold.toString(),
			},
		},
	];
}

export async function executeGetInfo(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	// Get basic info is essentially the same as status but with less detail
	return executeGetStatus.call(this, index);
}

export async function executeGetModuleHash(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgent');
	const canisterId = this.getNodeParameter('canisterId', index) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const managementCanister = Actor.createActor<{
		canister_status: (args: { canister_id: Principal }) => Promise<CanisterStatus>;
	}>(managementCanisterIdlFactory, {
		agent,
		canisterId: Principal.fromText(MANAGEMENT_CANISTER_ID),
	});

	const status = await managementCanister.canister_status({
		canister_id: Principal.fromText(canisterId),
	});

	return [
		{
			json: {
				canisterId,
				moduleHash: status.module_hash.length > 0 && status.module_hash[0]
					? bytesToHex(status.module_hash[0])
					: null,
				hasModule: status.module_hash.length > 0,
			},
		},
	];
}

export async function executeGetControllers(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgent');
	const canisterId = this.getNodeParameter('canisterId', index) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const managementCanister = Actor.createActor<{
		canister_status: (args: { canister_id: Principal }) => Promise<CanisterStatus>;
	}>(managementCanisterIdlFactory, {
		agent,
		canisterId: Principal.fromText(MANAGEMENT_CANISTER_ID),
	});

	const status = await managementCanister.canister_status({
		canister_id: Principal.fromText(canisterId),
	});

	return [
		{
			json: {
				canisterId,
				controllers: status.settings.controllers.map((c) => c.toText()),
				controllerCount: status.settings.controllers.length,
			},
		},
	];
}

export async function executeGetCyclesBalance(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgent');
	const canisterId = this.getNodeParameter('canisterId', index) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const managementCanister = Actor.createActor<{
		canister_status: (args: { canister_id: Principal }) => Promise<CanisterStatus>;
	}>(managementCanisterIdlFactory, {
		agent,
		canisterId: Principal.fromText(MANAGEMENT_CANISTER_ID),
	});

	const status = await managementCanister.canister_status({
		canister_id: Principal.fromText(canisterId),
	});

	return [
		{
			json: {
				canisterId,
				cycles: status.cycles.toString(),
				cyclesTrillion: Number(status.cycles) / 1_000_000_000_000,
				idleCyclesBurnedPerDay: status.idle_cycles_burned_per_day.toString(),
				idleCyclesBurnedPerDayTrillion: Number(status.idle_cycles_burned_per_day) / 1_000_000_000_000,
			},
		},
	];
}

// Alias exports for Icp.node.ts compatibility
export { executeGetStatus as getCanisterStatus };
export { executeGetInfo as getCanisterInfo };
export { executeGetModuleHash as getCanisterModuleHash };
export { executeGetControllers as getCanisterControllers };
export { executeGetCyclesBalance as getCanisterCyclesBalance };
