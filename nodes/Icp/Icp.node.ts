/**
 * Internet Computer Protocol (ICP) Node for n8n
 *
 * Copyright © 2025 Velocity BPA. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE file in the project root for full license information.
 *
 * [Velocity BPA Licensing Notice]
 *
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 *
 * Use of this node by for-profit organizations in production environments
 * requires a commercial license from Velocity BPA.
 *
 * For licensing information, visit https://velobpa.com/licensing or
 * contact licensing@velobpa.com.
 */

import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

// Ledger operations
import * as ledgerBalance from './actions/ledger/balance.operation';
import * as ledgerTransfer from './actions/ledger/transfer.operation';
import * as ledgerBlock from './actions/ledger/block.operation';
import * as ledgerTransaction from './actions/ledger/transaction.operation';
import * as ledgerNetwork from './actions/ledger/network.operation';

// Canister operations
import * as canisterQuery from './actions/canister/query.operation';
import * as canisterUpdate from './actions/canister/update.operation';
import * as canisterStatus from './actions/canister/status.operation';
import * as canisterInstall from './actions/canister/install.operation';

// Governance operations
import * as governanceProposals from './actions/governance/proposals.operation';
import * as governanceNeurons from './actions/governance/neurons.operation';
import * as governanceEconomics from './actions/governance/networkEconomics.operation';

// SNS operations
import * as snsOps from './actions/sns/sns.operation';

// ICRC operations
import * as icrcOps from './actions/icrc/icrc.operation';

// Identity operations
import * as identityOps from './actions/identity/identity.operation';

// Cycles operations
import * as cyclesOps from './actions/cycles/cycles.operation';

// Management operations
import * as managementOps from './actions/management/management.operation';

// Emit licensing notice on load
const LICENSING_NOTICE_LOGGED = Symbol.for('icp.licensing.notice');
if (!(global as Record<symbol, boolean>)[LICENSING_NOTICE_LOGGED]) {
	console.warn(`
[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
`);
	(global as Record<symbol, boolean>)[LICENSING_NOTICE_LOGGED] = true;
}

export class Icp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Internet Computer',
		name: 'icp',
		icon: 'file:icp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Internet Computer Protocol (ICP) blockchain',
		defaults: {
			name: 'Internet Computer',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'icpAgentApi',
				required: true,
				displayOptions: {
					show: {
						resource: ['canister', 'governance', 'sns', 'icrc', 'identity', 'cycles', 'management'],
					},
				},
			},
			{
				name: 'icpRosettaApi',
				required: true,
				displayOptions: {
					show: {
						resource: ['ledger'],
					},
				},
			},
		],
		properties: [
			// Resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Ledger', value: 'ledger' },
					{ name: 'Canister', value: 'canister' },
					{ name: 'Governance', value: 'governance' },
					{ name: 'SNS', value: 'sns' },
					{ name: 'ICRC Token', value: 'icrc' },
					{ name: 'Identity', value: 'identity' },
					{ name: 'Cycles', value: 'cycles' },
					{ name: 'Management', value: 'management' },
				],
				default: 'ledger',
			},

			// ==================== LEDGER OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['ledger'] } },
				options: [
					{ name: 'Get Balance', value: 'getBalance', action: 'Get ICP balance' },
					{ name: 'Transfer ICP', value: 'transfer', action: 'Transfer ICP tokens' },
					{ name: 'Get Block', value: 'getBlock', action: 'Get block by index' },
					{ name: 'Get Block Transaction', value: 'getBlockTransaction', action: 'Get transaction in block' },
					{ name: 'Search Transactions', value: 'searchTransactions', action: 'Search transactions' },
					{ name: 'Get Account Transactions', value: 'getAccountTransactions', action: 'Get account transactions' },
					{ name: 'Get Network Status', value: 'getNetworkStatus', action: 'Get network status' },
					{ name: 'Get Network Options', value: 'getNetworkOptions', action: 'Get network options' },
					{ name: 'Derive Account', value: 'deriveAccount', action: 'Derive account identifier' },
				],
				default: 'getBalance',
			},

			// Ledger - Get Balance
			{
				displayName: 'Account Identifier',
				name: 'accountIdentifier',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['ledger'], operation: ['getBalance'] } },
				default: '',
				placeholder: 'abc123...',
				description: '64-character hex account identifier',
			},
			{
				displayName: 'Block Index',
				name: 'blockIndex',
				type: 'number',
				displayOptions: { show: { resource: ['ledger'], operation: ['getBalance'] } },
				default: 0,
				description: 'Optional block index for historical balance (0 for latest)',
			},

			// Ledger - Transfer
			{
				displayName: 'From Account',
				name: 'fromAccount',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['ledger'], operation: ['transfer'] } },
				default: '',
				description: 'Source account identifier (64-char hex)',
			},
			{
				displayName: 'To Account',
				name: 'toAccount',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['ledger'], operation: ['transfer'] } },
				default: '',
				description: 'Destination account identifier (64-char hex)',
			},
			{
				displayName: 'Amount (ICP)',
				name: 'amount',
				type: 'number',
				required: true,
				displayOptions: { show: { resource: ['ledger'], operation: ['transfer'] } },
				default: 0,
				typeOptions: { numberPrecision: 8 },
				description: 'Amount of ICP to transfer',
			},
			{
				displayName: 'Fee (ICP)',
				name: 'fee',
				type: 'number',
				displayOptions: { show: { resource: ['ledger'], operation: ['transfer'] } },
				default: 0.0001,
				typeOptions: { numberPrecision: 8 },
				description: 'Transaction fee in ICP (default: 0.0001)',
			},
			{
				displayName: 'Public Key (Hex)',
				name: 'publicKeyHex',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['ledger'], operation: ['transfer'] } },
				default: '',
				description: 'Public key in hex format for signing',
			},
			{
				displayName: 'Signature (Hex)',
				name: 'signatureHex',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['ledger'], operation: ['transfer'] } },
				default: '',
				description: 'Pre-computed signature in hex format',
			},

			// Ledger - Get Block
			{
				displayName: 'Block Index',
				name: 'blockIndex',
				type: 'number',
				required: true,
				displayOptions: { show: { resource: ['ledger'], operation: ['getBlock'] } },
				default: 0,
				description: 'Block index to retrieve',
			},

			// Ledger - Get Block Transaction
			{
				displayName: 'Block Index',
				name: 'blockIndex',
				type: 'number',
				required: true,
				displayOptions: { show: { resource: ['ledger'], operation: ['getBlockTransaction'] } },
				default: 0,
				description: 'Block index containing the transaction',
			},
			{
				displayName: 'Transaction Hash',
				name: 'transactionHash',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['ledger'], operation: ['getBlockTransaction'] } },
				default: '',
				description: 'Transaction hash to retrieve',
			},

			// Ledger - Search Transactions
			{
				displayName: 'Account Identifier',
				name: 'accountIdentifier',
				type: 'string',
				displayOptions: { show: { resource: ['ledger'], operation: ['searchTransactions', 'getAccountTransactions'] } },
				default: '',
				description: 'Filter by account identifier',
			},
			{
				displayName: 'Transaction Type',
				name: 'transactionType',
				type: 'options',
				displayOptions: { show: { resource: ['ledger'], operation: ['searchTransactions'] } },
				options: [
					{ name: 'All', value: '' },
					{ name: 'Transfer', value: 'TRANSFER' },
					{ name: 'Mint', value: 'MINT' },
					{ name: 'Burn', value: 'BURN' },
				],
				default: '',
				description: 'Filter by transaction type',
			},
			{
				displayName: 'Max Block',
				name: 'maxBlock',
				type: 'number',
				displayOptions: { show: { resource: ['ledger'], operation: ['searchTransactions'] } },
				default: 0,
				description: 'Maximum block index (0 for latest)',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: { show: { resource: ['ledger'], operation: ['searchTransactions', 'getAccountTransactions'] } },
				default: 10,
				description: 'Maximum number of results',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				displayOptions: { show: { resource: ['ledger'], operation: ['searchTransactions', 'getAccountTransactions'] } },
				default: 0,
				description: 'Number of results to skip',
			},

			// Ledger - Derive Account
			{
				displayName: 'Public Key (Hex)',
				name: 'publicKeyHex',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['ledger'], operation: ['deriveAccount'] } },
				default: '',
				description: 'Public key in hex format',
			},
			{
				displayName: 'Curve Type',
				name: 'curveType',
				type: 'options',
				displayOptions: { show: { resource: ['ledger'], operation: ['deriveAccount'] } },
				options: [
					{ name: 'Ed25519', value: 'edwards25519' },
					{ name: 'Secp256k1', value: 'secp256k1' },
				],
				default: 'edwards25519',
				description: 'Cryptographic curve type',
			},

			// ==================== CANISTER OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['canister'] } },
				options: [
					{ name: 'Query', value: 'query', action: 'Query canister (read-only)' },
					{ name: 'Update', value: 'update', action: 'Update canister (state-changing)' },
					{ name: 'Get Status', value: 'getStatus', action: 'Get canister status' },
					{ name: 'Get Info', value: 'getInfo', action: 'Get canister info' },
					{ name: 'Get Module Hash', value: 'getModuleHash', action: 'Get canister module hash' },
					{ name: 'Get Controllers', value: 'getControllers', action: 'Get canister controllers' },
					{ name: 'Get Cycles Balance', value: 'getCyclesBalance', action: 'Get canister cycles balance' },
					{ name: 'Install Code', value: 'installCode', action: 'Install canister code' },
					{ name: 'Upgrade Code', value: 'upgradeCode', action: 'Upgrade canister code' },
					{ name: 'Uninstall Code', value: 'uninstallCode', action: 'Uninstall canister code' },
					{ name: 'Start Canister', value: 'startCanister', action: 'Start canister' },
					{ name: 'Stop Canister', value: 'stopCanister', action: 'Stop canister' },
					{ name: 'Delete Canister', value: 'deleteCanister', action: 'Delete canister' },
				],
				default: 'query',
			},

			// Canister - Common Fields
			{
				displayName: 'Canister ID',
				name: 'canisterId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['canister'] } },
				default: '',
				placeholder: 'rrkah-fqaaa-aaaaa-aaaaq-cai',
				description: 'The canister principal ID',
			},

			// Canister - Query/Update Fields
			{
				displayName: 'Method Name',
				name: 'methodName',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['canister'], operation: ['query', 'update'] } },
				default: '',
				placeholder: 'greet',
				description: 'The canister method to call',
			},
			{
				displayName: 'Argument Type',
				name: 'argumentType',
				type: 'options',
				displayOptions: { show: { resource: ['canister'], operation: ['query', 'update'] } },
				options: [
					{ name: 'Auto Detect', value: 'auto' },
					{ name: 'Raw Candid (Hex)', value: 'raw' },
					{ name: 'JSON', value: 'json' },
				],
				default: 'auto',
				description: 'How to encode the arguments',
			},
			{
				displayName: 'Arguments (JSON)',
				name: 'arguments',
				type: 'json',
				displayOptions: { show: { resource: ['canister'], operation: ['query', 'update'], argumentType: ['auto', 'json'] } },
				default: '[]',
				description: 'Method arguments as JSON array',
			},
			{
				displayName: 'Arguments (Hex)',
				name: 'argumentsHex',
				type: 'string',
				displayOptions: { show: { resource: ['canister'], operation: ['query', 'update'], argumentType: ['raw'] } },
				default: '',
				description: 'Raw Candid-encoded arguments in hex',
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'timeout',
				type: 'number',
				displayOptions: { show: { resource: ['canister'], operation: ['update'] } },
				default: 120,
				description: 'Timeout for update call in seconds',
			},

			// Canister - Install/Upgrade Fields
			{
				displayName: 'WASM Module (Hex)',
				name: 'wasmModule',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['canister'], operation: ['installCode', 'upgradeCode'] } },
				default: '',
				description: 'WASM module as hex string',
			},
			{
				displayName: 'Init Arguments (JSON)',
				name: 'initArguments',
				type: 'json',
				displayOptions: { show: { resource: ['canister'], operation: ['installCode', 'upgradeCode'] } },
				default: '[]',
				description: 'Initialization arguments as JSON array',
			},

			// ==================== GOVERNANCE OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['governance'] } },
				options: [
					{ name: 'List Proposals', value: 'listProposals', action: 'List NNS proposals' },
					{ name: 'Get Proposal', value: 'getProposal', action: 'Get proposal details' },
					{ name: 'Get Pending Proposals', value: 'getPendingProposals', action: 'Get pending proposals' },
					{ name: 'List Neurons', value: 'listNeurons', action: 'List neurons' },
					{ name: 'Get Neuron', value: 'getNeuron', action: 'Get neuron details' },
					{ name: 'Get Known Neurons', value: 'getKnownNeurons', action: 'Get known neurons' },
					{ name: 'Get Network Economics', value: 'getNetworkEconomics', action: 'Get network economics' },
				],
				default: 'listProposals',
			},

			// Governance - List Proposals
			{
				displayName: 'Include Reward Status',
				name: 'includeRewardStatus',
				type: 'multiOptions',
				displayOptions: { show: { resource: ['governance'], operation: ['listProposals'] } },
				options: [
					{ name: 'Accept Votes', value: 1 },
					{ name: 'Ready To Settle', value: 2 },
					{ name: 'Settled', value: 3 },
					{ name: 'Ineligible', value: 4 },
				],
				default: [],
				description: 'Filter by reward status',
			},
			{
				displayName: 'Exclude Topic',
				name: 'excludeTopic',
				type: 'multiOptions',
				displayOptions: { show: { resource: ['governance'], operation: ['listProposals'] } },
				options: [
					{ name: 'Unspecified', value: 0 },
					{ name: 'Neuron Management', value: 1 },
					{ name: 'Exchange Rate', value: 2 },
					{ name: 'Network Economics', value: 3 },
					{ name: 'Governance', value: 4 },
					{ name: 'Node Admin', value: 5 },
					{ name: 'Participant Management', value: 6 },
					{ name: 'Subnet Management', value: 7 },
					{ name: 'Network Canister Management', value: 8 },
					{ name: 'KYC', value: 9 },
					{ name: 'Node Provider Rewards', value: 10 },
				],
				default: [],
				description: 'Topics to exclude',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: { show: { resource: ['governance'], operation: ['listProposals'] } },
				default: 50,
				description: 'Maximum proposals to return',
			},
			{
				displayName: 'Before Proposal ID',
				name: 'beforeProposalId',
				type: 'number',
				displayOptions: { show: { resource: ['governance'], operation: ['listProposals'] } },
				default: 0,
				description: 'Get proposals before this ID (for pagination)',
			},

			// Governance - Get Proposal
			{
				displayName: 'Proposal ID',
				name: 'proposalId',
				type: 'number',
				required: true,
				displayOptions: { show: { resource: ['governance'], operation: ['getProposal'] } },
				default: 0,
				description: 'The proposal ID to retrieve',
			},

			// Governance - Neurons
			{
				displayName: 'Neuron IDs',
				name: 'neuronIds',
				type: 'string',
				displayOptions: { show: { resource: ['governance'], operation: ['listNeurons'] } },
				default: '',
				description: 'Comma-separated neuron IDs to query',
			},
			{
				displayName: 'Neuron ID',
				name: 'neuronId',
				type: 'number',
				required: true,
				displayOptions: { show: { resource: ['governance'], operation: ['getNeuron'] } },
				default: 0,
				description: 'The neuron ID to retrieve',
			},

			// ==================== SNS OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['sns'] } },
				options: [
					{ name: 'List SNS Projects', value: 'listProjects', action: 'List SNS projects' },
					{ name: 'Get SNS Project', value: 'getProject', action: 'Get SNS project details' },
					{ name: 'Get SNS Proposals', value: 'getProposals', action: 'Get SNS proposals' },
					{ name: 'Get SNS Neurons', value: 'getNeurons', action: 'Get SNS neurons' },
					{ name: 'Get SNS Token Info', value: 'getTokenInfo', action: 'Get SNS token information' },
				],
				default: 'listProjects',
			},

			// SNS - Project Fields
			{
				displayName: 'Root Canister ID',
				name: 'snsRootCanisterId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['sns'], operation: ['getProject', 'getProposals', 'getNeurons', 'getTokenInfo'] } },
				default: '',
				placeholder: 'xxxxx-xxxxx-xxxxx-xxxxx-cai',
				description: 'SNS root canister ID',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: { show: { resource: ['sns'], operation: ['getProposals'] } },
				default: 50,
				description: 'Maximum proposals to return',
			},

			// ==================== ICRC OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['icrc'] } },
				options: [
					{ name: 'Get Metadata', value: 'getMetadata', action: 'Get token metadata (ICRC-1)' },
					{ name: 'Get Balance', value: 'getBalance', action: 'Get token balance (ICRC-1)' },
					{ name: 'Transfer', value: 'transfer', action: 'Transfer tokens (ICRC-1)' },
					{ name: 'Approve', value: 'approve', action: 'Approve spender (ICRC-2)' },
					{ name: 'Transfer From', value: 'transferFrom', action: 'Transfer from account (ICRC-2)' },
					{ name: 'Get Allowance', value: 'getAllowance', action: 'Get allowance (ICRC-2)' },
					{ name: 'Get Transactions', value: 'getTransactions', action: 'Get transactions (ICRC-3)' },
				],
				default: 'getMetadata',
			},

			// ICRC - Token Canister
			{
				displayName: 'Token Canister ID',
				name: 'tokenCanisterId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['icrc'] } },
				default: '',
				placeholder: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
				description: 'The ICRC token canister ID',
			},

			// ICRC - Account Fields
			{
				displayName: 'Owner Principal',
				name: 'ownerPrincipal',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['icrc'], operation: ['getBalance', 'getAllowance'] } },
				default: '',
				description: 'Account owner principal ID',
			},
			{
				displayName: 'Subaccount (Hex)',
				name: 'subaccount',
				type: 'string',
				displayOptions: { show: { resource: ['icrc'], operation: ['getBalance', 'transfer', 'approve', 'transferFrom', 'getAllowance'] } },
				default: '',
				description: 'Optional 32-byte subaccount as hex',
			},

			// ICRC - Transfer Fields
			{
				displayName: 'To Principal',
				name: 'toPrincipal',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['icrc'], operation: ['transfer'] } },
				default: '',
				description: 'Recipient principal ID',
			},
			{
				displayName: 'To Subaccount (Hex)',
				name: 'toSubaccount',
				type: 'string',
				displayOptions: { show: { resource: ['icrc'], operation: ['transfer'] } },
				default: '',
				description: 'Optional recipient subaccount',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['icrc'], operation: ['transfer', 'approve', 'transferFrom'] } },
				default: '0',
				description: 'Token amount (smallest unit)',
			},
			{
				displayName: 'Memo (Hex)',
				name: 'memo',
				type: 'string',
				displayOptions: { show: { resource: ['icrc'], operation: ['transfer', 'approve', 'transferFrom'] } },
				default: '',
				description: 'Optional memo as hex',
			},

			// ICRC - Approve Fields
			{
				displayName: 'Spender Principal',
				name: 'spenderPrincipal',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['icrc'], operation: ['approve', 'getAllowance'] } },
				default: '',
				description: 'Spender principal ID',
			},
			{
				displayName: 'Spender Subaccount (Hex)',
				name: 'spenderSubaccount',
				type: 'string',
				displayOptions: { show: { resource: ['icrc'], operation: ['approve', 'getAllowance'] } },
				default: '',
				description: 'Optional spender subaccount',
			},
			{
				displayName: 'Expires At',
				name: 'expiresAt',
				type: 'number',
				displayOptions: { show: { resource: ['icrc'], operation: ['approve'] } },
				default: 0,
				description: 'Approval expiration timestamp (nanoseconds, 0 for no expiry)',
			},

			// ICRC - TransferFrom Fields
			{
				displayName: 'From Principal',
				name: 'fromPrincipal',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['icrc'], operation: ['transferFrom'] } },
				default: '',
				description: 'Source account principal',
			},
			{
				displayName: 'From Subaccount (Hex)',
				name: 'fromSubaccount',
				type: 'string',
				displayOptions: { show: { resource: ['icrc'], operation: ['transferFrom'] } },
				default: '',
				description: 'Optional source subaccount',
			},

			// ICRC - Get Transactions
			{
				displayName: 'Start Index',
				name: 'startIndex',
				type: 'number',
				displayOptions: { show: { resource: ['icrc'], operation: ['getTransactions'] } },
				default: 0,
				description: 'Transaction index to start from',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: { show: { resource: ['icrc'], operation: ['getTransactions'] } },
				default: 100,
				description: 'Maximum transactions to return',
			},

			// ==================== IDENTITY OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['identity'] } },
				options: [
					{ name: 'Get Principal', value: 'getPrincipal', action: 'Get principal from credentials' },
					{ name: 'Get Account Identifier', value: 'getAccountIdentifier', action: 'Get account identifier' },
					{ name: 'Derive Subaccount', value: 'deriveSubaccount', action: 'Derive subaccount' },
					{ name: 'Validate Principal', value: 'validatePrincipal', action: 'Validate principal format' },
					{ name: 'Convert Account Format', value: 'convertAccount', action: 'Convert account formats' },
				],
				default: 'getPrincipal',
			},

			// Identity - Fields
			{
				displayName: 'Principal ID',
				name: 'principalId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['identity'], operation: ['getAccountIdentifier', 'validatePrincipal'] } },
				default: '',
				description: 'Principal ID to work with',
			},
			{
				displayName: 'Subaccount Index',
				name: 'subaccountIndex',
				type: 'number',
				displayOptions: { show: { resource: ['identity'], operation: ['deriveSubaccount', 'getAccountIdentifier'] } },
				default: 0,
				description: 'Index for subaccount derivation',
			},
			{
				displayName: 'Account Identifier',
				name: 'accountIdentifier',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['identity'], operation: ['convertAccount'] } },
				default: '',
				description: 'Account identifier to convert',
			},
			{
				displayName: 'Target Format',
				name: 'targetFormat',
				type: 'options',
				displayOptions: { show: { resource: ['identity'], operation: ['convertAccount'] } },
				options: [
					{ name: 'Hex', value: 'hex' },
					{ name: 'ICRC-1', value: 'icrc1' },
					{ name: 'Bytes', value: 'bytes' },
				],
				default: 'hex',
				description: 'Target format for conversion',
			},

			// ==================== CYCLES OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['cycles'] } },
				options: [
					{ name: 'Get Balance', value: 'getBalance', action: 'Get cycles balance' },
					{ name: 'Convert ICP to Cycles', value: 'convertIcpToCycles', action: 'Convert ICP to cycles' },
					{ name: 'Top Up Canister', value: 'topUpCanister', action: 'Top up canister with cycles' },
					{ name: 'Get Cycles Price', value: 'getCyclesPrice', action: 'Get current cycles price' },
				],
				default: 'getBalance',
			},

			// Cycles - Fields
			{
				displayName: 'Canister ID',
				name: 'canisterId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['cycles'], operation: ['getBalance', 'topUpCanister'] } },
				default: '',
				description: 'Canister ID to query/top up',
			},
			{
				displayName: 'ICP Amount',
				name: 'icpAmount',
				type: 'number',
				required: true,
				displayOptions: { show: { resource: ['cycles'], operation: ['convertIcpToCycles', 'topUpCanister'] } },
				default: 1,
				typeOptions: { numberPrecision: 8 },
				description: 'Amount of ICP to convert',
			},

			// ==================== MANAGEMENT OPERATIONS ====================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['management'] } },
				options: [
					{ name: 'Create Canister', value: 'createCanister', action: 'Create a new canister' },
					{ name: 'Update Settings', value: 'updateSettings', action: 'Update canister settings' },
					{ name: 'Get ECDSA Public Key', value: 'getEcdsaPublicKey', action: 'Get ECDSA public key' },
					{ name: 'Sign with ECDSA', value: 'signWithEcdsa', action: 'Sign with ECDSA' },
					{ name: 'HTTP Request', value: 'httpRequest', action: 'Make HTTP outcall' },
					{ name: 'Get Bitcoin Balance', value: 'getBitcoinBalance', action: 'Get Bitcoin balance' },
					{ name: 'Get Bitcoin UTXOs', value: 'getBitcoinUtxos', action: 'Get Bitcoin UTXOs' },
					{ name: 'Send Bitcoin', value: 'sendBitcoin', action: 'Send Bitcoin transaction' },
					{ name: 'Get Random Bytes', value: 'getRawRand', action: 'Get random bytes from IC' },
				],
				default: 'createCanister',
			},

			// Management - Create Canister
			{
				displayName: 'Controllers',
				name: 'controllers',
				type: 'string',
				displayOptions: { show: { resource: ['management'], operation: ['createCanister', 'updateSettings'] } },
				default: '',
				description: 'Comma-separated controller principal IDs',
			},
			{
				displayName: 'Compute Allocation',
				name: 'computeAllocation',
				type: 'number',
				displayOptions: { show: { resource: ['management'], operation: ['createCanister', 'updateSettings'] } },
				default: 0,
				description: 'Compute allocation (0-100)',
			},
			{
				displayName: 'Memory Allocation',
				name: 'memoryAllocation',
				type: 'number',
				displayOptions: { show: { resource: ['management'], operation: ['createCanister', 'updateSettings'] } },
				default: 0,
				description: 'Memory allocation in bytes',
			},
			{
				displayName: 'Freezing Threshold',
				name: 'freezingThreshold',
				type: 'number',
				displayOptions: { show: { resource: ['management'], operation: ['createCanister', 'updateSettings'] } },
				default: 2592000,
				description: 'Freezing threshold in seconds',
			},
			{
				displayName: 'Cycles Amount',
				name: 'cyclesAmount',
				type: 'number',
				displayOptions: { show: { resource: ['management'], operation: ['createCanister'] } },
				default: 0,
				description: 'Initial cycles to deposit',
			},

			// Management - Update Settings (reuse canisterId from canister operations)
			{
				displayName: 'Canister ID',
				name: 'canisterId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['management'], operation: ['updateSettings', 'getEcdsaPublicKey'] } },
				default: '',
				description: 'Target canister ID',
			},

			// Management - ECDSA
			{
				displayName: 'Derivation Path',
				name: 'derivationPath',
				type: 'string',
				displayOptions: { show: { resource: ['management'], operation: ['getEcdsaPublicKey', 'signWithEcdsa'] } },
				default: '',
				description: 'Key derivation path (slash-separated)',
			},
			{
				displayName: 'Key ID',
				name: 'keyId',
				type: 'options',
				displayOptions: { show: { resource: ['management'], operation: ['getEcdsaPublicKey', 'signWithEcdsa'] } },
				options: [
					{ name: 'Test Key (dfx_test_key)', value: 'dfx_test_key' },
					{ name: 'Production Key (key_1)', value: 'key_1' },
				],
				default: 'dfx_test_key',
				description: 'ECDSA key identifier',
			},
			{
				displayName: 'Message Hash (Hex)',
				name: 'messageHash',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['management'], operation: ['signWithEcdsa'] } },
				default: '',
				description: '32-byte message hash to sign (hex)',
			},

			// Management - HTTP Request
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['management'], operation: ['httpRequest'] } },
				default: '',
				description: 'URL to request',
			},
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				displayOptions: { show: { resource: ['management'], operation: ['httpRequest'] } },
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'HEAD', value: 'HEAD' },
					{ name: 'POST', value: 'POST' },
				],
				default: 'GET',
			},
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'string',
				displayOptions: { show: { resource: ['management'], operation: ['httpRequest'] } },
				default: '',
				description: 'Request headers (one per line: Name: Value)',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				displayOptions: { show: { resource: ['management'], operation: ['httpRequest'] } },
				default: '',
				description: 'Request body',
			},
			{
				displayName: 'Max Response Bytes',
				name: 'maxResponseBytes',
				type: 'number',
				displayOptions: { show: { resource: ['management'], operation: ['httpRequest'] } },
				default: 2000000,
				description: 'Maximum response size in bytes',
			},

			// Management - Bitcoin
			{
				displayName: 'Bitcoin Address',
				name: 'bitcoinAddress',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['management'], operation: ['getBitcoinBalance', 'getBitcoinUtxos'] } },
				default: '',
				description: 'Bitcoin address',
			},
			{
				displayName: 'Bitcoin Network',
				name: 'bitcoinNetwork',
				type: 'options',
				displayOptions: { show: { resource: ['management'], operation: ['getBitcoinBalance', 'getBitcoinUtxos', 'sendBitcoin'] } },
				options: [
					{ name: 'Mainnet', value: 'mainnet' },
					{ name: 'Testnet', value: 'testnet' },
					{ name: 'Regtest', value: 'regtest' },
				],
				default: 'testnet',
			},
			{
				displayName: 'Min Confirmations',
				name: 'minConfirmations',
				type: 'number',
				displayOptions: { show: { resource: ['management'], operation: ['getBitcoinBalance', 'getBitcoinUtxos'] } },
				default: 0,
				description: 'Minimum confirmations required',
			},
			{
				displayName: 'Transaction (Hex)',
				name: 'bitcoinTransaction',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['management'], operation: ['sendBitcoin'] } },
				default: '',
				description: 'Signed Bitcoin transaction in hex',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let result: INodeExecutionData[] = [];

				// Route to appropriate operation
				switch (resource) {
					case 'ledger':
						result = await executeLedgerOperation.call(this, operation, i);
						break;
					case 'canister':
						result = await executeCanisterOperation.call(this, operation, i);
						break;
					case 'governance':
						result = await executeGovernanceOperation.call(this, operation, i);
						break;
					case 'sns':
						result = await executeSnsOperation.call(this, operation, i);
						break;
					case 'icrc':
						result = await executeIcrcOperation.call(this, operation, i);
						break;
					case 'identity':
						result = await executeIdentityOperation.call(this, operation, i);
						break;
					case 'cycles':
						result = await executeCyclesOperation.call(this, operation, i);
						break;
					case 'management':
						result = await executeManagementOperation.call(this, operation, i);
						break;
					default:
						throw new Error(`Unknown resource: ${resource}`);
				}

				returnData.push(...result);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error',
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

// Operation routers
async function executeLedgerOperation(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	switch (operation) {
		case 'getBalance':
			return ledgerBalance.getBalance.call(this, index);
		case 'transfer':
			return ledgerTransfer.transfer.call(this, index);
		case 'getBlock':
			return ledgerBlock.getBlock.call(this, index);
		case 'getBlockTransaction':
			return ledgerBlock.getBlockTransaction.call(this, index);
		case 'searchTransactions':
			return ledgerTransaction.searchTransactions.call(this, index);
		case 'getAccountTransactions':
			return ledgerTransaction.getAccountTransactions.call(this, index);
		case 'getNetworkStatus':
			return ledgerNetwork.getNetworkStatus.call(this, index);
		case 'getNetworkOptions':
			return ledgerNetwork.getNetworkOptions.call(this, index);
		case 'deriveAccount':
			return ledgerNetwork.deriveAccount.call(this, index);
		default:
			throw new Error(`Unknown ledger operation: ${operation}`);
	}
}

async function executeCanisterOperation(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	switch (operation) {
		case 'query':
			return canisterQuery.queryCanister.call(this, index);
		case 'update':
			return canisterUpdate.updateCanisterMethod.call(this, index);
		case 'getStatus':
			return canisterStatus.getCanisterStatus.call(this, index);
		case 'getInfo':
			return canisterStatus.getCanisterInfo.call(this, index);
		case 'getModuleHash':
			return canisterStatus.getCanisterModuleHash.call(this, index);
		case 'getControllers':
			return canisterStatus.getCanisterControllers.call(this, index);
		case 'getCyclesBalance':
			return canisterStatus.getCanisterCyclesBalance.call(this, index);
		case 'installCode':
			return canisterInstall.installCode.call(this, index);
		case 'upgradeCode':
			return canisterInstall.upgradeCode.call(this, index);
		case 'uninstallCode':
			return canisterInstall.uninstallCode.call(this, index);
		case 'startCanister':
			return canisterInstall.startCanister.call(this, index);
		case 'stopCanister':
			return canisterInstall.stopCanister.call(this, index);
		case 'deleteCanister':
			return canisterInstall.deleteCanister.call(this, index);
		default:
			throw new Error(`Unknown canister operation: ${operation}`);
	}
}

async function executeGovernanceOperation(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	let result: unknown;
	switch (operation) {
		case 'listProposals':
			result = await governanceProposals.listProposals.call(this, index);
			break;
		case 'getProposal':
			result = await governanceProposals.getProposal.call(this, index);
			break;
		case 'getPendingProposals':
			result = await governanceProposals.getPendingProposals.call(this, index);
			break;
		case 'listNeurons':
			result = await governanceNeurons.listNeurons.call(this, index);
			break;
		case 'getNeuron':
			result = await governanceNeurons.getNeuron.call(this, index);
			break;
		case 'getKnownNeurons':
			result = await governanceNeurons.getKnownNeurons.call(this, index);
			break;
		case 'getNetworkEconomics':
			result = await governanceEconomics.getNetworkEconomics.call(this, index);
			break;
		default:
			throw new Error(`Unknown governance operation: ${operation}`);
	}
	return [{ json: result as IDataObject }];
}

async function executeSnsOperation(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	let result: unknown;
	switch (operation) {
		case 'listProjects':
			result = await snsOps.listSnsProjects.call(this, index);
			break;
		case 'getProject':
			result = await snsOps.getSnsProject.call(this, index);
			break;
		case 'getProposals':
			result = await snsOps.getSnsProposals.call(this, index);
			break;
		case 'getNeurons':
			result = await snsOps.getSnsNeurons.call(this, index);
			break;
		case 'getTokenInfo':
			result = await snsOps.getSnsTokenInfo.call(this, index);
			break;
		default:
			throw new Error(`Unknown SNS operation: ${operation}`);
	}
	return [{ json: result as IDataObject }];
}

async function executeIcrcOperation(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	let result: unknown;
	switch (operation) {
		case 'getMetadata':
			result = await icrcOps.getIcrcMetadata.call(this, index);
			break;
		case 'getBalance':
			result = await icrcOps.getIcrcBalance.call(this, index);
			break;
		case 'transfer':
			result = await icrcOps.icrcTransfer.call(this, index);
			break;
		case 'approve':
			result = await icrcOps.icrcApprove.call(this, index);
			break;
		case 'transferFrom':
			result = await icrcOps.icrcTransferFrom.call(this, index);
			break;
		case 'getAllowance':
			result = await icrcOps.getIcrcAllowance.call(this, index);
			break;
		case 'getTransactions':
			result = await icrcOps.getIcrcTransactions.call(this, index);
			break;
		default:
			throw new Error(`Unknown ICRC operation: ${operation}`);
	}
	return [{ json: result as IDataObject }];
}

async function executeIdentityOperation(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	let result: unknown;
	switch (operation) {
		case 'getPrincipal':
			result = await identityOps.getPrincipal.call(this, index);
			break;
		case 'getAccountIdentifier':
			result = await identityOps.getAccountIdentifier.call(this, index);
			break;
		case 'deriveSubaccount':
			result = await identityOps.deriveSubaccount.call(this, index);
			break;
		case 'validatePrincipal':
			result = await identityOps.validatePrincipal.call(this, index);
			break;
		case 'convertAccount':
			result = await identityOps.convertAccountFormat.call(this, index);
			break;
		default:
			throw new Error(`Unknown identity operation: ${operation}`);
	}
	return [{ json: result as IDataObject }];
}

async function executeCyclesOperation(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	let result: unknown;
	switch (operation) {
		case 'getBalance':
			result = await cyclesOps.getCyclesBalance.call(this, index);
			break;
		case 'convertIcpToCycles':
			result = await cyclesOps.convertIcpToCycles.call(this, index);
			break;
		case 'topUpCanister':
			result = await cyclesOps.topUpCanister.call(this, index);
			break;
		case 'getCyclesPrice':
			result = await cyclesOps.getCyclesPrice.call(this, index);
			break;
		default:
			throw new Error(`Unknown cycles operation: ${operation}`);
	}
	return [{ json: result as IDataObject }];
}

async function executeManagementOperation(
	this: IExecuteFunctions,
	operation: string,
	index: number,
): Promise<INodeExecutionData[]> {
	let result: unknown;
	switch (operation) {
		case 'createCanister':
			result = await managementOps.createCanister.call(this, index);
			break;
		case 'updateSettings':
			result = await managementOps.updateSettings.call(this, index);
			break;
		case 'getEcdsaPublicKey':
			result = await managementOps.getEcdsaPublicKey.call(this, index);
			break;
		case 'signWithEcdsa':
			result = await managementOps.signWithEcdsa.call(this, index);
			break;
		case 'httpRequest':
			result = await managementOps.httpRequest.call(this, index);
			break;
		case 'getBitcoinBalance':
			result = await managementOps.getBitcoinBalance.call(this, index);
			break;
		case 'getBitcoinUtxos':
			result = await managementOps.getBitcoinUtxos.call(this, index);
			break;
		case 'sendBitcoin':
			result = await managementOps.sendBitcoin.call(this, index);
			break;
		case 'getRawRand':
			result = await managementOps.getRawRand.call(this, index);
			break;
		default:
			throw new Error(`Unknown management operation: ${operation}`);
	}
	return [{ json: result as IDataObject }];
}
