/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

export const ICP_ERROR_CODES = {
	// Agent Errors
	AGENT_ERROR: 'AGENT_ERROR',
	IDENTITY_ERROR: 'IDENTITY_ERROR',
	CANISTER_ERROR: 'CANISTER_ERROR',
	TIMEOUT_ERROR: 'TIMEOUT_ERROR',

	// Canister Errors
	CANISTER_NOT_FOUND: 'CANISTER_NOT_FOUND',
	CANISTER_REJECTED: 'CANISTER_REJECTED',
	CANISTER_TRAPPED: 'CANISTER_TRAPPED',
	INSUFFICIENT_CYCLES: 'INSUFFICIENT_CYCLES',

	// Ledger Errors
	INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
	INVALID_ACCOUNT: 'INVALID_ACCOUNT',
	TRANSFER_FAILED: 'TRANSFER_FAILED',
	BLOCK_NOT_FOUND: 'BLOCK_NOT_FOUND',

	// Governance Errors
	PROPOSAL_NOT_FOUND: 'PROPOSAL_NOT_FOUND',
	NEURON_NOT_FOUND: 'NEURON_NOT_FOUND',
	VOTING_ERROR: 'VOTING_ERROR',

	// Rosetta Errors
	ROSETTA_ERROR: 'ROSETTA_ERROR',
	NETWORK_ERROR: 'NETWORK_ERROR',
	INVALID_REQUEST: 'INVALID_REQUEST',

	// ICRC Errors
	ICRC_INSUFFICIENT_FUNDS: 'ICRC_INSUFFICIENT_FUNDS',
	ICRC_TOO_OLD: 'ICRC_TOO_OLD',
	ICRC_CREATED_IN_FUTURE: 'ICRC_CREATED_IN_FUTURE',
	ICRC_DUPLICATE: 'ICRC_DUPLICATE',
	ICRC_BAD_FEE: 'ICRC_BAD_FEE',
	ICRC_BAD_BURN: 'ICRC_BAD_BURN',
	ICRC_TEMPORARY_UNAVAILABLE: 'ICRC_TEMPORARY_UNAVAILABLE',
	ICRC_GENERIC_ERROR: 'ICRC_GENERIC_ERROR',

	// Validation Errors
	INVALID_PRINCIPAL: 'INVALID_PRINCIPAL',
	INVALID_CANISTER_ID: 'INVALID_CANISTER_ID',
	INVALID_ACCOUNT_IDENTIFIER: 'INVALID_ACCOUNT_IDENTIFIER',
	INVALID_PRIVATE_KEY: 'INVALID_PRIVATE_KEY',
	INVALID_CANDID: 'INVALID_CANDID',
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	QUERY_ERROR: 'QUERY_ERROR',
} as const;

export const ICP_ERROR_MESSAGES: Record<string, string> = {
	[ICP_ERROR_CODES.AGENT_ERROR]: 'Failed to communicate with the Internet Computer',
	[ICP_ERROR_CODES.IDENTITY_ERROR]: 'Failed to create or use identity',
	[ICP_ERROR_CODES.CANISTER_ERROR]: 'Canister call failed',
	[ICP_ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out',
	[ICP_ERROR_CODES.CANISTER_NOT_FOUND]: 'Canister not found',
	[ICP_ERROR_CODES.CANISTER_REJECTED]: 'Canister rejected the call',
	[ICP_ERROR_CODES.CANISTER_TRAPPED]: 'Canister trapped during execution',
	[ICP_ERROR_CODES.INSUFFICIENT_CYCLES]: 'Insufficient cycles',
	[ICP_ERROR_CODES.INSUFFICIENT_FUNDS]: 'Insufficient funds for transfer',
	[ICP_ERROR_CODES.INVALID_ACCOUNT]: 'Invalid account identifier',
	[ICP_ERROR_CODES.TRANSFER_FAILED]: 'Transfer failed',
	[ICP_ERROR_CODES.BLOCK_NOT_FOUND]: 'Block not found',
	[ICP_ERROR_CODES.PROPOSAL_NOT_FOUND]: 'Proposal not found',
	[ICP_ERROR_CODES.NEURON_NOT_FOUND]: 'Neuron not found',
	[ICP_ERROR_CODES.VOTING_ERROR]: 'Voting operation failed',
	[ICP_ERROR_CODES.ROSETTA_ERROR]: 'Rosetta API error',
	[ICP_ERROR_CODES.NETWORK_ERROR]: 'Network communication error',
	[ICP_ERROR_CODES.INVALID_REQUEST]: 'Invalid request',
	[ICP_ERROR_CODES.INVALID_PRINCIPAL]: 'Invalid principal format',
	[ICP_ERROR_CODES.INVALID_CANISTER_ID]: 'Invalid canister ID',
	[ICP_ERROR_CODES.INVALID_ACCOUNT_IDENTIFIER]: 'Invalid account identifier format',
	[ICP_ERROR_CODES.INVALID_PRIVATE_KEY]: 'Invalid private key format',
	[ICP_ERROR_CODES.INVALID_CANDID]: 'Invalid Candid encoding',
};

export class IcpError extends Error {
	code: string;
	details?: unknown;

	constructor(code: string, message?: string, details?: unknown) {
		super(message || ICP_ERROR_MESSAGES[code] || 'Unknown ICP error');
		this.name = 'IcpError';
		this.code = code;
		this.details = details;
	}
}

export type IcpErrorCode = typeof ICP_ERROR_CODES[keyof typeof ICP_ERROR_CODES];
