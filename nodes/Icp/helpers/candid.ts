/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { IcpError, ICP_ERROR_CODES } from '../constants/errors';

export type CandidValue =
	| null
	| boolean
	| number
	| bigint
	| string
	| Uint8Array
	| Principal
	| CandidValue[]
	| { [key: string]: CandidValue };

/**
 * Encodes arguments using Candid IDL
 */
export function encodeCandidArgs(
	types: IDL.Type[],
	args: CandidValue[],
): ArrayBuffer {
	try {
		return IDL.encode(types, args);
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.INVALID_CANDID,
			'Failed to encode Candid arguments',
			error,
		);
	}
}

/**
 * Decodes Candid-encoded data
 */
export function decodeCandidResponse(
	types: IDL.Type[],
	data: ArrayBuffer,
): CandidValue[] {
	try {
		return IDL.decode(types, data) as CandidValue[];
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.INVALID_CANDID,
			'Failed to decode Candid response',
			error,
		);
	}
}

/**
 * Common Candid type factories
 */
export const CandidTypes = {
	Nat: IDL.Nat,
	Nat8: IDL.Nat8,
	Nat16: IDL.Nat16,
	Nat32: IDL.Nat32,
	Nat64: IDL.Nat64,
	Int: IDL.Int,
	Int8: IDL.Int8,
	Int16: IDL.Int16,
	Int32: IDL.Int32,
	Int64: IDL.Int64,
	Float32: IDL.Float32,
	Float64: IDL.Float64,
	Bool: IDL.Bool,
	Text: IDL.Text,
	Null: IDL.Null,
	Reserved: IDL.Reserved,
	Empty: IDL.Empty,
	Principal: IDL.Principal,
	Vec: IDL.Vec,
	Opt: IDL.Opt,
	Record: IDL.Record,
	Variant: IDL.Variant,
	Tuple: IDL.Tuple,
	Func: IDL.Func,
	Service: IDL.Service,
};

/**
 * Creates an ICRC-1 Account type
 */
export function createIcrc1AccountType(): IDL.RecordClass {
	return IDL.Record({
		owner: IDL.Principal,
		subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
	});
}

/**
 * Creates an ICRC-1 Transfer Args type
 */
export function createIcrc1TransferArgsType(): IDL.RecordClass {
	const Account = createIcrc1AccountType();
	return IDL.Record({
		from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
		to: Account,
		amount: IDL.Nat,
		fee: IDL.Opt(IDL.Nat),
		memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
		created_at_time: IDL.Opt(IDL.Nat64),
	});
}

/**
 * Creates an ICRC-1 Transfer Result type
 */
export function createIcrc1TransferResultType(): IDL.VariantClass {
	return IDL.Variant({
		Ok: IDL.Nat,
		Err: IDL.Variant({
			BadFee: IDL.Record({ expected_fee: IDL.Nat }),
			BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
			InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
			TooOld: IDL.Null,
			CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
			Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
			TemporarilyUnavailable: IDL.Null,
			GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
		}),
	});
}

/**
 * Creates an ICRC-2 Approve Args type
 */
export function createIcrc2ApproveArgsType(): IDL.RecordClass {
	const Account = createIcrc1AccountType();
	return IDL.Record({
		from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
		spender: Account,
		amount: IDL.Nat,
		expected_allowance: IDL.Opt(IDL.Nat),
		expires_at: IDL.Opt(IDL.Nat64),
		fee: IDL.Opt(IDL.Nat),
		memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
		created_at_time: IDL.Opt(IDL.Nat64),
	});
}

/**
 * Creates an ICRC-2 Allowance type
 */
export function createIcrc2AllowanceType(): IDL.RecordClass {
	return IDL.Record({
		allowance: IDL.Nat,
		expires_at: IDL.Opt(IDL.Nat64),
	});
}

/**
 * Converts JavaScript values to Candid-compatible types
 */
export function jsToCandid(value: unknown): CandidValue {
	if (value === null || value === undefined) {
		return null;
	}

	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'number') {
		return value;
	}

	if (typeof value === 'bigint') {
		return value;
	}

	if (typeof value === 'string') {
		// Check if it's a principal
		try {
			return Principal.fromText(value);
		} catch {
			return value;
		}
	}

	if (Array.isArray(value)) {
		return value.map(jsToCandid);
	}

	if (value instanceof Uint8Array) {
		return value;
	}

	if (typeof value === 'object') {
		const result: { [key: string]: CandidValue } = {};
		for (const [k, v] of Object.entries(value)) {
			result[k] = jsToCandid(v);
		}
		return result;
	}

	return String(value);
}

/**
 * Converts Candid values to JSON-serializable format
 */
export function candidToJson(value: CandidValue): unknown {
	if (value === null || value === undefined) {
		return null;
	}

	if (typeof value === 'bigint') {
		return value.toString();
	}

	if (value instanceof Principal) {
		return value.toText();
	}

	if (value instanceof Uint8Array) {
		return Array.from(value)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
	}

	if (Array.isArray(value)) {
		return value.map(candidToJson);
	}

	if (typeof value === 'object') {
		const result: { [key: string]: unknown } = {};
		for (const [k, v] of Object.entries(value)) {
			result[k] = candidToJson(v as CandidValue);
		}
		return result;
	}

	return value;
}

/**
 * Parses a JSON string into Candid arguments
 */
export function parseJsonToCandidArgs(jsonStr: string): CandidValue[] {
	try {
		const parsed = JSON.parse(jsonStr);
		if (Array.isArray(parsed)) {
			return parsed.map(jsToCandid);
		}
		return [jsToCandid(parsed)];
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.INVALID_CANDID,
			'Failed to parse JSON arguments',
			error,
		);
	}
}
