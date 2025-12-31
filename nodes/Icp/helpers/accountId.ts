/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { Principal } from '@dfinity/principal';
import { sha256 } from 'js-sha256';
import { IcpError, ICP_ERROR_CODES } from '../constants/errors';

// Account identifier constants
const ACCOUNT_DOMAIN_SEPARATOR = '\x0Aaccount-id';
const SUB_ACCOUNT_ZERO = new Uint8Array(32);
const CRC_LENGTH = 4;

/**
 * Computes CRC32 checksum for account identifier validation
 */
function crc32(data: Uint8Array): Uint8Array {
	let crc = 0xFFFFFFFF;
	const table = new Uint32Array(256);

	// Generate CRC table
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let j = 0; j < 8; j++) {
			c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
		}
		table[i] = c;
	}

	// Calculate CRC
	for (let i = 0; i < data.length; i++) {
		crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
	}

	crc = crc ^ 0xFFFFFFFF;

	// Convert to bytes (big-endian)
	const result = new Uint8Array(4);
	result[0] = (crc >>> 24) & 0xFF;
	result[1] = (crc >>> 16) & 0xFF;
	result[2] = (crc >>> 8) & 0xFF;
	result[3] = crc & 0xFF;

	return result;
}

/**
 * Derives an account identifier from a principal and optional subaccount
 */
export function principalToAccountIdentifier(
	principal: Principal,
	subaccount?: Uint8Array,
): string {
	const subaccountBytes = subaccount || SUB_ACCOUNT_ZERO;

	if (subaccountBytes.length !== 32) {
		throw new IcpError(
			ICP_ERROR_CODES.INVALID_ACCOUNT_IDENTIFIER,
			'Subaccount must be exactly 32 bytes',
		);
	}

	// Compute the hash
	const hash = sha256.create();
	hash.update(ACCOUNT_DOMAIN_SEPARATOR);
	hash.update(principal.toUint8Array());
	hash.update(subaccountBytes);

	const hashBytes = new Uint8Array(hash.arrayBuffer());

	// Add CRC32 checksum
	const crcBytes = crc32(hashBytes);
	const accountId = new Uint8Array(CRC_LENGTH + hashBytes.length);
	accountId.set(crcBytes);
	accountId.set(hashBytes, CRC_LENGTH);

	return bytesToHex(accountId);
}

/**
 * Validates an account identifier string
 */
export function isValidAccountIdentifier(accountId: string): boolean {
	try {
		const bytes = hexToBytes(accountId);

		// Account ID is 36 bytes (4-byte CRC + 32-byte hash)
		if (bytes.length !== 36) {
			return false;
		}

		// Extract CRC and hash
		const crcBytes = bytes.slice(0, CRC_LENGTH);
		const hashBytes = bytes.slice(CRC_LENGTH);

		// Verify CRC
		const computedCrc = crc32(hashBytes);
		return arraysEqual(crcBytes, computedCrc);
	} catch {
		return false;
	}
}

/**
 * Converts bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Converts hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
	const cleanHex = hex.replace(/^0x/, '').toLowerCase();

	if (cleanHex.length % 2 !== 0) {
		throw new IcpError(
			ICP_ERROR_CODES.INVALID_ACCOUNT_IDENTIFIER,
			'Hex string must have even length',
		);
	}

	const bytes = new Uint8Array(cleanHex.length / 2);
	for (let i = 0; i < cleanHex.length; i += 2) {
		const byte = parseInt(cleanHex.substring(i, i + 2), 16);
		if (isNaN(byte)) {
			throw new IcpError(
				ICP_ERROR_CODES.INVALID_ACCOUNT_IDENTIFIER,
				`Invalid hex character at position ${i}`,
			);
		}
		bytes[i / 2] = byte;
	}

	return bytes;
}

/**
 * Compares two Uint8Arrays for equality
 */
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

/**
 * Creates a subaccount from an index
 */
export function indexToSubaccount(index: number): Uint8Array {
	const subaccount = new Uint8Array(32);
	const view = new DataView(subaccount.buffer);
	view.setBigUint64(24, BigInt(index), false); // Big-endian at the end
	return subaccount;
}

/**
 * Creates a subaccount from a principal
 */
export function principalToSubaccount(principal: Principal): Uint8Array {
	const principalBytes = principal.toUint8Array();
	const subaccount = new Uint8Array(32);

	// First byte is the length
	subaccount[0] = principalBytes.length;
	subaccount.set(principalBytes, 1);

	return subaccount;
}

/**
 * Converts ICRC-1 account format to legacy account identifier
 */
export function icrc1AccountToAccountIdentifier(
	owner: Principal,
	subaccount?: Uint8Array,
): string {
	return principalToAccountIdentifier(owner, subaccount);
}

/**
 * Parses an account identifier string and validates it
 */
export function parseAccountIdentifier(accountId: string): Uint8Array {
	const bytes = hexToBytes(accountId);

	if (bytes.length !== 32) {
		throw new IcpError(
			ICP_ERROR_CODES.INVALID_ACCOUNT_IDENTIFIER,
			`Account identifier must be 32 bytes, got ${bytes.length}`,
		);
	}

	if (!isValidAccountIdentifier(accountId)) {
		throw new IcpError(
			ICP_ERROR_CODES.INVALID_ACCOUNT_IDENTIFIER,
			'Account identifier checksum validation failed',
		);
	}

	return bytes;
}

// ICRC-1 Account interfaces
export interface IcrcAccount {
	owner: string;
	subaccount?: string | null;
}

/**
 * Converts an account ID bytes to ICRC-1 account format
 * Note: This is a limited conversion as account IDs are derived from principals
 */
export function toIcrcAccount(accountIdBytes: Uint8Array): IcrcAccount {
	// Note: Account identifiers cannot be directly converted back to ICRC accounts
	// because the principal information is lost in the hashing process.
	// This function returns a placeholder indicating the limitation.
	return {
		owner: 'Cannot derive owner from account identifier - information is lost in hash',
		subaccount: bytesToHex(accountIdBytes),
	};
}

/**
 * Converts an ICRC-1 account to account identifier bytes
 */
export function fromIcrcAccount(account: IcrcAccount): Uint8Array {
	const principal = Principal.fromText(account.owner);
	const subaccount = account.subaccount
		? hexToBytes(account.subaccount)
		: undefined;
	const accountId = principalToAccountIdentifier(principal, subaccount);
	return hexToBytes(accountId);
}

// Alias exports for backwards compatibility
export { principalToAccountIdentifier as accountIdFromPrincipal };
export { bytesToHex as accountIdToHex };
export { hexToBytes as hexToAccountId };
export { isValidAccountIdentifier as isValidAccountId };
export { indexToSubaccount as subaccountFromIndex };
export { principalToSubaccount as subaccountFromPrincipal };
