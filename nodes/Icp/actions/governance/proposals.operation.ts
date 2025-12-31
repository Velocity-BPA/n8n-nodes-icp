/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, IDataObject, INodeProperties } from 'n8n-workflow';
import { createAgent, createActor } from '../../transport/agent';
import { nnsGovernanceIdlFactory } from '../../transport/candid';
import { SYSTEM_CANISTERS } from '../../constants/canisters';

export const proposalsOperationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['governance'],
			},
		},
		options: [
			{
				name: 'Get Pending Proposals',
				value: 'getPendingProposals',
				description: 'Get proposals that are currently open for voting',
				action: 'Get pending proposals',
			},
			{
				name: 'Get Proposal',
				value: 'getProposal',
				description: 'Get details of a specific proposal',
				action: 'Get proposal',
			},
			{
				name: 'List Proposals',
				value: 'listProposals',
				description: 'List NNS governance proposals',
				action: 'List proposals',
			},
		],
		default: 'listProposals',
	},
	{
		displayName: 'Proposal ID',
		name: 'proposalId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['governance'],
				operation: ['getProposal'],
			},
		},
		description: 'The ID of the proposal to retrieve',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		displayOptions: {
			show: {
				resource: ['governance'],
				operation: ['listProposals', 'getPendingProposals'],
			},
		},
		description: 'Maximum number of proposals to return',
	},
];

interface ProposalInfo {
	id?: [{ id: bigint }];
	status: number;
	topic: number;
	proposer?: [{ id: bigint }];
	proposal_timestamp_seconds: bigint;
	decided_timestamp_seconds: bigint;
	executed_timestamp_seconds: bigint;
}

interface ListProposalsResult {
	proposal_info: ProposalInfo[];
}

export async function listProposals(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const limit = this.getNodeParameter('limit', itemIndex, 10) as number;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const actor = createActor<{
		list_proposals: (args: {
			include_reward_status: number[];
			omit_large_fields: boolean[];
			before_proposal: { id: bigint }[];
			limit: number;
			exclude_topic: number[];
			include_all_manage_neuron_proposals: boolean[];
			include_status: number[];
		}) => Promise<ListProposalsResult>;
	}>(agent, SYSTEM_CANISTERS.governance, nnsGovernanceIdlFactory);

	const result = await actor.list_proposals({
		include_reward_status: [],
		omit_large_fields: [true],
		before_proposal: [],
		limit,
		exclude_topic: [],
		include_all_manage_neuron_proposals: [],
		include_status: [],
	});

	const proposals = (result.proposal_info || []).map((p: ProposalInfo) => formatProposal(p));

	return {
		proposals,
		totalCount: proposals.length,
	};
}

export async function getProposalInfo(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const proposalId = this.getNodeParameter('proposalId', itemIndex) as string;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const actor = createActor<{
		get_proposal_info: (id: bigint) => Promise<[ProposalInfo] | []>;
	}>(agent, SYSTEM_CANISTERS.governance, nnsGovernanceIdlFactory);

	const result = await actor.get_proposal_info(BigInt(proposalId));

	if (!result || result.length === 0) {
		return {
			found: false,
			proposalId,
		};
	}

	return {
		found: true,
		proposal: formatProposal(result[0]),
	};
}

export async function getPendingProposals(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const limit = this.getNodeParameter('limit', itemIndex, 10) as number;

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const actor = createActor<{
		list_proposals: (args: {
			include_reward_status: number[];
			omit_large_fields: boolean[];
			before_proposal: { id: bigint }[];
			limit: number;
			exclude_topic: number[];
			include_all_manage_neuron_proposals: boolean[];
			include_status: number[];
		}) => Promise<ListProposalsResult>;
	}>(agent, SYSTEM_CANISTERS.governance, nnsGovernanceIdlFactory);

	const result = await actor.list_proposals({
		include_reward_status: [],
		omit_large_fields: [true],
		before_proposal: [],
		limit,
		exclude_topic: [],
		include_all_manage_neuron_proposals: [],
		include_status: [1], // Open proposals only
	});

	const proposals = (result.proposal_info || []).map((p: ProposalInfo) => formatProposal(p));

	return {
		proposals,
		totalCount: proposals.length,
	};
}

function formatProposal(proposal: ProposalInfo): IDataObject {
	return {
		id: proposal.id?.[0]?.id?.toString() || null,
		status: proposal.status,
		topic: proposal.topic,
		proposer: proposal.proposer?.[0]?.id?.toString() || null,
		proposalTimestampSeconds: proposal.proposal_timestamp_seconds?.toString() || null,
		decidedTimestampSeconds: proposal.decided_timestamp_seconds?.toString() || null,
		executedTimestampSeconds: proposal.executed_timestamp_seconds?.toString() || null,
	};
}

// Export alias for Icp.node.ts compatibility
export { getProposalInfo as getProposal };
