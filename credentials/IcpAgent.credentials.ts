/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class IcpAgentApi implements ICredentialType {
	name = 'icpAgentApi';
	displayName = 'ICP Agent';
	documentationUrl = 'https://internetcomputer.org/docs/current/developer-docs/agents/';
	properties: INodeProperties[] = [
		{
			displayName: 'Network',
			name: 'network',
			type: 'options',
			options: [
				{
					name: 'Mainnet',
					value: 'https://ic0.app',
				},
				{
					name: 'Local',
					value: 'http://localhost:4943',
				},
				{
					name: 'Custom',
					value: 'custom',
				},
			],
			default: 'https://ic0.app',
			description: 'The Internet Computer network to connect to',
		},
		{
			displayName: 'Custom Network URL',
			name: 'customNetworkUrl',
			type: 'string',
			default: '',
			placeholder: 'https://your-ic-replica.com',
			displayOptions: {
				show: {
					network: ['custom'],
				},
			},
			description: 'Custom IC network URL',
		},
		{
			displayName: 'Identity Type',
			name: 'identityType',
			type: 'options',
			options: [
				{
					name: 'Ed25519 Private Key',
					value: 'ed25519',
				},
				{
					name: 'Secp256k1 Private Key',
					value: 'secp256k1',
				},
				{
					name: 'Anonymous',
					value: 'anonymous',
				},
			],
			default: 'ed25519',
			description: 'The type of identity to use for authentication',
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				hide: {
					identityType: ['anonymous'],
				},
			},
			placeholder: '-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----',
			description: 'Private key in PEM format or raw hex format',
		},
		{
			displayName: 'Principal ID (Optional)',
			name: 'principalId',
			type: 'string',
			default: '',
			placeholder: 'xxxxx-xxxxx-xxxxx-xxxxx-cai',
			description: 'Your Principal ID (will be derived from private key if not provided)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.network === "custom" ? $credentials.customNetworkUrl : $credentials.network}}',
			url: '/api/v2/status',
			method: 'GET',
		},
	};
}
