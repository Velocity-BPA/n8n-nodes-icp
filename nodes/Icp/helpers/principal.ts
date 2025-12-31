/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { Principal } from '@dfinity/principal';
import { IcpError, ICP_ERROR_CODES } from '../constants/errors';

/**
 * Validates and parses a principal string
 */
export function parsePrincipal(principalStr: string): Principal {
	try {
		return Principal.fromText(principalStr.trim());
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.INVALID_PRINCIPAL,
			`Invalid principal format: ${principalStr}`,
			error,
		);
	}
}

/**
 * Converts a Principal to its text representation
 */
export function principalToText(principal: Principal): string {
	return principal.toText();
}

/**
 * Converts a Principal to Uint8Array
 */
export function principalToBytes(principal: Principal): Uint8Array {
	return principal.toUint8Array();
}

/**
 * Creates a Principal from bytes
 */
export function principalFromBytes(bytes: Uint8Array): Principal {
	return Principal.fromUint8Array(bytes);
}

/**
 * Validates a principal string without throwing
 */
export function isValidPrincipal(principalStr: string): boolean {
	try {
		Principal.fromText(principalStr.trim());
		return true;
	} catch {
		return false;
	}
}

/**
 * Returns the anonymous principal
 */
export function getAnonymousPrincipal(): Principal {
	return Principal.anonymous();
}

/**
 * Checks if a principal is anonymous
 */
export function isAnonymousPrincipal(principal: Principal): boolean {
	return principal.isAnonymous();
}

/**
 * Creates a self-authenticating principal from a public key
 */
export function selfAuthenticatingPrincipal(publicKey: Uint8Array): Principal {
	return Principal.selfAuthenticating(publicKey);
}

/**
 * Derives a canister principal from a canister ID string
 */
export function canisterPrincipal(canisterId: string): Principal {
	return parsePrincipal(canisterId);
}

/**
 * Compares two principals for equality
 */
export function principalsEqual(a: Principal, b: Principal): boolean {
	return a.compareTo(b) === 'eq';
}

/**
 * Gets the management canister principal
 */
export function managementCanisterPrincipal(): Principal {
	return Principal.fromText('aaaaa-aa');
}

// Alias exports for backwards compatibility
export { isValidPrincipal as isPrincipalValid };
export { parsePrincipal as textToPrincipal };
export { isAnonymousPrincipal as isAnonymous };

/**
 * Checks if a principal is self-authenticating
 */
export function isSelfAuthenticating(principal: Principal): boolean {
	const bytes = principal.toUint8Array();
	// Self-authenticating principals have a specific format:
	// - Length of 29 bytes
	// - Last byte is 0x02
	return bytes.length === 29 && bytes[bytes.length - 1] === 0x02;
}

/**
 * Checks if a principal is a reserved principal
 */
export function isReserved(principal: Principal): boolean {
	const bytes = principal.toUint8Array();
	// Reserved principals are used for system canisters
	// They have last byte 0x01
	return bytes.length > 0 && bytes[bytes.length - 1] === 0x01;
}
