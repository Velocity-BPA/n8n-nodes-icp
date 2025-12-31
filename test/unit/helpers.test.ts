/**
 * Unit Tests for ICP Helpers
 *
 * Copyright © 2025 Velocity BPA. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 */

import { Principal } from '@dfinity/principal';
import {
	parsePrincipal,
	isPrincipalValid,
	principalToText,
	getAnonymousPrincipal,
} from '../../nodes/Icp/helpers/principal';

import {
	principalToAccountIdentifier,
	isValidAccountIdentifier,
	hexToBytes,
	bytesToHex,
	indexToSubaccount,
	subaccountFromIndex,
} from '../../nodes/Icp/helpers/accountId';

describe('Principal Helpers', () => {
	describe('parsePrincipal', () => {
		it('should parse a valid principal string', () => {
			const principalText = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
			const principal = parsePrincipal(principalText);
			expect(principal).toBeDefined();
			expect(principal.toText()).toBe(principalText);
		});

		it('should throw for invalid principal string', () => {
			expect(() => parsePrincipal('invalid-principal')).toThrow();
		});

		it('should parse anonymous principal', () => {
			const principal = parsePrincipal('2vxsx-fae');
			expect(principal).toBeDefined();
			expect(principal.isAnonymous()).toBe(true);
		});
	});

	describe('isPrincipalValid', () => {
		it('should return true for valid principal', () => {
			expect(isPrincipalValid('rrkah-fqaaa-aaaaa-aaaaq-cai')).toBe(true);
		});

		it('should return false for invalid principal', () => {
			expect(isPrincipalValid('invalid')).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(isPrincipalValid('')).toBe(false);
		});
	});

	describe('principalToText', () => {
		it('should convert principal to text representation', () => {
			const principal = parsePrincipal('rrkah-fqaaa-aaaaa-aaaaq-cai');
			expect(principalToText(principal)).toBe('rrkah-fqaaa-aaaaa-aaaaq-cai');
		});
	});

	describe('getAnonymousPrincipal', () => {
		it('should return anonymous principal', () => {
			const principal = getAnonymousPrincipal();
			expect(principal.isAnonymous()).toBe(true);
			expect(principal.toText()).toBe('2vxsx-fae');
		});
	});
});

describe('Account ID Helpers', () => {
	describe('principalToAccountIdentifier', () => {
		it('should derive account identifier from principal', () => {
			const principal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
			const accountId = principalToAccountIdentifier(principal);
			expect(accountId).toBeDefined();
			// Account ID is 36 bytes (4-byte CRC + 32-byte hash) = 72 hex chars
			expect(accountId.length).toBe(72);
		});

		it('should derive different account for different subaccount', () => {
			const principal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
			const subaccount = new Uint8Array(32).fill(1);
			const accountId1 = principalToAccountIdentifier(principal);
			const accountId2 = principalToAccountIdentifier(principal, subaccount);
			expect(accountId1).not.toBe(accountId2);
		});
	});

	describe('isValidAccountIdentifier', () => {
		it('should return true for valid account identifier', () => {
			// Generate a valid account identifier first
			const principal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
			const accountId = principalToAccountIdentifier(principal);
			expect(isValidAccountIdentifier(accountId)).toBe(true);
		});

		it('should return false for invalid length', () => {
			expect(isValidAccountIdentifier('abc123')).toBe(false);
		});

		it('should return false for non-hex string', () => {
			expect(isValidAccountIdentifier('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')).toBe(false);
		});
	});

	describe('hexToBytes', () => {
		it('should convert hex string to bytes', () => {
			const hexId = '0'.repeat(64);
			const bytes = hexToBytes(hexId);
			expect(bytes.length).toBe(32);
			expect(bytes.every(b => b === 0)).toBe(true);
		});
	});

	describe('bytesToHex', () => {
		it('should convert bytes to hex string', () => {
			const bytes = new Uint8Array(32).fill(255);
			const hexId = bytesToHex(bytes);
			expect(hexId).toBe('f'.repeat(64));
		});
	});

	describe('indexToSubaccount', () => {
		it('should create subaccount from index 0', () => {
			const subaccount = indexToSubaccount(0);
			expect(subaccount.length).toBe(32);
			expect(subaccount[31]).toBe(0);
		});

		it('should create subaccount from index 1', () => {
			const subaccount = indexToSubaccount(1);
			expect(subaccount.length).toBe(32);
			expect(subaccount[31]).toBe(1);
		});

		it('should create subaccount from large index', () => {
			const subaccount = indexToSubaccount(256);
			expect(subaccount.length).toBe(32);
			expect(subaccount[30]).toBe(1);
			expect(subaccount[31]).toBe(0);
		});
	});

	describe('subaccountFromIndex (alias)', () => {
		it('should work as alias for indexToSubaccount', () => {
			const subaccount1 = indexToSubaccount(42);
			const subaccount2 = subaccountFromIndex(42);
			expect(bytesToHex(subaccount1)).toBe(bytesToHex(subaccount2));
		});
	});
});

describe('Constants', () => {
	it('should have valid system canister IDs', async () => {
		const { SYSTEM_CANISTERS } = await import('../../nodes/Icp/constants/canisters');

		expect(SYSTEM_CANISTERS.management).toBe('aaaaa-aa');
		expect(SYSTEM_CANISTERS.ledger).toBe('ryjl3-tyaaa-aaaaa-aaaba-cai');
		expect(SYSTEM_CANISTERS.governance).toBe('rrkah-fqaaa-aaaaa-aaaaq-cai');
		expect(SYSTEM_CANISTERS.cyclesMinting).toBe('rkp4c-7iaaa-aaaaa-aaaca-cai');
	});

	it('should have valid network configurations', async () => {
		const { NETWORKS } = await import('../../nodes/Icp/constants/networks');

		expect(NETWORKS.MAINNET.url).toBe('https://ic0.app');
		expect(NETWORKS.LOCAL.url).toBe('http://localhost:4943');
	});

	it('should have valid error codes', async () => {
		const { ICP_ERROR_CODES } = await import('../../nodes/Icp/constants/errors');

		expect(ICP_ERROR_CODES.AGENT_ERROR).toBe('AGENT_ERROR');
		expect(ICP_ERROR_CODES.CANISTER_ERROR).toBe('CANISTER_ERROR');
		expect(ICP_ERROR_CODES.INSUFFICIENT_FUNDS).toBe('INSUFFICIENT_FUNDS');
	});
});
