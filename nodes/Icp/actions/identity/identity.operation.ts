/**
 * n8n-nodes-icp: Identity Operations
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
import {
	parsePrincipal,
	isPrincipalValid,
	getAnonymousPrincipal,
	isSelfAuthenticating,
	isAnonymous,
	isReserved,
	principalToText,
} from '../../helpers/principal';
import {
	accountIdFromPrincipal,
	hexToAccountId,
	isValidAccountId,
	subaccountFromIndex,
	subaccountFromPrincipal,
	toIcrcAccount,
	fromIcrcAccount,
} from '../../helpers/accountId';
import { createIdentity } from '../../transport/agent';

/**
 * Identity operation properties
 */
export const identityOperationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['identity'],
			},
		},
		options: [
			{
				name: 'Convert Account Format',
				value: 'convertAccountFormat',
				description: 'Convert between account ID and ICRC-1 account formats',
				action: 'Convert account format',
			},
			{
				name: 'Derive Account Identifier',
				value: 'deriveAccountId',
				description: 'Derive account identifier from principal and optional subaccount',
				action: 'Derive account identifier',
			},
			{
				name: 'Derive Subaccount',
				value: 'deriveSubaccount',
				description: 'Derive a subaccount from index or principal',
				action: 'Derive subaccount',
			},
			{
				name: 'Get Principal',
				value: 'getPrincipal',
				description: 'Get principal from configured identity',
				action: 'Get principal',
			},
			{
				name: 'Validate Principal',
				value: 'validatePrincipal',
				description: 'Validate and analyze a principal',
				action: 'Validate principal',
			},
		],
		default: 'getPrincipal',
	},
	{
		displayName: 'Principal',
		name: 'principal',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['validatePrincipal', 'deriveAccountId'],
			},
		},
		placeholder: 'e.g., xxxxx-xxxxx-xxxxx-xxxxx-cai',
		description: 'The principal to validate or use',
	},
	{
		displayName: 'Subaccount Source',
		name: 'subaccountSource',
		type: 'options',
		options: [
			{
				name: 'From Index',
				value: 'index',
				description: 'Derive subaccount from numeric index',
			},
			{
				name: 'From Principal',
				value: 'principal',
				description: 'Derive subaccount from principal',
			},
			{
				name: 'From Hex',
				value: 'hex',
				description: 'Use raw hex subaccount',
			},
		],
		default: 'index',
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['deriveSubaccount', 'deriveAccountId'],
			},
		},
	},
	{
		displayName: 'Subaccount Index',
		name: 'subaccountIndex',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['deriveSubaccount', 'deriveAccountId'],
				subaccountSource: ['index'],
			},
		},
		description: 'The numeric index to derive subaccount from',
	},
	{
		displayName: 'Subaccount Principal',
		name: 'subaccountPrincipal',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['deriveSubaccount', 'deriveAccountId'],
				subaccountSource: ['principal'],
			},
		},
		description: 'The principal to derive subaccount from',
	},
	{
		displayName: 'Subaccount Hex',
		name: 'subaccountHex',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['deriveSubaccount', 'deriveAccountId'],
				subaccountSource: ['hex'],
			},
		},
		description: 'Raw 32-byte subaccount in hex format',
	},
	{
		displayName: 'Conversion Direction',
		name: 'conversionDirection',
		type: 'options',
		options: [
			{
				name: 'Account ID to ICRC-1',
				value: 'toIcrc',
				description: 'Convert account identifier to ICRC-1 account format',
			},
			{
				name: 'ICRC-1 to Account ID',
				value: 'fromIcrc',
				description: 'Convert ICRC-1 account to account identifier',
			},
		],
		default: 'toIcrc',
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['convertAccountFormat'],
			},
		},
	},
	{
		displayName: 'Account Identifier',
		name: 'accountIdentifier',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['convertAccountFormat'],
				conversionDirection: ['toIcrc'],
			},
		},
		description: 'The 32-byte account identifier in hex format',
	},
	{
		displayName: 'ICRC Owner Principal',
		name: 'icrcOwnerPrincipal',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['convertAccountFormat'],
				conversionDirection: ['fromIcrc'],
			},
		},
		description: 'The owner principal of the ICRC-1 account',
	},
	{
		displayName: 'ICRC Subaccount (Hex)',
		name: 'icrcSubaccount',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['convertAccountFormat'],
				conversionDirection: ['fromIcrc'],
			},
		},
		description: 'Optional 32-byte subaccount in hex format',
	},
];

/**
 * Get principal from configured identity
 */
export async function getPrincipal(
	this: IExecuteFunctions,
	_itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgent');

	if (credentials.identityType === 'anonymous') {
		const anonymousPrincipal = getAnonymousPrincipal();
		return {
			principal: principalToText(anonymousPrincipal),
			isAnonymous: true,
			isSelfAuthenticating: false,
			accountIdentifier: accountIdFromPrincipal(anonymousPrincipal),
		};
	}

	const identity = createIdentity(
		credentials.identityType as string,
		credentials.privateKey as string,
	);

	if (!identity) {
		throw new Error('Failed to create identity from credentials');
	}

	// Cast to any to access getPrincipal method
	const principal = (identity as { getPrincipal(): { toText(): string; toUint8Array(): Uint8Array } }).getPrincipal();
	const accountId = accountIdFromPrincipal(principal as unknown as import('@dfinity/principal').Principal);

	return {
		principal: principal.toText(),
		isAnonymous: isAnonymous(principal as unknown as import('@dfinity/principal').Principal),
		isSelfAuthenticating: isSelfAuthenticating(principal as unknown as import('@dfinity/principal').Principal),
		accountIdentifier: accountId,
	};
}

/**
 * Validate and analyze a principal
 */
export async function validatePrincipal(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const principalText = this.getNodeParameter('principal', itemIndex) as string;

	const isValid = isPrincipalValid(principalText);

	if (!isValid) {
		return {
			principal: principalText,
			isValid: false,
			error: 'Invalid principal format',
		};
	}

	const principal = parsePrincipal(principalText);
	const accountId = accountIdFromPrincipal(principal);

	return {
		principal: principalText,
		isValid: true,
		isAnonymous: isAnonymous(principal),
		isSelfAuthenticating: isSelfAuthenticating(principal),
		isReserved: isReserved(principal),
		isCanister: principalText.endsWith('-cai'),
		accountIdentifier: accountId,
		rawBytes: Buffer.from(principal.toUint8Array()).toString('hex'),
		byteLength: principal.toUint8Array().length,
	};
}

/**
 * Derive account identifier from principal and optional subaccount
 */
export async function deriveAccountId(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const principalText = this.getNodeParameter('principal', itemIndex) as string;
	const subaccountSource = this.getNodeParameter('subaccountSource', itemIndex) as string;

	const principal = parsePrincipal(principalText);

	let subaccount: Uint8Array | undefined;

	if (subaccountSource === 'index') {
		const index = this.getNodeParameter('subaccountIndex', itemIndex) as number;
		if (index > 0) {
			subaccount = subaccountFromIndex(index);
		}
	} else if (subaccountSource === 'principal') {
		const subPrincipal = this.getNodeParameter('subaccountPrincipal', itemIndex) as string;
		if (subPrincipal) {
			subaccount = subaccountFromPrincipal(parsePrincipal(subPrincipal));
		}
	} else if (subaccountSource === 'hex') {
		const hex = this.getNodeParameter('subaccountHex', itemIndex) as string;
		if (hex) {
			const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
			subaccount = new Uint8Array(Buffer.from(cleanHex, 'hex'));
		}
	}

	const accountId = accountIdFromPrincipal(principal, subaccount);

	return {
		principal: principalText,
		subaccount: subaccount ? Buffer.from(subaccount).toString('hex') : null,
		accountIdentifier: accountId,
	};
}

/**
 * Derive a subaccount from index or principal
 */
export async function deriveSubaccount(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const subaccountSource = this.getNodeParameter('subaccountSource', itemIndex) as string;

	let subaccount: Uint8Array;
	let source: string;

	if (subaccountSource === 'index') {
		const index = this.getNodeParameter('subaccountIndex', itemIndex) as number;
		subaccount = subaccountFromIndex(index);
		source = `index:${index}`;
	} else if (subaccountSource === 'principal') {
		const principalText = this.getNodeParameter(
			'subaccountPrincipal',
			itemIndex,
		) as string;
		subaccount = subaccountFromPrincipal(parsePrincipal(principalText));
		source = `principal:${principalText}`;
	} else {
		const hex = this.getNodeParameter('subaccountHex', itemIndex) as string;
		const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
		subaccount = new Uint8Array(Buffer.from(cleanHex, 'hex'));
		source = 'hex';
	}

	return {
		subaccount: Buffer.from(subaccount).toString('hex'),
		source,
		byteLength: subaccount.length,
		isZero: subaccount.every((b) => b === 0),
	};
}

/**
 * Convert between account formats
 */
export async function convertAccountFormat(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const direction = this.getNodeParameter('conversionDirection', itemIndex) as string;

	if (direction === 'toIcrc') {
		const accountIdentifier = this.getNodeParameter(
			'accountIdentifier',
			itemIndex,
		) as string;

		if (!isValidAccountId(accountIdentifier)) {
			throw new Error('Invalid account identifier format');
		}

		const accountIdBytes = hexToAccountId(accountIdentifier);
		const icrcAccount = toIcrcAccount(accountIdBytes);

		return {
			accountIdentifier,
			icrcAccount: {
				owner: icrcAccount.owner,
				subaccount: icrcAccount.subaccount || null,
			},
			note: 'Conversion from account ID to ICRC-1 may not always be reversible',
		};
	} else {
		const ownerPrincipal = this.getNodeParameter(
			'icrcOwnerPrincipal',
			itemIndex,
		) as string;
		const subaccountHex = this.getNodeParameter('icrcSubaccount', itemIndex) as string;

		const subaccount = subaccountHex
			? Buffer.from(
					subaccountHex.startsWith('0x') ? subaccountHex.slice(2) : subaccountHex,
					'hex',
				).toString('hex')
			: undefined;

		const accountId = fromIcrcAccount({
			owner: ownerPrincipal,
			subaccount,
		});

		return {
			icrcAccount: {
				owner: ownerPrincipal,
				subaccount: subaccount || null,
			},
			accountIdentifier: Buffer.from(accountId).toString('hex'),
		};
	}
}

// Export alias for Icp.node.ts compatibility
export { deriveAccountId as getAccountIdentifier };
