/**
 * Integration Tests for ICP Node
 *
 * Copyright © 2025 Velocity BPA. All rights reserved.
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 *
 * Note: These tests require a running IC replica or access to mainnet.
 * Set environment variables IC_URL and IC_PRIVATE_KEY for testing.
 */

import { Icp } from '../../nodes/Icp/Icp.node';
import { IcpTrigger } from '../../nodes/Icp/IcpTrigger.node';

describe('Icp Node', () => {
	let icpNode: Icp;

	beforeEach(() => {
		icpNode = new Icp();
	});

	describe('Node Description', () => {
		it('should have correct display name', () => {
			expect(icpNode.description.displayName).toBe('Internet Computer');
		});

		it('should have correct name', () => {
			expect(icpNode.description.name).toBe('icp');
		});

		it('should have all required resources', () => {
			const resourceOptions = icpNode.description.properties.find(
				(p) => p.name === 'resource',
			);
			expect(resourceOptions).toBeDefined();

			const values = (resourceOptions as { options: Array<{ value: string }> })?.options.map((o) => o.value);
			expect(values).toContain('ledger');
			expect(values).toContain('canister');
			expect(values).toContain('governance');
			expect(values).toContain('sns');
			expect(values).toContain('icrc');
			expect(values).toContain('identity');
			expect(values).toContain('cycles');
			expect(values).toContain('management');
		});

		it('should have correct credentials configuration', () => {
			const creds = icpNode.description.credentials;
			expect(creds).toBeDefined();
			expect(creds?.find((c) => c.name === 'icpAgentApi')).toBeDefined();
			expect(creds?.find((c) => c.name === 'icpRosettaApi')).toBeDefined();
		});
	});

	describe('Ledger Operations', () => {
		it('should have all ledger operations', () => {
			const operations = icpNode.description.properties.find(
				(p) => p.name === 'operation' && 
				(p.displayOptions as { show?: { resource?: string[] } })?.show?.resource?.includes('ledger'),
			);
			expect(operations).toBeDefined();

			const values = (operations as { options: Array<{ value: string }> })?.options.map((o) => o.value);
			expect(values).toContain('getBalance');
			expect(values).toContain('transfer');
			expect(values).toContain('getBlock');
			expect(values).toContain('getBlockTransaction');
			expect(values).toContain('searchTransactions');
			expect(values).toContain('getAccountTransactions');
			expect(values).toContain('getNetworkStatus');
			expect(values).toContain('getNetworkOptions');
			expect(values).toContain('deriveAccount');
		});
	});

	describe('Canister Operations', () => {
		it('should have all canister operations', () => {
			const operations = icpNode.description.properties.find(
				(p) => p.name === 'operation' && 
				(p.displayOptions as { show?: { resource?: string[] } })?.show?.resource?.includes('canister'),
			);
			expect(operations).toBeDefined();

			const values = (operations as { options: Array<{ value: string }> })?.options.map((o) => o.value);
			expect(values).toContain('query');
			expect(values).toContain('update');
			expect(values).toContain('getStatus');
			expect(values).toContain('installCode');
			expect(values).toContain('startCanister');
			expect(values).toContain('stopCanister');
		});
	});

	describe('ICRC Operations', () => {
		it('should have all ICRC token operations', () => {
			const operations = icpNode.description.properties.find(
				(p) => p.name === 'operation' && 
				(p.displayOptions as { show?: { resource?: string[] } })?.show?.resource?.includes('icrc'),
			);
			expect(operations).toBeDefined();

			const values = (operations as { options: Array<{ value: string }> })?.options.map((o) => o.value);
			expect(values).toContain('getMetadata');
			expect(values).toContain('getBalance');
			expect(values).toContain('transfer');
			expect(values).toContain('approve');
			expect(values).toContain('transferFrom');
			expect(values).toContain('getAllowance');
			expect(values).toContain('getTransactions');
		});
	});

	describe('Management Operations', () => {
		it('should have all management operations', () => {
			const operations = icpNode.description.properties.find(
				(p) => p.name === 'operation' && 
				(p.displayOptions as { show?: { resource?: string[] } })?.show?.resource?.includes('management'),
			);
			expect(operations).toBeDefined();

			const values = (operations as { options: Array<{ value: string }> })?.options.map((o) => o.value);
			expect(values).toContain('createCanister');
			expect(values).toContain('updateSettings');
			expect(values).toContain('getEcdsaPublicKey');
			expect(values).toContain('signWithEcdsa');
			expect(values).toContain('httpRequest');
			expect(values).toContain('getBitcoinBalance');
			expect(values).toContain('getBitcoinUtxos');
			expect(values).toContain('sendBitcoin');
		});
	});
});

describe('IcpTrigger Node', () => {
	let triggerNode: IcpTrigger;

	beforeEach(() => {
		triggerNode = new IcpTrigger();
	});

	describe('Node Description', () => {
		it('should have correct display name', () => {
			expect(triggerNode.description.displayName).toBe('Internet Computer Trigger');
		});

		it('should have correct name', () => {
			expect(triggerNode.description.name).toBe('icpTrigger');
		});

		it('should be a polling trigger', () => {
			expect(triggerNode.description.polling).toBe(true);
		});

		it('should have all required events', () => {
			const eventOptions = triggerNode.description.properties.find(
				(p) => p.name === 'event',
			);
			expect(eventOptions).toBeDefined();

			const values = (eventOptions as { options: Array<{ value: string }> })?.options.map((o) => o.value);
			expect(values).toContain('newTransaction');
			expect(values).toContain('balanceChanged');
			expect(values).toContain('largeTransfer');
			expect(values).toContain('canisterStatusChanged');
			expect(values).toContain('cyclesLowAlert');
			expect(values).toContain('newProposal');
			expect(values).toContain('proposalStatusChanged');
		});
	});
});

describe('Rosetta Transport', () => {
	it('should export required functions', async () => {
		const rosetta = await import('../../nodes/Icp/transport/rosetta');
		
		expect(rosetta.createRosettaClient).toBeDefined();
		expect(rosetta.getAccountBalance).toBeDefined();
		expect(rosetta.getBlock).toBeDefined();
		expect(rosetta.searchTransactions).toBeDefined();
		expect(rosetta.getNetworkStatus).toBeDefined();
	});
});

describe('Agent Transport', () => {
	it('should export required functions', async () => {
		const agent = await import('../../nodes/Icp/transport/agent');
		
		expect(agent.createAgent).toBeDefined();
		expect(agent.callCanister).toBeDefined();
		expect(agent.updateCanister).toBeDefined();
		expect(agent.createIdentity).toBeDefined();
	});
});
