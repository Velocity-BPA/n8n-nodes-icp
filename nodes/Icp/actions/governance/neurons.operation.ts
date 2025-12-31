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

export const neuronsOperationProperties: INodeProperties[] = [
	{
		displayName: 'Neuron ID',
		name: 'neuronId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['governance'],
				operation: ['getNeuron'],
			},
		},
		description: 'The ID of the neuron to retrieve',
	},
];

interface KnownNeuron {
	id?: [{ id: bigint }];
	known_neuron_data?: [{
		name: string;
		description?: [string];
	}];
}

interface ListKnownNeuronsResult {
	known_neurons: KnownNeuron[];
}

export async function listNeurons(
	this: IExecuteFunctions,
	_itemIndex: number,
): Promise<IDataObject> {
	// Note: Listing all neurons requires neuron ownership
	// This returns a placeholder with instructions
	return {
		neurons: [],
		note: 'Listing neurons requires neuron ownership. Use getNeuron with a specific neuron ID.',
	};
}

export async function getNeuronInfo(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('icpAgentApi');
	const neuronId = this.getNodeParameter('neuronId', itemIndex) as string;

	// Agent created for future implementation
	const _agent = await createAgent({
		network: credentials.network as string,
		customNetworkUrl: credentials.customNetworkUrl as string | undefined,
		identityType: credentials.identityType as 'ed25519' | 'secp256k1' | 'anonymous',
		privateKey: credentials.privateKey as string | undefined,
	});

	// Note: get_neuron_info requires being a hotkey of the neuron
	// This is a simplified implementation
	return {
		neuronId,
		note: 'Getting neuron info requires being a hotkey or controller of the neuron.',
	};
}

export async function listKnownNeurons(
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
		list_known_neurons: () => Promise<ListKnownNeuronsResult>;
	}>(agent, SYSTEM_CANISTERS.governance, nnsGovernanceIdlFactory);

	const result = await actor.list_known_neurons();

	const knownNeurons = (result.known_neurons || []).map((n: KnownNeuron) => ({
		id: n.id?.[0]?.id?.toString() || null,
		name: n.known_neuron_data?.[0]?.name || null,
		description: n.known_neuron_data?.[0]?.description?.[0] || null,
	}));

	return {
		knownNeurons,
		totalCount: knownNeurons.length,
	};
}

// Export aliases for Icp.node.ts compatibility
export { getNeuronInfo as getNeuron };
export { listKnownNeurons as getKnownNeurons };
