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

export class IcpRosettaApi implements ICredentialType {
	name = 'icpRosettaApi';
	displayName = 'ICP Rosetta';
	documentationUrl = 'https://internetcomputer.org/docs/current/developer-docs/integrations/rosetta/';
	properties: INodeProperties[] = [
		{
			displayName: 'Rosetta API URL',
			name: 'rosettaUrl',
			type: 'string',
			default: 'https://rosetta-api.internetcomputer.org',
			placeholder: 'https://rosetta-api.internetcomputer.org',
			description: 'The Rosetta API endpoint URL',
		},
		{
			displayName: 'Network Identifier',
			name: 'networkIdentifier',
			type: 'options',
			options: [
				{
					name: 'Internet Computer (Mainnet)',
					value: 'mainnet',
				},
				{
					name: 'Custom',
					value: 'custom',
				},
			],
			default: 'mainnet',
			description: 'The network identifier for Rosetta API',
		},
		{
			displayName: 'Custom Blockchain',
			name: 'customBlockchain',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					networkIdentifier: ['custom'],
				},
			},
			placeholder: 'Internet Computer',
			description: 'Custom blockchain identifier',
		},
		{
			displayName: 'Custom Network',
			name: 'customNetwork',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					networkIdentifier: ['custom'],
				},
			},
			placeholder: '00000000000000020101',
			description: 'Custom network identifier (hex)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Content-Type': 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.rosettaUrl}}',
			url: '/network/list',
			method: 'POST',
			body: {
				metadata: {},
			},
		},
	};
}
