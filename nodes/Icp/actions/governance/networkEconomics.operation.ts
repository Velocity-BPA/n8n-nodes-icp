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

export const networkEconomicsOperationProperties: INodeProperties[] = [];

interface NetworkEconomics {
	neuron_minimum_stake_e8s: bigint;
	max_neurons_fund_participation_icp_e8s?: [bigint];
	neuron_management_fee_per_proposal_e8s: bigint;
	reject_cost_e8s: bigint;
	transaction_fee_e8s: bigint;
	neuron_spawn_dissolve_delay_seconds: bigint;
	minimum_icp_xdr_rate: bigint;
	maximum_node_provider_rewards_e8s: bigint;
}

export async function getNetworkEconomics(
	this: IExecuteFunctions,
	_itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');

	const agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	const actor = createActor<{
		get_network_economics_parameters: () => Promise<NetworkEconomics>;
	}>(agent, SYSTEM_CANISTERS.governance, nnsGovernanceIdlFactory);

	const result = await actor.get_network_economics_parameters();

	return {
		neuronMinimumStakeE8s: result.neuron_minimum_stake_e8s.toString(),
		neuronMinimumStakeIcp: Number(result.neuron_minimum_stake_e8s) / 100_000_000,
		maxNeuronsFundParticipationE8s: result.max_neurons_fund_participation_icp_e8s?.[0]?.toString() || null,
		neuronManagementFeePerProposalE8s: result.neuron_management_fee_per_proposal_e8s.toString(),
		rejectCostE8s: result.reject_cost_e8s.toString(),
		transactionFeeE8s: result.transaction_fee_e8s.toString(),
		neuronSpawnDissolveDelaySeconds: result.neuron_spawn_dissolve_delay_seconds.toString(),
		minimumIcpXdrRate: result.minimum_icp_xdr_rate.toString(),
		maximumNodeProviderRewardsE8s: result.maximum_node_provider_rewards_e8s.toString(),
	};
}
