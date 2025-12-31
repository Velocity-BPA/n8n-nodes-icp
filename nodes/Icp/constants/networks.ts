/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

export const NETWORKS = {
	MAINNET: {
		url: 'https://ic0.app',
		name: 'Internet Computer Mainnet',
	},
	LOCAL: {
		url: 'http://localhost:4943',
		name: 'Local Replica',
	},
} as const;

export const ROSETTA_ENDPOINTS = {
	MAINNET: 'https://rosetta-api.internetcomputer.org',
} as const;

export const NETWORK_IDENTIFIER = {
	blockchain: 'Internet Computer',
	network: '00000000000000020101',
} as const;

export const IC_MAINNET_HOST = 'https://ic0.app';
export const IC_LOCAL_HOST = 'http://localhost:4943';

export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_POLL_INTERVAL = 1000;
export const DEFAULT_MAX_RETRIES = 3;

export type NetworkType = keyof typeof NETWORKS;
