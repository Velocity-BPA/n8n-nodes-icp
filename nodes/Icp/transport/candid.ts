/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { IDL } from '@dfinity/candid';

/**
 * Common IDL factories for ICP interactions
 */

/**
 * ICP Ledger IDL Factory
 */
export const icpLedgerIdlFactory: IDL.InterfaceFactory = ({ IDL: idl }) => {
	const AccountIdentifier = idl.Vec(idl.Nat8);
	const Tokens = idl.Record({ e8s: idl.Nat64 });
	const Memo = idl.Nat64;
	const TimeStamp = idl.Record({ timestamp_nanos: idl.Nat64 });
	const SubAccount = idl.Vec(idl.Nat8);

	const TransferArgs = idl.Record({
		memo: Memo,
		amount: Tokens,
		fee: Tokens,
		from_subaccount: idl.Opt(SubAccount),
		to: AccountIdentifier,
		created_at_time: idl.Opt(TimeStamp),
	});

	const TransferError = idl.Variant({
		BadFee: idl.Record({ expected_fee: Tokens }),
		InsufficientFunds: idl.Record({ balance: Tokens }),
		TxTooOld: idl.Record({ allowed_window_nanos: idl.Nat64 }),
		TxCreatedInFuture: idl.Null,
		TxDuplicate: idl.Record({ duplicate_of: idl.Nat64 }),
	});

	const TransferResult = idl.Variant({
		Ok: idl.Nat64,
		Err: TransferError,
	});

	const AccountBalanceArgs = idl.Record({
		account: AccountIdentifier,
	});

	return idl.Service({
		account_balance: idl.Func([AccountBalanceArgs], [Tokens], ['query']),
		transfer: idl.Func([TransferArgs], [TransferResult], []),
		symbol: idl.Func([], [idl.Record({ symbol: idl.Text })], ['query']),
		name: idl.Func([], [idl.Record({ name: idl.Text })], ['query']),
		decimals: idl.Func([], [idl.Record({ decimals: idl.Nat32 })], ['query']),
	});
};

/**
 * ICRC-1 Token Standard IDL Factory
 */
export const icrc1IdlFactory: IDL.InterfaceFactory = ({ IDL: idl }) => {
	const Account = idl.Record({
		owner: idl.Principal,
		subaccount: idl.Opt(idl.Vec(idl.Nat8)),
	});

	const TransferArg = idl.Record({
		from_subaccount: idl.Opt(idl.Vec(idl.Nat8)),
		to: Account,
		amount: idl.Nat,
		fee: idl.Opt(idl.Nat),
		memo: idl.Opt(idl.Vec(idl.Nat8)),
		created_at_time: idl.Opt(idl.Nat64),
	});

	const TransferError = idl.Variant({
		BadFee: idl.Record({ expected_fee: idl.Nat }),
		BadBurn: idl.Record({ min_burn_amount: idl.Nat }),
		InsufficientFunds: idl.Record({ balance: idl.Nat }),
		TooOld: idl.Null,
		CreatedInFuture: idl.Record({ ledger_time: idl.Nat64 }),
		Duplicate: idl.Record({ duplicate_of: idl.Nat }),
		TemporarilyUnavailable: idl.Null,
		GenericError: idl.Record({ error_code: idl.Nat, message: idl.Text }),
	});

	const TransferResult = idl.Variant({
		Ok: idl.Nat,
		Err: TransferError,
	});

	const MetadataValue = idl.Variant({
		Nat: idl.Nat,
		Int: idl.Int,
		Text: idl.Text,
		Blob: idl.Vec(idl.Nat8),
	});

	const SupportedStandard = idl.Record({
		name: idl.Text,
		url: idl.Text,
	});

	return idl.Service({
		icrc1_name: idl.Func([], [idl.Text], ['query']),
		icrc1_symbol: idl.Func([], [idl.Text], ['query']),
		icrc1_decimals: idl.Func([], [idl.Nat8], ['query']),
		icrc1_fee: idl.Func([], [idl.Nat], ['query']),
		icrc1_metadata: idl.Func([], [idl.Vec(idl.Tuple(idl.Text, MetadataValue))], ['query']),
		icrc1_total_supply: idl.Func([], [idl.Nat], ['query']),
		icrc1_minting_account: idl.Func([], [idl.Opt(Account)], ['query']),
		icrc1_balance_of: idl.Func([Account], [idl.Nat], ['query']),
		icrc1_transfer: idl.Func([TransferArg], [TransferResult], []),
		icrc1_supported_standards: idl.Func([], [idl.Vec(SupportedStandard)], ['query']),
	});
};

/**
 * ICRC-2 Approve Standard IDL Factory
 */
export const icrc2IdlFactory: IDL.InterfaceFactory = ({ IDL: idl }) => {
	const Account = idl.Record({
		owner: idl.Principal,
		subaccount: idl.Opt(idl.Vec(idl.Nat8)),
	});

	const ApproveArgs = idl.Record({
		from_subaccount: idl.Opt(idl.Vec(idl.Nat8)),
		spender: Account,
		amount: idl.Nat,
		expected_allowance: idl.Opt(idl.Nat),
		expires_at: idl.Opt(idl.Nat64),
		fee: idl.Opt(idl.Nat),
		memo: idl.Opt(idl.Vec(idl.Nat8)),
		created_at_time: idl.Opt(idl.Nat64),
	});

	const ApproveError = idl.Variant({
		BadFee: idl.Record({ expected_fee: idl.Nat }),
		InsufficientFunds: idl.Record({ balance: idl.Nat }),
		AllowanceChanged: idl.Record({ current_allowance: idl.Nat }),
		Expired: idl.Record({ ledger_time: idl.Nat64 }),
		TooOld: idl.Null,
		CreatedInFuture: idl.Record({ ledger_time: idl.Nat64 }),
		Duplicate: idl.Record({ duplicate_of: idl.Nat }),
		TemporarilyUnavailable: idl.Null,
		GenericError: idl.Record({ error_code: idl.Nat, message: idl.Text }),
	});

	const ApproveResult = idl.Variant({
		Ok: idl.Nat,
		Err: ApproveError,
	});

	const TransferFromArgs = idl.Record({
		spender_subaccount: idl.Opt(idl.Vec(idl.Nat8)),
		from: Account,
		to: Account,
		amount: idl.Nat,
		fee: idl.Opt(idl.Nat),
		memo: idl.Opt(idl.Vec(idl.Nat8)),
		created_at_time: idl.Opt(idl.Nat64),
	});

	const TransferFromError = idl.Variant({
		BadFee: idl.Record({ expected_fee: idl.Nat }),
		BadBurn: idl.Record({ min_burn_amount: idl.Nat }),
		InsufficientFunds: idl.Record({ balance: idl.Nat }),
		InsufficientAllowance: idl.Record({ allowance: idl.Nat }),
		TooOld: idl.Null,
		CreatedInFuture: idl.Record({ ledger_time: idl.Nat64 }),
		Duplicate: idl.Record({ duplicate_of: idl.Nat }),
		TemporarilyUnavailable: idl.Null,
		GenericError: idl.Record({ error_code: idl.Nat, message: idl.Text }),
	});

	const TransferFromResult = idl.Variant({
		Ok: idl.Nat,
		Err: TransferFromError,
	});

	const AllowanceArgs = idl.Record({
		account: Account,
		spender: Account,
	});

	const Allowance = idl.Record({
		allowance: idl.Nat,
		expires_at: idl.Opt(idl.Nat64),
	});

	return idl.Service({
		icrc2_approve: idl.Func([ApproveArgs], [ApproveResult], []),
		icrc2_transfer_from: idl.Func([TransferFromArgs], [TransferFromResult], []),
		icrc2_allowance: idl.Func([AllowanceArgs], [Allowance], ['query']),
	});
};

/**
 * NNS Governance IDL Factory (simplified)
 */
export const nnsGovernanceIdlFactory: IDL.InterfaceFactory = ({ IDL: idl }) => {
	const NeuronId = idl.Record({ id: idl.Nat64 });

	// ProposalStatus defined for reference/future use
	const _ProposalStatus = idl.Variant({
		Unknown: idl.Null,
		Open: idl.Null,
		Rejected: idl.Null,
		Adopted: idl.Null,
		Executed: idl.Null,
		Failed: idl.Null,
	});

	const ProposalInfo = idl.Record({
		id: idl.Opt(idl.Record({ id: idl.Nat64 })),
		status: idl.Int32,
		topic: idl.Int32,
		proposer: idl.Opt(NeuronId),
		executed_timestamp_seconds: idl.Nat64,
		decided_timestamp_seconds: idl.Nat64,
		proposal_timestamp_seconds: idl.Nat64,
		deadline_timestamp_seconds: idl.Opt(idl.Nat64),
	});

	const ListProposalInfo = idl.Record({
		include_reward_status: idl.Vec(idl.Int32),
		omit_large_fields: idl.Opt(idl.Bool),
		before_proposal: idl.Opt(idl.Record({ id: idl.Nat64 })),
		limit: idl.Nat32,
		exclude_topic: idl.Vec(idl.Int32),
		include_all_manage_neuron_proposals: idl.Opt(idl.Bool),
		include_status: idl.Vec(idl.Int32),
	});

	const ListProposalInfoResponse = idl.Record({
		proposal_info: idl.Vec(ProposalInfo),
	});

	const KnownNeuron = idl.Record({
		id: idl.Opt(NeuronId),
		known_neuron_data: idl.Opt(idl.Record({
			name: idl.Text,
			description: idl.Opt(idl.Text),
		})),
	});

	const ListKnownNeuronsResponse = idl.Record({
		known_neurons: idl.Vec(KnownNeuron),
	});

	const NetworkEconomics = idl.Record({
		neuron_minimum_stake_e8s: idl.Nat64,
		max_neurons_fund_participation_icp_e8s: idl.Opt(idl.Nat64),
		neuron_management_fee_per_proposal_e8s: idl.Nat64,
		reject_cost_e8s: idl.Nat64,
		transaction_fee_e8s: idl.Nat64,
		neuron_spawn_dissolve_delay_seconds: idl.Nat64,
		minimum_icp_xdr_rate: idl.Nat64,
		maximum_node_provider_rewards_e8s: idl.Nat64,
	});

	return idl.Service({
		list_proposals: idl.Func([ListProposalInfo], [ListProposalInfoResponse], ['query']),
		get_proposal_info: idl.Func([idl.Nat64], [idl.Opt(ProposalInfo)], ['query']),
		list_known_neurons: idl.Func([], [ListKnownNeuronsResponse], ['query']),
		get_network_economics_parameters: idl.Func([], [NetworkEconomics], ['query']),
	});
};

/**
 * Management Canister IDL Factory
 */
export const managementCanisterIdlFactory: IDL.InterfaceFactory = ({ IDL: idl }) => {
	const CanisterId = idl.Principal;
	const WasmModule = idl.Vec(idl.Nat8);

	const CanisterSettings = idl.Record({
		controllers: idl.Opt(idl.Vec(idl.Principal)),
		compute_allocation: idl.Opt(idl.Nat),
		memory_allocation: idl.Opt(idl.Nat),
		freezing_threshold: idl.Opt(idl.Nat),
	});

	const CreateCanisterArgs = idl.Record({
		settings: idl.Opt(CanisterSettings),
	});

	const CreateCanisterResult = idl.Record({
		canister_id: CanisterId,
	});

	const InstallCodeArgs = idl.Record({
		mode: idl.Variant({
			install: idl.Null,
			reinstall: idl.Null,
			upgrade: idl.Null,
		}),
		canister_id: CanisterId,
		wasm_module: WasmModule,
		arg: idl.Vec(idl.Nat8),
	});

	const CanisterStatusArgs = idl.Record({
		canister_id: CanisterId,
	});

	const CanisterStatusResult = idl.Record({
		status: idl.Variant({
			running: idl.Null,
			stopping: idl.Null,
			stopped: idl.Null,
		}),
		settings: CanisterSettings,
		module_hash: idl.Opt(idl.Vec(idl.Nat8)),
		memory_size: idl.Nat,
		cycles: idl.Nat,
		idle_cycles_burned_per_day: idl.Nat,
	});

	const HttpHeader = idl.Record({
		name: idl.Text,
		value: idl.Text,
	});

	const HttpRequestArgs = idl.Record({
		url: idl.Text,
		max_response_bytes: idl.Opt(idl.Nat64),
		method: idl.Variant({
			get: idl.Null,
			head: idl.Null,
			post: idl.Null,
		}),
		headers: idl.Vec(HttpHeader),
		body: idl.Opt(idl.Vec(idl.Nat8)),
		transform: idl.Opt(idl.Record({
			function: idl.Func([idl.Record({
				response: idl.Record({
					status: idl.Nat,
					headers: idl.Vec(HttpHeader),
					body: idl.Vec(idl.Nat8),
				}),
				context: idl.Vec(idl.Nat8),
			})], [idl.Record({
				status: idl.Nat,
				headers: idl.Vec(HttpHeader),
				body: idl.Vec(idl.Nat8),
			})], ['query']),
			context: idl.Vec(idl.Nat8),
		})),
	});

	const HttpRequestResult = idl.Record({
		status: idl.Nat,
		headers: idl.Vec(HttpHeader),
		body: idl.Vec(idl.Nat8),
	});

	return idl.Service({
		create_canister: idl.Func([CreateCanisterArgs], [CreateCanisterResult], []),
		install_code: idl.Func([InstallCodeArgs], [], []),
		uninstall_code: idl.Func([idl.Record({ canister_id: CanisterId })], [], []),
		start_canister: idl.Func([idl.Record({ canister_id: CanisterId })], [], []),
		stop_canister: idl.Func([idl.Record({ canister_id: CanisterId })], [], []),
		delete_canister: idl.Func([idl.Record({ canister_id: CanisterId })], [], []),
		canister_status: idl.Func([CanisterStatusArgs], [CanisterStatusResult], []),
		deposit_cycles: idl.Func([idl.Record({ canister_id: CanisterId })], [], []),
		http_request: idl.Func([HttpRequestArgs], [HttpRequestResult], []),
	});
};

/**
 * Creates a generic IDL factory from method signatures
 */
export function createGenericIdlFactory(
	methodName: string,
	argTypes: IDL.Type[],
	returnTypes: IDL.Type[],
	mode: 'query' | 'update' = 'query',
): IDL.InterfaceFactory {
	return ({ IDL: idl }) => {
		const annotations: string[] = mode === 'query' ? ['query'] : [];
		return idl.Service({
			[methodName]: idl.Func(argTypes, returnTypes, annotations),
		});
	};
}

/**
 * Alias factory creators for backward compatibility
 */
export const createGovernanceIdlFactory = (): IDL.InterfaceFactory => nnsGovernanceIdlFactory;
export const createManagementIdlFactory = (): IDL.InterfaceFactory => managementCanisterIdlFactory;
export const createIcrc1IdlFactory = (): IDL.InterfaceFactory => icrc1IdlFactory;
export const createIcrc2IdlFactory = (): IDL.InterfaceFactory => icrc2IdlFactory;
export const createLedgerIdlFactory = (): IDL.InterfaceFactory => icpLedgerIdlFactory;
