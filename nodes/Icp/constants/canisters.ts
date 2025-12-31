/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

// System Canister IDs
export const MANAGEMENT_CANISTER_ID = 'aaaaa-aa';
export const LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
export const GOVERNANCE_CANISTER_ID = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
export const CYCLES_MINTING_CANISTER_ID = 'rkp4c-7iaaa-aaaaa-aaaca-cai';
export const ROOT_CANISTER_ID = 'r7inp-6aaaa-aaaaa-aaabq-cai';
export const REGISTRY_CANISTER_ID = 'rwlgt-iiaaa-aaaaa-aaaaa-cai';
export const LIFELINE_CANISTER_ID = 'rno2w-sqaaa-aaaaa-aaacq-cai';
export const GENESIS_TOKEN_CANISTER_ID = 'renrk-eyaaa-aaaaa-aaada-cai';
export const IDENTITY_CANISTER_ID = 'rdmx6-jaaaa-aaaaa-aaadq-cai';
export const NNS_UI_CANISTER_ID = 'qoctq-giaaa-aaaaa-aaaea-cai';
export const SNS_WASM_CANISTER_ID = 'qaa6y-5yaaa-aaaaa-aaafa-cai';

// Known SNS Root Canisters
export const KNOWN_SNS_ROOTS: Record<string, string> = {
	OpenChat: 'zfcdd-tqaaa-aaaaq-aaaga-cai',
	Modclub: 'gwuzc-waaaa-aaaaq-aacaa-cai',
	HotOrNot: 'yh5tv-naaaa-aaaaq-aacaq-cai',
	Kinic: 'qwhys-7yaaa-aaaaq-aacba-cai',
	Dragginz: '4m6xa-6iaaa-aaaaq-aacbq-cai',
	ICGhost: 'twvyh-3qaaa-aaaaq-aacca-cai',
	Catalyze: 'uly3p-iqaaa-aaaaq-aaccq-cai',
	Nuance: 'rzbmc-yiaaa-aaaaq-aabha-cai',
	Trax: '4j4g2-5yaaa-aaaaq-aacda-cai',
};

// NNS Canister IDs Map
export const NNS_CANISTERS = {
	governance: GOVERNANCE_CANISTER_ID,
	ledger: LEDGER_CANISTER_ID,
	root: ROOT_CANISTER_ID,
	cyclesMinting: CYCLES_MINTING_CANISTER_ID,
	registry: REGISTRY_CANISTER_ID,
	lifeline: LIFELINE_CANISTER_ID,
	genesisToken: GENESIS_TOKEN_CANISTER_ID,
	identity: IDENTITY_CANISTER_ID,
	nnsUi: NNS_UI_CANISTER_ID,
	snsWasm: SNS_WASM_CANISTER_ID,
} as const;

// ICRC Standard Methods
export const ICRC1_METHODS = [
	'icrc1_name',
	'icrc1_symbol',
	'icrc1_decimals',
	'icrc1_fee',
	'icrc1_metadata',
	'icrc1_total_supply',
	'icrc1_minting_account',
	'icrc1_balance_of',
	'icrc1_transfer',
	'icrc1_supported_standards',
] as const;

export const ICRC2_METHODS = [
	'icrc2_approve',
	'icrc2_transfer_from',
	'icrc2_allowance',
] as const;

export const ICRC3_METHODS = [
	'icrc3_get_transactions',
	'icrc3_get_archives',
	'icrc3_get_tip_certificate',
	'icrc3_supported_block_types',
] as const;

// Management Canister Methods
export const MANAGEMENT_CANISTER_METHODS = [
	'create_canister',
	'update_settings',
	'install_code',
	'uninstall_code',
	'canister_status',
	'stop_canister',
	'start_canister',
	'delete_canister',
	'deposit_cycles',
	'raw_rand',
	'ecdsa_public_key',
	'sign_with_ecdsa',
	'http_request',
	'bitcoin_get_balance',
	'bitcoin_get_utxos',
	'bitcoin_send_transaction',
	'bitcoin_get_current_fee_percentiles',
] as const;

// System Canisters (alias for NNS_CANISTERS for convenience)
export const SYSTEM_CANISTERS = {
	management: MANAGEMENT_CANISTER_ID,
	ledger: LEDGER_CANISTER_ID,
	governance: GOVERNANCE_CANISTER_ID,
	cyclesMinting: CYCLES_MINTING_CANISTER_ID,
	root: ROOT_CANISTER_ID,
	registry: REGISTRY_CANISTER_ID,
	lifeline: LIFELINE_CANISTER_ID,
	genesisToken: GENESIS_TOKEN_CANISTER_ID,
	identity: IDENTITY_CANISTER_ID,
	nnsUi: NNS_UI_CANISTER_ID,
	snsWasm: SNS_WASM_CANISTER_ID,
} as const;

export type NnsCanisterName = keyof typeof NNS_CANISTERS;
export type Icrc1Method = typeof ICRC1_METHODS[number];
export type Icrc2Method = typeof ICRC2_METHODS[number];
export type Icrc3Method = typeof ICRC3_METHODS[number];
export type ManagementCanisterMethod = typeof MANAGEMENT_CANISTER_METHODS[number];
