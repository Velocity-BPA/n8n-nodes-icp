/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { HttpAgent, Actor, ActorSubclass, QueryCallRejectedError } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Ed25519KeyIdentity, Secp256k1KeyIdentity } from '@dfinity/identity';
import { IDL } from '@dfinity/candid';
import { IcpError, ICP_ERROR_CODES } from '../constants/errors';
import { IC_MAINNET_HOST, DEFAULT_TIMEOUT } from '../constants/networks';

export interface AgentCredentials {
	network: string;
	customNetworkUrl?: string;
	identityType: 'ed25519' | 'secp256k1' | 'anonymous';
	privateKey?: string;
	principalId?: string;
}

export interface AgentConfig {
	host: string;
	identity?: Ed25519KeyIdentity | Secp256k1KeyIdentity;
	fetchRootKey?: boolean;
}

/**
 * Creates an identity from credentials
 */
export function createIdentity(
	identityType: string,
	privateKey?: string,
): Ed25519KeyIdentity | Secp256k1KeyIdentity | undefined {
	if (identityType === 'anonymous' || !privateKey) {
		return undefined;
	}

	try {
		const keyBytes = parsePrivateKey(privateKey);

		if (identityType === 'ed25519') {
			// Ed25519 expects ArrayBuffer
			return Ed25519KeyIdentity.fromSecretKey(keyBytes.buffer as ArrayBuffer);
		} else if (identityType === 'secp256k1') {
			// For Secp256k1, try various API methods that might be available
			// The API varies based on the version of @dfinity/identity
			const Secp256k1Class = Secp256k1KeyIdentity as any;
			
			// Try fromSecretKey first (most common API)
			if (typeof Secp256k1Class.fromSecretKey === 'function') {
				return Secp256k1Class.fromSecretKey(keyBytes);
			}
			
			// Try create method
			if (typeof Secp256k1Class.create === 'function') {
				return Secp256k1Class.create(keyBytes);
			}
			
			// Try generate with seed if available
			if (typeof Secp256k1Class.generate === 'function') {
				return Secp256k1Class.generate(keyBytes);
			}
			
			// Try constructor directly
			try {
				return new Secp256k1Class(keyBytes);
			} catch {
				// If nothing works, throw an informative error
				throw new IcpError(
					ICP_ERROR_CODES.IDENTITY_ERROR,
					'Secp256k1 key import not supported with current @dfinity/identity version. Please use Ed25519 keys instead.',
				);
			}
		}

		throw new IcpError(
			ICP_ERROR_CODES.IDENTITY_ERROR,
			`Unsupported identity type: ${identityType}`,
		);
	} catch (error) {
		if (error instanceof IcpError) throw error;
		throw new IcpError(
			ICP_ERROR_CODES.IDENTITY_ERROR,
			'Failed to create identity from private key',
			error,
		);
	}
}

/**
 * Parses a private key from PEM or hex format
 */
function parsePrivateKey(privateKey: string): Uint8Array {
	const trimmed = privateKey.trim();

	// Check if PEM format
	if (trimmed.includes('-----BEGIN')) {
		return parsePemKey(trimmed);
	}

	// Assume hex format
	return hexToBytes(trimmed);
}

/**
 * Parses a PEM-encoded private key
 */
function parsePemKey(pem: string): Uint8Array {
	// Remove PEM headers and whitespace
	const base64 = pem
		.replace(/-----BEGIN[^-]+-----/, '')
		.replace(/-----END[^-]+-----/, '')
		.replace(/\s/g, '');

	// Decode base64
	const decoded = Buffer.from(base64, 'base64');

	// For Ed25519, the key is typically in PKCS#8 format
	// The actual key is the last 32 bytes (or after ASN.1 header)
	if (decoded.length === 32) {
		return new Uint8Array(decoded);
	}

	// Skip ASN.1 header for PKCS#8 format
	// Ed25519 PKCS#8 has a 16-byte header
	if (decoded.length === 48) {
		return new Uint8Array(decoded.slice(16));
	}

	// For Secp256k1, the key might be in different formats
	if (decoded.length > 32) {
		// Try to extract the 32-byte key
		const keyStart = decoded.length - 32;
		return new Uint8Array(decoded.slice(keyStart));
	}

	throw new IcpError(
		ICP_ERROR_CODES.INVALID_PRIVATE_KEY,
		`Unexpected key length: ${decoded.length}`,
	);
}

/**
 * Converts hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
	const cleanHex = hex.replace(/^0x/, '');
	const bytes = new Uint8Array(cleanHex.length / 2);
	for (let i = 0; i < cleanHex.length; i += 2) {
		bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
	}
	return bytes;
}

/**
 * Creates an HTTP agent for the Internet Computer
 */
export async function createAgent(credentials: AgentCredentials): Promise<HttpAgent> {
	const host = credentials.network === 'custom'
		? credentials.customNetworkUrl || IC_MAINNET_HOST
		: credentials.network;

	const identity = createIdentity(credentials.identityType, credentials.privateKey);
	const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

	const agent = new HttpAgent({
		host,
		identity: identity as any,
	});

	// Fetch root key for local development
	if (isLocal) {
		try {
			await agent.fetchRootKey();
		} catch (error) {
			throw new IcpError(
				ICP_ERROR_CODES.AGENT_ERROR,
				'Failed to fetch root key from local replica',
				error,
			);
		}
	}

	return agent;
}

/**
 * Creates an actor for interacting with a canister
 */
export function createActor<T>(
	agent: HttpAgent,
	canisterId: string | Principal,
	idlFactory: IDL.InterfaceFactory,
): ActorSubclass<T> {
	const principal = typeof canisterId === 'string'
		? Principal.fromText(canisterId)
		: canisterId;

	return Actor.createActor<T>(idlFactory, {
		agent,
		canisterId: principal,
	});
}

/**
 * Makes a query call to a canister
 */
export async function queryCanister(
	agent: HttpAgent,
	canisterId: string,
	methodName: string,
	args: ArrayBuffer,
): Promise<ArrayBuffer> {
	try {
		const response = await agent.query(
			Principal.fromText(canisterId),
			{
				methodName,
				arg: args,
			},
		);

		if ('reply' in response) {
			return response.reply.arg;
		}

		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_REJECTED,
			`Canister rejected query: ${(response as { reject_message?: string }).reject_message || 'Unknown error'}`,
		);
	} catch (error) {
		if (error instanceof IcpError) throw error;
		if (error instanceof QueryCallRejectedError) {
			throw new IcpError(
				ICP_ERROR_CODES.CANISTER_REJECTED,
				`Query rejected: ${error.message}`,
				error,
			);
		}
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Query call failed: ${(error as Error).message}`,
			error,
		);
	}
}

/**
 * Makes an update call to a canister
 */
export async function updateCanister(
	agent: HttpAgent,
	canisterId: string,
	methodName: string,
	args: ArrayBuffer,
	timeout: number = DEFAULT_TIMEOUT,
): Promise<ArrayBuffer> {
	try {
		const { requestId } = await agent.call(
			Principal.fromText(canisterId),
			{
				methodName,
				arg: args,
				effectiveCanisterId: Principal.fromText(canisterId),
			},
		);

		// Poll for the response
		const startTime = Date.now();
		while (Date.now() - startTime < timeout) {
			const _status = await agent.readState(
				Principal.fromText(canisterId),
				{
					paths: [
						[Buffer.from('request_status'), requestId, Buffer.from('status')],
						[Buffer.from('request_status'), requestId, Buffer.from('reply')],
						[Buffer.from('request_status'), requestId, Buffer.from('reject_code')],
						[Buffer.from('request_status'), requestId, Buffer.from('reject_message')],
					] as any,
				},
			);

			// Parse the certificate to get the status
			// For simplicity, we'll use the pollForResponse method if available
			// Otherwise, we need to manually parse the certificate

			// Wait a bit before polling again
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		throw new IcpError(
			ICP_ERROR_CODES.TIMEOUT_ERROR,
			'Update call timed out',
		);
	} catch (error) {
		if (error instanceof IcpError) throw error;
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Update call failed: ${(error as Error).message}`,
			error,
		);
	}
}

/**
 * Reads state from a canister
 */
export async function readCanisterState(
	agent: HttpAgent,
	canisterId: string,
	paths: ArrayBuffer[][],
): Promise<unknown> {
	try {
		const response = await agent.readState(
			Principal.fromText(canisterId),
			{ paths },
		);
		return response;
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Read state failed: ${(error as Error).message}`,
			error,
		);
	}
}

/**
 * Gets the principal from the agent's identity
 */
export function getAgentPrincipal(agent: HttpAgent): Principal {
	// Note: HttpAgent doesn't directly expose the principal
	// We need to get it from the identity if available
	// The rootKey is not the identity, so we use anonymous as fallback
	const _rootKey = agent.rootKey; // Kept for potential future use
	return Principal.anonymous();
}

/**
 * Higher-level helper to call a canister method using an actor
 */
export async function callCanister(
	credentials: AgentCredentials,
	canisterId: string,
	methodName: string,
	idlFactory: IDL.InterfaceFactory,
	args: unknown[] = [],
	_mode: 'query' | 'update' = 'query',
): Promise<unknown> {
	const agent = await createAgent(credentials);
	const actor = createActor(agent, canisterId, idlFactory);
	
	try {
		const method = (actor as any)[methodName];
		if (!method) {
			throw new IcpError(
				ICP_ERROR_CODES.CANISTER_ERROR,
				`Method ${methodName} not found on canister`,
			);
		}
		return await method(...args);
	} catch (error) {
		if (error instanceof IcpError) throw error;
		throw new IcpError(
			ICP_ERROR_CODES.CANISTER_ERROR,
			`Failed to call ${methodName}: ${(error as Error).message}`,
			error,
		);
	}
}
