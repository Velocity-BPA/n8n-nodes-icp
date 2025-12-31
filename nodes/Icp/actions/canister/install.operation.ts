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
import { hexToBytes } from '../../helpers/accountId';

export const installDescription: INodeProperties[] = [
	{
		displayName: 'Canister ID',
		name: 'canisterId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., ryjl3-tyaaa-aaaaa-aaaba-cai',
		description: 'The canister ID to install code to',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['installCode'],
			},
		},
	},
	{
		displayName: 'Install Mode',
		name: 'installMode',
		type: 'options',
		options: [
			{ name: 'Install', value: 'install' },
			{ name: 'Reinstall', value: 'reinstall' },
			{ name: 'Upgrade', value: 'upgrade' },
		],
		default: 'install',
		description: 'The installation mode',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['installCode'],
			},
		},
	},
	{
		displayName: 'WASM Module (Hex)',
		name: 'wasmModuleHex',
		type: 'string',
		required: true,
		default: '',
		description: 'The WASM module in hexadecimal format',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['installCode'],
			},
		},
	},
	{
		displayName: 'Init Arguments (Hex)',
		name: 'initArgsHex',
		type: 'string',
		default: '',
		description: 'Candid-encoded initialization arguments in hex format',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['installCode'],
			},
		},
	},
];

export const upgradeDescription: INodeProperties[] = [
	{
		displayName: 'Canister ID',
		name: 'canisterId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., ryjl3-tyaaa-aaaaa-aaaba-cai',
		description: 'The canister ID to upgrade',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['upgradeCode'],
			},
		},
	},
	{
		displayName: 'WASM Module (Hex)',
		name: 'wasmModuleHex',
		type: 'string',
		required: true,
		default: '',
		description: 'The new WASM module in hexadecimal format',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['upgradeCode'],
			},
		},
	},
	{
		displayName: 'Upgrade Arguments (Hex)',
		name: 'upgradeArgsHex',
		type: 'string',
		default: '',
		description: 'Candid-encoded upgrade arguments in hex format',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['upgradeCode'],
			},
		},
	},
];

export const uninstallDescription: INodeProperties[] = [
	{
		displayName: 'Canister ID',
		name: 'canisterId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., ryjl3-tyaaa-aaaaa-aaaba-cai',
		description: 'The canister ID to uninstall code from',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['uninstallCode'],
			},
		},
	},
];

export const lifecycleDescription: INodeProperties[] = [
	{
		displayName: 'Canister ID',
		name: 'canisterId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g., ryjl3-tyaaa-aaaaa-aaaba-cai',
		description: 'The canister ID',
		displayOptions: {
			show: {
				resource: ['canister'],
				operation: ['startCanister', 'stopCanister', 'deleteCanister'],
			},
		},
	},
];

interface ManagementCanister {
	install_code: (args: {
		mode: { install: null } | { reinstall: null } | { upgrade: null };
		canister_id: Principal;
		wasm_module: Uint8Array;
		arg: Uint8Array;
	}) => Promise<void>;
	uninstall_code: (args: { canister_id: Principal }) => Promise<void>;
	start_canister: (args: { canister_id: Principal }) => Promise<void>;
	stop_canister: (args: { canister_id: Principal }) => Promise<void>;
	delete_canister: (args: { canister_id: Principal }) => Promise<void>;
}

export async function executeInstallCode(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgent');

	const canisterId = this.getNodeParameter('canisterId', index) as string;
	const installMode = this.getNodeParameter('installMode', index) as string;
	const wasmModuleHex = this.getNodeParameter('wasmModuleHex', index) as string;
	const initArgsHex = this.getNodeParameter('initArgsHex', index) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const managementCanister = Actor.createActor<ManagementCanister>(
		managementCanisterIdlFactory,
		{
			agent,
			canisterId: Principal.fromText(MANAGEMENT_CANISTER_ID),
		},
	);

	// Parse mode
	let mode: { install: null } | { reinstall: null } | { upgrade: null };
	if (installMode === 'reinstall') {
		mode = { reinstall: null };
	} else if (installMode === 'upgrade') {
		mode = { upgrade: null };
	} else {
		mode = { install: null };
	}

	const wasmModule = hexToBytes(wasmModuleHex);
	const initArgs = initArgsHex ? hexToBytes(initArgsHex) : new Uint8Array(0);

	await managementCanister.install_code({
		mode,
		canister_id: Principal.fromText(canisterId),
		wasm_module: wasmModule,
		arg: initArgs,
	});

	return [
		{
			json: {
				success: true,
				canisterId,
				mode: installMode,
				wasmSize: wasmModule.length,
			},
		},
	];
}

export async function executeUpgradeCode(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('icpAgent');

	const canisterId = this.getNodeParameter('canisterId', index) as string;
	const wasmModuleHex = this.getNodeParameter('wasmModuleHex', index) as string;
	const upgradeArgsHex = this.getNodeParameter('upgradeArgsHex', index) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const managementCanister = Actor.createActor<ManagementCanister>(
		managementCanisterIdlFactory,
		{
			agent,
			canisterId: Principal.fromText(MANAGEMENT_CANISTER_ID),
		},
	);

	const wasmModule = hexToBytes(wasmModuleHex);
	const upgradeArgs = upgradeArgsHex ? hexToBytes(upgradeArgsHex) : new Uint8Array(0);

	await managementCanister.install_code({
		mode: { upgrade: null },
		canister_id: Principal.fromText(canisterId),
		wasm_module: wasmModule,
		arg: upgradeArgs,
	});

	return [
		{
			json: {
				success: true,
				canisterId,
				mode: 'upgrade',
				wasmSize: wasmModule.length,
			},
		},
	];
}

export async function executeUninstallCode(
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

	const managementCanister = Actor.createActor<ManagementCanister>(
		managementCanisterIdlFactory,
		{
			agent,
			canisterId: Principal.fromText(MANAGEMENT_CANISTER_ID),
		},
	);

	await managementCanister.uninstall_code({
		canister_id: Principal.fromText(canisterId),
	});

	return [
		{
			json: {
				success: true,
				canisterId,
				action: 'uninstall_code',
			},
		},
	];
}

export async function executeStartCanister(
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

	const managementCanister = Actor.createActor<ManagementCanister>(
		managementCanisterIdlFactory,
		{
			agent,
			canisterId: Principal.fromText(MANAGEMENT_CANISTER_ID),
		},
	);

	await managementCanister.start_canister({
		canister_id: Principal.fromText(canisterId),
	});

	return [
		{
			json: {
				success: true,
				canisterId,
				action: 'start_canister',
			},
		},
	];
}

export async function executeStopCanister(
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

	const managementCanister = Actor.createActor<ManagementCanister>(
		managementCanisterIdlFactory,
		{
			agent,
			canisterId: Principal.fromText(MANAGEMENT_CANISTER_ID),
		},
	);

	await managementCanister.stop_canister({
		canister_id: Principal.fromText(canisterId),
	});

	return [
		{
			json: {
				success: true,
				canisterId,
				action: 'stop_canister',
			},
		},
	];
}

export async function executeDeleteCanister(
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

	const managementCanister = Actor.createActor<ManagementCanister>(
		managementCanisterIdlFactory,
		{
			agent,
			canisterId: Principal.fromText(MANAGEMENT_CANISTER_ID),
		},
	);

	await managementCanister.delete_canister({
		canister_id: Principal.fromText(canisterId),
	});

	return [
		{
			json: {
				success: true,
				canisterId,
				action: 'delete_canister',
			},
		},
	];
}

// Export aliases for Icp.node.ts compatibility
export {
	executeInstallCode as installCode,
	executeUpgradeCode as upgradeCode,
	executeUninstallCode as uninstallCode,
	executeStartCanister as startCanister,
	executeStopCanister as stopCanister,
	executeDeleteCanister as deleteCanister,
};
