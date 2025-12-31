# n8n-nodes-icp

> [Velocity BPA Licensing Notice]
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for Internet Computer Protocol (ICP) blockchain, providing 8 resource categories and 60+ operations for interacting with canisters, ledger, governance, tokens, and more.

![n8n](https://img.shields.io/badge/n8n-community--node-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-blue)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![ICP](https://img.shields.io/badge/ICP-Internet%20Computer-29ABE2)

## Features

- **Ledger Operations**: Get balances, transfer ICP, query blocks and transactions via Rosetta API
- **Canister Interactions**: Query and update canisters, manage lifecycle, install/upgrade code
- **NNS Governance**: List proposals, query neurons, get network economics
- **SNS Support**: Interact with Service Nervous System projects and tokens
- **ICRC Token Standards**: Full ICRC-1, ICRC-2, and ICRC-3 support for fungible tokens
- **Identity Management**: Principal derivation, account identifiers, subaccount generation
- **Cycles Management**: Check balances, convert ICP to cycles, top up canisters
- **Management Canister**: Create canisters, ECDSA signing, HTTP outcalls, Bitcoin integration
- **Event Triggers**: Monitor transactions, balances, canister status, and governance proposals

## Installation

### Community Nodes (Recommended)

1. Open n8n
2. Go to **Settings** > **Community Nodes**
3. Search for `n8n-nodes-icp`
4. Click **Install**

### Manual Installation

```bash
# Navigate to your n8n installation
cd ~/.n8n

# Install the package
npm install n8n-nodes-icp
```

### Development Installation

```bash
# Clone or extract the package
git clone https://github.com/Velocity-BPA/n8n-nodes-icp.git
cd n8n-nodes-icp

# Install dependencies
npm install

# Build the project
npm run build

# Link to n8n
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-icp

# Restart n8n
n8n start
```

## Credentials Setup

### ICP Agent Credentials

Used for canister interactions, governance, SNS, ICRC, cycles, and management operations.

| Field | Description | Example |
|-------|-------------|---------|
| Network | IC network endpoint | Mainnet / Local / Custom URL |
| Identity Type | Key type for signing | Ed25519 / Secp256k1 / Anonymous |
| Private Key | Private key in PEM or hex format | `-----BEGIN PRIVATE KEY-----...` |
| Principal ID | Your IC principal (auto-derived) | `xxxxx-xxxxx-xxxxx-xxxxx-cai` |

### ICP Rosetta Credentials

Used for ledger operations (balance, transfers, transactions).

| Field | Description | Example |
|-------|-------------|---------|
| Rosetta URL | Rosetta API endpoint | `https://rosetta-api.internetcomputer.org` |
| Network Identifier | Blockchain network | `Internet Computer` / `00000000000000020101` |

## Resources & Operations

### Ledger Resource (Rosetta API)

| Operation | Description |
|-----------|-------------|
| Get Balance | Get ICP balance for an account |
| Transfer ICP | Send ICP tokens |
| Get Block | Retrieve block by index |
| Get Block Transaction | Get transaction within a block |
| Search Transactions | Search with filters |
| Get Account Transactions | Get transactions for account |
| Get Network Status | Current network state |
| Get Network Options | Available operations and errors |
| Derive Account | Derive account ID from public key |

### Canister Resource

| Operation | Description |
|-----------|-------------|
| Query | Read-only canister call |
| Update | State-changing canister call |
| Get Status | Canister status and memory |
| Get Info | Detailed canister information |
| Get Module Hash | WASM module hash |
| Get Controllers | List controllers |
| Get Cycles Balance | Current cycles balance |
| Install Code | Deploy WASM module |
| Upgrade Code | Upgrade canister code |
| Uninstall Code | Remove canister code |
| Start/Stop/Delete Canister | Lifecycle management |

### Governance Resource (NNS)

| Operation | Description |
|-----------|-------------|
| List Proposals | Get NNS proposals with filters |
| Get Proposal | Get proposal details |
| Get Pending Proposals | Active proposals |
| List Neurons | Query neurons |
| Get Neuron | Neuron details |
| Get Known Neurons | Named neurons |
| Get Network Economics | Economic parameters |

### SNS Resource

| Operation | Description |
|-----------|-------------|
| List SNS Projects | All SNS DAOs |
| Get SNS Project | Project details |
| Get SNS Proposals | DAO proposals |
| Get SNS Neurons | DAO neurons |
| Get SNS Token Info | Token metadata |

### ICRC Token Resource

| Operation | Description |
|-----------|-------------|
| Get Metadata | Token name, symbol, decimals |
| Get Balance | Token balance (ICRC-1) |
| Transfer | Send tokens (ICRC-1) |
| Approve | Approve spender (ICRC-2) |
| Transfer From | Delegated transfer (ICRC-2) |
| Get Allowance | Check approval (ICRC-2) |
| Get Transactions | Transaction history (ICRC-3) |

### Identity Resource

| Operation | Description |
|-----------|-------------|
| Get Principal | Principal from credentials |
| Get Account Identifier | Derive account ID |
| Derive Subaccount | Generate subaccount |
| Validate Principal | Check principal format |
| Convert Account Format | Hex/ICRC-1/bytes conversion |

### Cycles Resource

| Operation | Description |
|-----------|-------------|
| Get Balance | Canister cycles balance |
| Convert ICP to Cycles | Mint cycles |
| Top Up Canister | Add cycles to canister |
| Get Cycles Price | Current conversion rate |

### Management Canister Resource

| Operation | Description |
|-----------|-------------|
| Create Canister | Deploy new canister |
| Update Settings | Modify canister settings |
| Get ECDSA Public Key | Threshold ECDSA |
| Sign with ECDSA | Sign message hash |
| HTTP Request | HTTP outcall |
| Get Bitcoin Balance | BTC balance via IC |
| Get Bitcoin UTXOs | Unspent outputs |
| Send Bitcoin | Broadcast transaction |
| Get Random Bytes | IC randomness |

## Trigger Node

The **Internet Computer Trigger** monitors blockchain events:

| Event | Description |
|-------|-------------|
| New Transaction | New transaction for account |
| Balance Changed | Account balance change |
| Large Transfer Alert | Transfer above threshold |
| Canister Status Changed | Running/stopped state change |
| Cycles Low Alert | Cycles below threshold |
| New Proposal | New governance proposal |
| Proposal Status Changed | Proposal state update |

## Usage Examples

### Query Canister State

```javascript
// Get greeting from a canister
Resource: Canister
Operation: Query
Canister ID: rrkah-fqaaa-aaaaa-aaaaq-cai
Method Name: greet
Arguments: ["World"]
```

### Transfer ICP Tokens

```javascript
// Send ICP via Rosetta
Resource: Ledger
Operation: Transfer ICP
From Account: <64-char hex account ID>
To Account: <64-char hex account ID>
Amount: 1.5
Fee: 0.0001
```

### Get ICRC Token Balance

```javascript
// Check token balance
Resource: ICRC Token
Operation: Get Balance
Token Canister ID: ryjl3-tyaaa-aaaaa-aaaba-cai
Owner Principal: xxxxx-xxxxx-xxxxx-xxxxx-cai
```

### Monitor Governance Proposals

```javascript
// Trigger on new proposals
Event: New Proposal
Topic Filter: Governance, Network Economics
```

### Deploy Canister

```javascript
// Install code on canister
Resource: Canister
Operation: Install Code
Canister ID: xxxxx-xxxxx-xxxxx-xxxxx-cai
WASM Module: <hex encoded wasm>
Init Arguments: []
```

## ICP Concepts

| Concept | Description |
|---------|-------------|
| **Principal** | Identity on IC (format: `xxxxx-xxxxx-xxxxx-xxxxx-cai`) |
| **Canister** | Smart contract on Internet Computer |
| **Candid** | Interface Description Language for IC |
| **Cycles** | Computational resource (like gas) |
| **NNS** | Network Nervous System (IC governance) |
| **SNS** | Service Nervous System (dApp governance) |
| **Account Identifier** | 32-byte ledger account (64-char hex) |
| **Subaccount** | Account subdivision (32 bytes) |
| **ICRC** | Token standards (ICRC-1, ICRC-2, ICRC-3) |

## Networks

| Network | IC URL | Rosetta URL |
|---------|--------|-------------|
| Mainnet | `https://ic0.app` | `https://rosetta-api.internetcomputer.org` |
| Local | `http://localhost:4943` | `http://localhost:8080` |

## Error Handling

The node provides detailed error messages for common issues:

| Error Code | Description |
|------------|-------------|
| `AGENT_ERROR` | IC agent communication failure |
| `CANISTER_ERROR` | Canister call rejected |
| `INSUFFICIENT_FUNDS` | Not enough ICP/cycles |
| `INVALID_PRINCIPAL` | Malformed principal ID |
| `INVALID_ACCOUNT` | Invalid account identifier |
| `NETWORK_ERROR` | Network connectivity issue |
| `CANDID_ERROR` | Encoding/decoding failure |

## Security Best Practices

1. **Never commit private keys** - Use n8n credentials
2. **Use environment variables** - For sensitive configuration
3. **Limit controller access** - Minimal canister controllers
4. **Monitor cycles** - Set up low cycles alerts
5. **Verify canister IDs** - Double-check before transactions
6. **Test on local replica** - Before mainnet deployment

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Fix lint issues
npm run lint:fix
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service,
or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-icp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Velocity-BPA/n8n-nodes-icp/discussions)
- **Email**: support@velobpa.com

## Acknowledgments

- [DFINITY Foundation](https://dfinity.org) - Internet Computer Protocol
- [n8n](https://n8n.io) - Workflow automation platform
- [@dfinity/agent](https://www.npmjs.com/package/@dfinity/agent) - IC JavaScript agent
