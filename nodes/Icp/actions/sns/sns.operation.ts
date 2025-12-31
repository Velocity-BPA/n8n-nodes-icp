/**
 * SNS (Service Nervous System) Operations for Internet Computer
 *
 * Copyright © 2025 Velocity BPA. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See LICENSE file in the project root for full license information.
 */

import type { IExecuteFunctions, IDataObject, INodeProperties } from 'n8n-workflow';
import { createAgent, createActor, AgentCredentials } from '../../transport/agent';
import { SYSTEM_CANISTERS } from '../../constants/canisters';
import { IcpError, ICP_ERROR_CODES } from '../../constants/errors';
import { Principal } from '@dfinity/principal';

// SNS-WASM canister ID
const SNS_WASM_CANISTER_ID = SYSTEM_CANISTERS.snsWasm;

// SNS-WASM IDL factory
const snsWasmIdlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
	const _SnsCanisterIds = IDL.Record({
		root_canister_id: IDL.Opt(IDL.Principal),
		governance_canister_id: IDL.Opt(IDL.Principal),
		ledger_canister_id: IDL.Opt(IDL.Principal),
		swap_canister_id: IDL.Opt(IDL.Principal),
		index_canister_id: IDL.Opt(IDL.Principal),
	});

	const DeployedSns = IDL.Record({
		root_canister_id: IDL.Opt(IDL.Principal),
		governance_canister_id: IDL.Opt(IDL.Principal),
		ledger_canister_id: IDL.Opt(IDL.Principal),
		swap_canister_id: IDL.Opt(IDL.Principal),
		index_canister_id: IDL.Opt(IDL.Principal),
	});

	const ListDeployedSnsesResponse = IDL.Record({
		instances: IDL.Vec(DeployedSns),
	});

	return IDL.Service({
		list_deployed_snses: IDL.Func([IDL.Record({})], [ListDeployedSnsesResponse], ['query']),
	});
};

// SNS Governance IDL factory
const snsGovernanceIdlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
	const GetMetadataResponse = IDL.Record({
		name: IDL.Opt(IDL.Text),
		description: IDL.Opt(IDL.Text),
		url: IDL.Opt(IDL.Text),
		logo: IDL.Opt(IDL.Text),
	});

	const NeuronId = IDL.Record({
		id: IDL.Vec(IDL.Nat8),
	});

	const ProposalId = IDL.Record({
		id: IDL.Nat64,
	});

	const Proposal = IDL.Record({
		url: IDL.Text,
		title: IDL.Text,
		action: IDL.Opt(IDL.Nat64),
		summary: IDL.Text,
	});

	const ProposalData = IDL.Record({
		id: IDL.Opt(ProposalId),
		payload_text_rendering: IDL.Opt(IDL.Text),
		proposal: IDL.Opt(Proposal),
		proposal_creation_timestamp_seconds: IDL.Nat64,
		decided_timestamp_seconds: IDL.Nat64,
		executed_timestamp_seconds: IDL.Nat64,
		failed_timestamp_seconds: IDL.Nat64,
	});

	const ListProposalsResponse = IDL.Record({
		proposals: IDL.Vec(ProposalData),
		include_ballots_by_caller: IDL.Opt(IDL.Bool),
	});

	const Neuron = IDL.Record({
		id: IDL.Opt(NeuronId),
		staked_maturity_e8s_equivalent: IDL.Opt(IDL.Nat64),
		cached_neuron_stake_e8s: IDL.Nat64,
		created_timestamp_seconds: IDL.Nat64,
		aging_since_timestamp_seconds: IDL.Nat64,
		dissolve_state: IDL.Opt(IDL.Variant({
			DissolveDelaySeconds: IDL.Nat64,
			WhenDissolvedTimestampSeconds: IDL.Nat64,
		})),
	});

	const ListNeuronsResponse = IDL.Record({
		neurons: IDL.Vec(Neuron),
	});

	return IDL.Service({
		get_metadata: IDL.Func([IDL.Record({})], [GetMetadataResponse], ['query']),
		list_proposals: IDL.Func([IDL.Record({
			limit: IDL.Nat32,
			before_proposal: IDL.Opt(ProposalId),
			exclude_type: IDL.Vec(IDL.Nat64),
			include_reward_status: IDL.Vec(IDL.Int32),
			include_status: IDL.Vec(IDL.Int32),
		})], [ListProposalsResponse], ['query']),
		list_neurons: IDL.Func([IDL.Record({
			of_principal: IDL.Opt(IDL.Principal),
			limit: IDL.Nat32,
			start_page_at: IDL.Opt(NeuronId),
		})], [ListNeuronsResponse], ['query']),
	});
};

// SNS Root IDL factory
const snsRootIdlFactory = ({ IDL }: { IDL: typeof import('@dfinity/candid').IDL }) => {
	const CanisterSummary = IDL.Record({
		canister_id: IDL.Opt(IDL.Principal),
		status: IDL.Opt(IDL.Record({
			status: IDL.Variant({
				running: IDL.Null,
				stopping: IDL.Null,
				stopped: IDL.Null,
			}),
			memory_size: IDL.Nat,
			cycles: IDL.Nat,
		})),
	});

	const GetSnsCanistersSummaryResponse = IDL.Record({
		root: IDL.Opt(CanisterSummary),
		governance: IDL.Opt(CanisterSummary),
		ledger: IDL.Opt(CanisterSummary),
		swap: IDL.Opt(CanisterSummary),
		index: IDL.Opt(CanisterSummary),
		dapps: IDL.Vec(CanisterSummary),
		archives: IDL.Vec(CanisterSummary),
	});

	return IDL.Service({
		get_sns_canisters_summary: IDL.Func([IDL.Record({
			update_canister_list: IDL.Opt(IDL.Bool),
		})], [GetSnsCanistersSummaryResponse], []),
	});
};

// Service interfaces
interface SnsWasmService {
	list_deployed_snses: (args: Record<string, never>) => Promise<{
		instances: Array<{
			root_canister_id: [] | [Principal];
			governance_canister_id: [] | [Principal];
			ledger_canister_id: [] | [Principal];
			swap_canister_id: [] | [Principal];
			index_canister_id: [] | [Principal];
		}>;
	}>;
}

interface SnsGovernanceService {
	get_metadata: (args: Record<string, never>) => Promise<{
		name: [] | [string];
		description: [] | [string];
		url: [] | [string];
		logo: [] | [string];
	}>;
	list_proposals: (args: {
		limit: number;
		before_proposal: [] | [{ id: bigint }];
		exclude_type: bigint[];
		include_reward_status: number[];
		include_status: number[];
	}) => Promise<{
		proposals: Array<{
			id: [] | [{ id: bigint }];
			payload_text_rendering: [] | [string];
			proposal: [] | [{
				url: string;
				title: string;
				action: [] | [bigint];
				summary: string;
			}];
			proposal_creation_timestamp_seconds: bigint;
			decided_timestamp_seconds: bigint;
			executed_timestamp_seconds: bigint;
			failed_timestamp_seconds: bigint;
		}>;
		include_ballots_by_caller: [] | [boolean];
	}>;
	list_neurons: (args: {
		of_principal: [] | [Principal];
		limit: number;
		start_page_at: [] | [{ id: Uint8Array }];
	}) => Promise<{
		neurons: Array<{
			id: [] | [{ id: Uint8Array }];
			staked_maturity_e8s_equivalent: [] | [bigint];
			cached_neuron_stake_e8s: bigint;
			created_timestamp_seconds: bigint;
			aging_since_timestamp_seconds: bigint;
			dissolve_state: [] | [{ DissolveDelaySeconds: bigint } | { WhenDissolvedTimestampSeconds: bigint }];
		}>;
	}>;
}

interface SnsRootService {
	get_sns_canisters_summary: (args: { update_canister_list: [] | [boolean] }) => Promise<{
		root: [] | [{ canister_id: [] | [Principal]; status: unknown }];
		governance: [] | [{ canister_id: [] | [Principal]; status: unknown }];
		ledger: [] | [{ canister_id: [] | [Principal]; status: unknown }];
		swap: [] | [{ canister_id: [] | [Principal]; status: unknown }];
		index: [] | [{ canister_id: [] | [Principal]; status: unknown }];
		dapps: Array<{ canister_id: [] | [Principal]; status: unknown }>;
		archives: Array<{ canister_id: [] | [Principal]; status: unknown }>;
	}>;
}

// Helper to get credentials
function getAgentCredentials(credentials: unknown): AgentCredentials {
	const creds = credentials as {
		network?: string;
		customNetworkUrl?: string;
		identityType?: string;
		privateKey?: string;
	};
	return {
		network: creds.network || 'mainnet',
		customNetworkUrl: creds.customNetworkUrl,
		identityType: (creds.identityType || 'anonymous') as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: creds.privateKey,
	};
}

/**
 * SNS operation properties
 */
export const snsOperationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sns'],
			},
		},
		options: [
			{
				name: 'List SNS Projects',
				value: 'listSnsProjects',
				description: 'List all deployed SNS projects',
				action: 'List SNS projects',
			},
			{
				name: 'Get SNS Project',
				value: 'getSnsProject',
				description: 'Get details of a specific SNS project',
				action: 'Get SNS project',
			},
			{
				name: 'Get SNS Proposals',
				value: 'getSnsProposals',
				description: 'Get proposals for an SNS',
				action: 'Get SNS proposals',
			},
			{
				name: 'Get SNS Neurons',
				value: 'getSnsNeurons',
				description: 'Get neurons for an SNS',
				action: 'Get SNS neurons',
			},
			{
				name: 'Get SNS Token Info',
				value: 'getSnsTokenInfo',
				description: 'Get token information for an SNS',
				action: 'Get SNS token info',
			},
		],
		default: 'listSnsProjects',
	},
	{
		displayName: 'SNS Root Canister ID',
		name: 'snsRootCanisterId',
		type: 'string',
		default: '',
		required: true,
		description: 'The root canister ID of the SNS project',
		displayOptions: {
			show: {
				resource: ['sns'],
				operation: ['getSnsProject', 'getSnsProposals', 'getSnsNeurons', 'getSnsTokenInfo'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		description: 'Maximum number of results to return',
		displayOptions: {
			show: {
				resource: ['sns'],
				operation: ['getSnsProposals', 'getSnsNeurons'],
			},
		},
	},
];

/**
 * List all deployed SNS projects
 */
export async function listSnsProjects(
	this: IExecuteFunctions,
	_itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);

	const agent = await createAgent(agentCredentials);

	try {
		const actor = createActor<SnsWasmService>(
			agent,
			SNS_WASM_CANISTER_ID,
			snsWasmIdlFactory as any,
		);

		const result = await actor.list_deployed_snses({});

		const projects = result.instances.map((sns) => ({
			rootCanisterId: sns.root_canister_id.length > 0 ? sns.root_canister_id[0].toText() : null,
			governanceCanisterId: sns.governance_canister_id.length > 0 ? sns.governance_canister_id[0].toText() : null,
			ledgerCanisterId: sns.ledger_canister_id.length > 0 ? sns.ledger_canister_id[0].toText() : null,
			swapCanisterId: sns.swap_canister_id.length > 0 ? sns.swap_canister_id[0].toText() : null,
			indexCanisterId: sns.index_canister_id.length > 0 ? sns.index_canister_id[0].toText() : null,
		}));

		return {
			projects,
			totalCount: projects.length,
		};
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.QUERY_ERROR,
			`Failed to list SNS projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get SNS project details
 */
export async function getSnsProject(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);
	const snsRootCanisterId = this.getNodeParameter('snsRootCanisterId', itemIndex) as string;

	const agent = await createAgent(agentCredentials);

	try {
		// Get canister summary from root
		const rootActor = createActor<SnsRootService>(
			agent,
			snsRootCanisterId,
			snsRootIdlFactory as any,
		);

		const summary = await rootActor.get_sns_canisters_summary({
			update_canister_list: [],
		});

		const governanceCanisterId = summary.governance.length > 0 && 
			summary.governance[0].canister_id.length > 0
			? summary.governance[0].canister_id[0].toText()
			: null;

		if (!governanceCanisterId) {
			throw new Error('Could not find governance canister for this SNS');
		}

		// Get metadata from governance
		const govActor = createActor<SnsGovernanceService>(
			agent,
			governanceCanisterId,
			snsGovernanceIdlFactory as any,
		);

		const metadata = await govActor.get_metadata({});

		return {
			rootCanisterId: snsRootCanisterId,
			name: metadata.name.length > 0 ? metadata.name[0] : null,
			description: metadata.description.length > 0 ? metadata.description[0] : null,
			url: metadata.url.length > 0 ? metadata.url[0] : null,
			logo: metadata.logo.length > 0 ? metadata.logo[0] : null,
			canisterIds: {
				root: snsRootCanisterId,
				governance: governanceCanisterId,
				ledger: summary.ledger.length > 0 && summary.ledger[0].canister_id.length > 0
					? summary.ledger[0].canister_id[0].toText()
					: null,
				swap: summary.swap.length > 0 && summary.swap[0].canister_id.length > 0
					? summary.swap[0].canister_id[0].toText()
					: null,
				index: summary.index.length > 0 && summary.index[0].canister_id.length > 0
					? summary.index[0].canister_id[0].toText()
					: null,
			},
			dappCount: summary.dapps.length,
			archiveCount: summary.archives.length,
		};
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.QUERY_ERROR,
			`Failed to get SNS project: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get SNS proposals
 */
export async function getSnsProposals(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);
	const snsRootCanisterId = this.getNodeParameter('snsRootCanisterId', itemIndex) as string;
	const limit = this.getNodeParameter('limit', itemIndex, 10) as number;

	const agent = await createAgent(agentCredentials);

	try {
		// Get governance canister from root
		const rootActor = createActor<SnsRootService>(
			agent,
			snsRootCanisterId,
			snsRootIdlFactory as any,
		);

		const summary = await rootActor.get_sns_canisters_summary({
			update_canister_list: [],
		});

		const governanceCanisterId = summary.governance.length > 0 && 
			summary.governance[0].canister_id.length > 0
			? summary.governance[0].canister_id[0].toText()
			: null;

		if (!governanceCanisterId) {
			throw new Error('Could not find governance canister for this SNS');
		}

		// Get proposals from governance
		const govActor = createActor<SnsGovernanceService>(
			agent,
			governanceCanisterId,
			snsGovernanceIdlFactory as any,
		);

		const result = await govActor.list_proposals({
			limit,
			before_proposal: [],
			exclude_type: [],
			include_reward_status: [],
			include_status: [],
		});

		const proposals = result.proposals.map((p) => ({
			id: p.id.length > 0 ? p.id[0].id.toString() : null,
			title: p.proposal.length > 0 ? p.proposal[0].title : null,
			summary: p.proposal.length > 0 ? p.proposal[0].summary : null,
			url: p.proposal.length > 0 ? p.proposal[0].url : null,
			createdAt: Number(p.proposal_creation_timestamp_seconds),
			decidedAt: Number(p.decided_timestamp_seconds),
			executedAt: Number(p.executed_timestamp_seconds),
			failedAt: Number(p.failed_timestamp_seconds),
		}));

		return {
			snsRootCanisterId,
			governanceCanisterId,
			proposals,
			count: proposals.length,
		};
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.QUERY_ERROR,
			`Failed to get SNS proposals: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get SNS neurons
 */
export async function getSnsNeurons(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);
	const snsRootCanisterId = this.getNodeParameter('snsRootCanisterId', itemIndex) as string;
	const limit = this.getNodeParameter('limit', itemIndex, 10) as number;

	const agent = await createAgent(agentCredentials);

	try {
		// Get governance canister from root
		const rootActor = createActor<SnsRootService>(
			agent,
			snsRootCanisterId,
			snsRootIdlFactory as any,
		);

		const summary = await rootActor.get_sns_canisters_summary({
			update_canister_list: [],
		});

		const governanceCanisterId = summary.governance.length > 0 && 
			summary.governance[0].canister_id.length > 0
			? summary.governance[0].canister_id[0].toText()
			: null;

		if (!governanceCanisterId) {
			throw new Error('Could not find governance canister for this SNS');
		}

		// Get neurons from governance
		const govActor = createActor<SnsGovernanceService>(
			agent,
			governanceCanisterId,
			snsGovernanceIdlFactory as any,
		);

		const result = await govActor.list_neurons({
			of_principal: [],
			limit,
			start_page_at: [],
		});

		const neurons = result.neurons.map((n) => {
			let dissolveState = 'Unknown';
			let dissolveValue: string | null = null;
			
			if (n.dissolve_state.length > 0) {
				const state = n.dissolve_state[0];
				if ('DissolveDelaySeconds' in state) {
					dissolveState = 'Locked';
					dissolveValue = state.DissolveDelaySeconds.toString();
				} else if ('WhenDissolvedTimestampSeconds' in state) {
					dissolveState = 'Dissolving';
					dissolveValue = state.WhenDissolvedTimestampSeconds.toString();
				}
			}

			return {
				id: n.id.length > 0 ? Buffer.from(n.id[0].id).toString('hex') : null,
				stakedAmount: n.cached_neuron_stake_e8s.toString(),
				stakedMaturity: n.staked_maturity_e8s_equivalent.length > 0 
					? n.staked_maturity_e8s_equivalent[0].toString() 
					: '0',
				createdAt: Number(n.created_timestamp_seconds),
				agingSince: Number(n.aging_since_timestamp_seconds),
				dissolveState,
				dissolveValue,
			};
		});

		return {
			snsRootCanisterId,
			governanceCanisterId,
			neurons,
			count: neurons.length,
		};
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.QUERY_ERROR,
			`Failed to get SNS neurons: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Get SNS token info
 */
export async function getSnsTokenInfo(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const agentCredentials = getAgentCredentials(credentials);
	const snsRootCanisterId = this.getNodeParameter('snsRootCanisterId', itemIndex) as string;

	const agent = await createAgent(agentCredentials);

	try {
		// Get canister summary from root
		const rootActor = createActor<SnsRootService>(
			agent,
			snsRootCanisterId,
			snsRootIdlFactory as any,
		);

		const summary = await rootActor.get_sns_canisters_summary({
			update_canister_list: [],
		});

		const ledgerCanisterId = summary.ledger.length > 0 && 
			summary.ledger[0].canister_id.length > 0
			? summary.ledger[0].canister_id[0].toText()
			: null;

		if (!ledgerCanisterId) {
			throw new Error('Could not find ledger canister for this SNS');
		}

		// For token info, we would need to query the ICRC-1 ledger
		// This is a simplified response
		return {
			snsRootCanisterId,
			ledgerCanisterId,
			note: 'Use ICRC operations with the ledger canister ID to get full token details',
		};
	} catch (error) {
		throw new IcpError(
			ICP_ERROR_CODES.QUERY_ERROR,
			`Failed to get SNS token info: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

// Export aliases for Icp.node.ts compatibility
export {
	listSnsProjects as getSnsProjectsList,
	getSnsProject as getSnsProjectDetails,
	getSnsProposals as getSnsProjectProposals,
	getSnsNeurons as getSnsProjectNeurons,
	getSnsTokenInfo as getSnsProjectTokenInfo,
};
