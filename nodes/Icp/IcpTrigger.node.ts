/**
 * Internet Computer Protocol (ICP) Trigger Node for n8n
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
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import { createRosettaClient, getAccountBalance, searchTransactions, RosettaCredentials, NetworkIdentifier } from './transport/rosetta';
import { createAgent, createActor, AgentCredentials } from './transport/agent';
import { SYSTEM_CANISTERS } from './constants/canisters';
import { managementCanisterIdlFactory, nnsGovernanceIdlFactory } from './transport/candid';
import { Principal } from '@dfinity/principal';

// Emit licensing notice on load
const LICENSING_NOTICE_LOGGED = Symbol.for('icp.trigger.licensing.notice');
if (!(global as Record<symbol, boolean>)[LICENSING_NOTICE_LOGGED]) {
	console.warn(`
[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
`);
	(global as Record<symbol, boolean>)[LICENSING_NOTICE_LOGGED] = true;
}

export class IcpTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Internet Computer Trigger',
		name: 'icpTrigger',
		icon: 'file:icp.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Triggers on Internet Computer events',
		defaults: {
			name: 'ICP Trigger',
		},
		inputs: [],
		outputs: ['main'],
		polling: true,
		credentials: [
			{
				name: 'icpAgentApi',
				required: true,
				displayOptions: {
					show: {
						event: ['canisterStatusChanged', 'cyclesLowAlert', 'newProposal', 'proposalStatusChanged'],
					},
				},
			},
			{
				name: 'icpRosettaApi',
				required: true,
				displayOptions: {
					show: {
						event: ['newTransaction', 'balanceChanged', 'largeTransfer'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Balance Changed',
						value: 'balanceChanged',
						description: 'Trigger when account balance changes',
					},
					{
						name: 'Canister Status Changed',
						value: 'canisterStatusChanged',
						description: 'Trigger when canister status changes',
					},
					{
						name: 'Cycles Low Alert',
						value: 'cyclesLowAlert',
						description: 'Trigger when canister cycles fall below threshold',
					},
					{
						name: 'Large Transfer',
						value: 'largeTransfer',
						description: 'Trigger on transfers above threshold',
					},
					{
						name: 'New Proposal',
						value: 'newProposal',
						description: 'Trigger on new governance proposals',
					},
					{
						name: 'New Transaction',
						value: 'newTransaction',
						description: 'Trigger on new transactions for account',
					},
					{
						name: 'Proposal Status Changed',
						value: 'proposalStatusChanged',
						description: 'Trigger when proposal status changes',
					},
				],
				default: 'newTransaction',
			},
			{
				displayName: 'Account Identifier',
				name: 'accountIdentifier',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						event: ['newTransaction', 'balanceChanged', 'largeTransfer'],
					},
				},
				placeholder: 'e.g., 64-character hex string',
				description: 'The account identifier to monitor',
			},
			{
				displayName: 'Canister ID',
				name: 'canisterId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						event: ['canisterStatusChanged', 'cyclesLowAlert'],
					},
				},
				placeholder: 'e.g., ryjl3-tyaaa-aaaaa-aaaba-cai',
				description: 'The canister ID to monitor',
			},
			{
				displayName: 'Minimum Amount (ICP)',
				name: 'minimumAmount',
				type: 'number',
				default: 100,
				displayOptions: {
					show: {
						event: ['largeTransfer'],
					},
				},
				description: 'Minimum transfer amount in ICP to trigger',
			},
			{
				displayName: 'Cycles Threshold',
				name: 'cyclesThreshold',
				type: 'string',
				default: '1000000000000',
				displayOptions: {
					show: {
						event: ['cyclesLowAlert'],
					},
				},
				description: 'Alert when cycles fall below this threshold (1T = 1,000,000,000,000)',
			},
			{
				displayName: 'Proposal ID',
				name: 'proposalId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						event: ['proposalStatusChanged'],
					},
				},
				description: 'Specific proposal ID to monitor (leave empty for all proposals)',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event', 0) as string;
		const webhookData = this.getWorkflowStaticData('node');

		try {
			switch (event) {
				case 'newTransaction':
					return await pollNewTransactions.call(this, webhookData);
				case 'balanceChanged':
					return await pollBalanceChanged.call(this, webhookData);
				case 'largeTransfer':
					return await pollLargeTransfers.call(this, webhookData);
				case 'canisterStatusChanged':
					return await pollCanisterStatus.call(this, webhookData);
				case 'cyclesLowAlert':
					return await pollCyclesLow.call(this, webhookData);
				case 'newProposal':
					return await pollNewProposals.call(this, webhookData);
				case 'proposalStatusChanged':
					return await pollProposalStatus.call(this, webhookData);
				default:
					return null;
			}
		} catch (error) {
			// Don't fail the poll, just return null on error
			console.error('ICP Trigger poll error:', error);
			return null;
		}
	}
}

// Helper to create agent credentials from n8n credentials
function getAgentCredentials(credentials: IDataObject): AgentCredentials {
	return {
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: (credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous') || 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	};
}

// Helper to create rosetta credentials from n8n credentials
function getRosettaCredentials(credentials: IDataObject): RosettaCredentials {
	return {
		rosettaUrl: credentials.rosettaUrl as string,
		networkIdentifier: credentials.networkIdentifier as string,
		customBlockchain: credentials.customBlockchain as string | undefined,
		customNetwork: credentials.customNetwork as string | undefined,
	};
}

// Helper to get network identifier
function getNetworkId(credentials: IDataObject): NetworkIdentifier {
	const networkId = credentials.networkIdentifier as string;
	if (networkId === 'custom') {
		return {
			blockchain: credentials.customBlockchain as string || 'Internet Computer',
			network: credentials.customNetwork as string || '00000000000000020101',
		};
	}
	return {
		blockchain: 'Internet Computer',
		network: '00000000000000020101',
	};
}

// Poll for new transactions
async function pollNewTransactions(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const rawCredentials = await this.getCredentials('icpRosettaApi');
	const credentials = getRosettaCredentials(rawCredentials as IDataObject);
	const networkId = getNetworkId(rawCredentials as IDataObject);
	const accountIdentifier = this.getNodeParameter('accountIdentifier', 0) as string;

	const client = createRosettaClient(credentials);
	const lastBlock = (webhookData.lastBlock as number) || 0;

	const transactions = await searchTransactions(client, networkId, {
		account_identifier: { address: accountIdentifier },
		max_block: undefined,
		limit: 20,
		offset: 0,
	});

	if (!transactions.transactions || transactions.transactions.length === 0) {
		return null;
	}

	// Filter for new transactions
	const newTransactions = transactions.transactions.filter(
		(tx: { block_identifier: { index: number } }) => tx.block_identifier.index > lastBlock,
	);

	if (newTransactions.length === 0) {
		return null;
	}

	// Update last seen block
	const maxBlock = Math.max(...newTransactions.map((tx: { block_identifier: { index: number } }) => tx.block_identifier.index));
	webhookData.lastBlock = maxBlock;

	return [
		newTransactions.map((tx: IDataObject) => ({
			json: {
				event: 'newTransaction',
				accountIdentifier,
				transaction: tx,
				timestamp: new Date().toISOString(),
			},
		})),
	];
}

// Poll for balance changes
async function pollBalanceChanged(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const rawCredentials = await this.getCredentials('icpRosettaApi');
	const credentials = getRosettaCredentials(rawCredentials as IDataObject);
	const networkId = getNetworkId(rawCredentials as IDataObject);
	const accountIdentifier = this.getNodeParameter('accountIdentifier', 0) as string;

	const client = createRosettaClient(credentials);
	const currentBalance = await getAccountBalance(client, networkId, accountIdentifier);

	const balanceValue = currentBalance.balances?.[0]?.value || '0';
	const previousBalance = (webhookData.previousBalance as string) || balanceValue;

	if (balanceValue === previousBalance) {
		return null;
	}

	const change = BigInt(balanceValue) - BigInt(previousBalance);
	webhookData.previousBalance = balanceValue;

	return [
		[
			{
				json: {
					event: 'balanceChanged',
					accountIdentifier,
					previousBalance: {
						e8s: previousBalance,
						icp: Number(previousBalance) / 100000000,
					},
					currentBalance: {
						e8s: balanceValue,
						icp: Number(balanceValue) / 100000000,
					},
					change: {
						e8s: change.toString(),
						icp: Number(change) / 100000000,
					},
					timestamp: new Date().toISOString(),
				},
			},
		],
	];
}

// Poll for large transfers
async function pollLargeTransfers(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const rawCredentials = await this.getCredentials('icpRosettaApi');
	const credentials = getRosettaCredentials(rawCredentials as IDataObject);
	const networkId = getNetworkId(rawCredentials as IDataObject);
	const accountIdentifier = this.getNodeParameter('accountIdentifier', 0) as string;
	const minimumAmount = this.getNodeParameter('minimumAmount', 0) as number;

	const client = createRosettaClient(credentials);
	const lastBlock = (webhookData.lastBlock as number) || 0;
	const minimumE8s = BigInt(Math.floor(minimumAmount * 100000000));

	const transactions = await searchTransactions(client, networkId, {
		account_identifier: { address: accountIdentifier },
		max_block: undefined,
		limit: 20,
		offset: 0,
	});

	if (!transactions.transactions || transactions.transactions.length === 0) {
		return null;
	}

	// Filter for new large transactions
	const largeTransfers = transactions.transactions.filter((tx: IDataObject) => {
		const blockIndex = (tx.block_identifier as { index: number })?.index || 0;
		if (blockIndex <= lastBlock) return false;

		const transaction = tx.transaction as { operations?: Array<{ amount?: { value: string } }> };
		const operations = transaction?.operations || [];
		const hasLargeAmount = operations.some((op) => {
			const amount = BigInt(Math.abs(Number(op.amount?.value || '0')));
			return amount >= minimumE8s;
		});

		return hasLargeAmount;
	});

	if (largeTransfers.length === 0) {
		return null;
	}

	const maxBlock = Math.max(...transactions.transactions.map((tx: { block_identifier: { index: number } }) => tx.block_identifier?.index || 0));
	webhookData.lastBlock = maxBlock;

	return [
		largeTransfers.map((tx: IDataObject) => ({
			json: {
				event: 'largeTransfer',
				accountIdentifier,
				minimumAmount,
				transaction: tx,
				timestamp: new Date().toISOString(),
			},
		})),
	];
}

// Poll for canister status changes
async function pollCanisterStatus(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const rawCredentials = await this.getCredentials('icpAgentApi');
	const credentials = getAgentCredentials(rawCredentials as IDataObject);
	const canisterId = this.getNodeParameter('canisterId', 0) as string;

	const agent = await createAgent(credentials);
	const actor = createActor<{
		canister_status: (arg: { canister_id: Principal }) => Promise<{
			status: { running?: null; stopping?: null; stopped?: null };
			cycles: bigint;
		}>;
	}>(agent, SYSTEM_CANISTERS.management, managementCanisterIdlFactory);

	const result = await actor.canister_status({
		canister_id: Principal.fromText(canisterId),
	});

	const currentStatus = Object.keys(result.status)[0] || 'unknown';
	const previousStatus = webhookData.previousStatus as string;

	if (previousStatus && currentStatus === previousStatus) {
		return null;
	}

	webhookData.previousStatus = currentStatus;

	return [
		[
			{
				json: {
					event: 'canisterStatusChanged',
					canisterId,
					previousStatus: previousStatus || null,
					currentStatus,
					cycles: result.cycles.toString(),
					timestamp: new Date().toISOString(),
				},
			},
		],
	];
}

// Poll for cycles low alert
async function pollCyclesLow(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const rawCredentials = await this.getCredentials('icpAgentApi');
	const credentials = getAgentCredentials(rawCredentials as IDataObject);
	const canisterId = this.getNodeParameter('canisterId', 0) as string;
	const threshold = BigInt(this.getNodeParameter('cyclesThreshold', 0) as string);

	const agent = await createAgent(credentials);
	const actor = createActor<{
		canister_status: (arg: { canister_id: Principal }) => Promise<{
			status: { running?: null; stopping?: null; stopped?: null };
			cycles: bigint;
		}>;
	}>(agent, SYSTEM_CANISTERS.management, managementCanisterIdlFactory);

	const result = await actor.canister_status({
		canister_id: Principal.fromText(canisterId),
	});

	const currentCycles = BigInt(result.cycles.toString());
	const wasLow = webhookData.cyclesLow as boolean;

	// Only alert when cycles drop below threshold and we haven't already alerted
	if (currentCycles >= threshold) {
		webhookData.cyclesLow = false;
		return null;
	}

	if (wasLow) {
		return null;
	}

	webhookData.cyclesLow = true;

	return [
		[
			{
				json: {
					event: 'cyclesLowAlert',
					canisterId,
					threshold: threshold.toString(),
					currentCycles: currentCycles.toString(),
					percentOfThreshold: ((Number(currentCycles) / Number(threshold)) * 100).toFixed(2) + '%',
					timestamp: new Date().toISOString(),
				},
			},
		],
	];
}

// Poll for new proposals
async function pollNewProposals(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const rawCredentials = await this.getCredentials('icpAgentApi');
	const credentials = getAgentCredentials(rawCredentials as IDataObject);

	const agent = await createAgent(credentials);
	const actor = createActor<{
		list_proposals: (arg: {
			include_reward_status: number[];
			omit_large_fields: boolean[];
			before_proposal: { id: bigint }[];
			limit: number;
			exclude_topic: number[];
			include_all_manage_neuron_proposals: boolean[];
			include_status: number[];
		}) => Promise<{ proposal_info: Array<{ id?: [{ id: bigint }]; status: number }> }>;
	}>(agent, SYSTEM_CANISTERS.governance, nnsGovernanceIdlFactory);

	const result = await actor.list_proposals({
		include_reward_status: [],
		omit_large_fields: [true],
		before_proposal: [],
		limit: 10,
		exclude_topic: [],
		include_all_manage_neuron_proposals: [],
		include_status: [1], // Open proposals
	});

	const proposals = result.proposal_info || [];
	const lastProposalId = webhookData.lastProposalId as string;

	// Filter for new proposals
	const newProposals = proposals.filter((p) => {
		const id = p.id?.[0]?.id;
		if (!id) return false;
		if (!lastProposalId) return true;
		return BigInt(id.toString()) > BigInt(lastProposalId);
	});

	if (newProposals.length === 0) {
		return null;
	}

	// Update last seen proposal
	const maxId = newProposals.reduce((max, p) => {
		const id = p.id?.[0]?.id;
		if (!id) return max;
		return BigInt(id.toString()) > BigInt(max) ? id.toString() : max;
	}, lastProposalId || '0');
	webhookData.lastProposalId = maxId;

	return [
		newProposals.map((p) => ({
			json: {
				event: 'newProposal',
				proposalId: p.id?.[0]?.id?.toString() || null,
				status: p.status,
				timestamp: new Date().toISOString(),
			},
		})),
	];
}

// Poll for proposal status changes
async function pollProposalStatus(
	this: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const rawCredentials = await this.getCredentials('icpAgentApi');
	const credentials = getAgentCredentials(rawCredentials as IDataObject);
	const proposalId = this.getNodeParameter('proposalId', 0) as string;

	if (!proposalId) {
		return null;
	}

	const agent = await createAgent(credentials);
	const actor = createActor<{
		get_proposal_info: (id: bigint) => Promise<[{ status: number }] | []>;
	}>(agent, SYSTEM_CANISTERS.governance, nnsGovernanceIdlFactory);

	const result = await actor.get_proposal_info(BigInt(proposalId));

	if (!result || result.length === 0) {
		return null;
	}

	const currentStatus = result[0].status;
	const previousStatus = webhookData.proposalStatus as number;

	if (previousStatus !== undefined && currentStatus === previousStatus) {
		return null;
	}

	webhookData.proposalStatus = currentStatus;

	return [
		[
			{
				json: {
					event: 'proposalStatusChanged',
					proposalId,
					previousStatus: previousStatus ?? null,
					currentStatus,
					timestamp: new Date().toISOString(),
				},
			},
		],
	];
}
