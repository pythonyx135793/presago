# Presago

![CI](https://github.com/Presago-Labs/presago/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Stellar](https://img.shields.io/badge/Stellar-Soroban-7D00FF?logo=stellar&logoColor=white)

Presago is a prediction-market project built with Soroban smart contracts on Stellar and a lightweight static HTML frontend.

The frontend uses plain HTML, CSS, and JavaScript. It does not require Node.js, Next.js, React, npm, or a build step.

## Table of Contents

- [How it uses Stellar](#how-it-uses-stellar)
- [Current status](#current-status)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Run the static frontend](#run-the-static-frontend)
- [Frontend files](#frontend-files)
- [Connect a wallet](#connect-a-wallet)
- [Smart contracts](#smart-contracts)
- [Testnet deployment](#testnet-deployment)
- [Scripts reference](#scripts-reference)
- [Security](#security)
- [Environment variables](#environment-variables)

## How it uses Stellar

Presago runs prediction markets on **Stellar** with **Soroban** smart contracts: pools, positions, referrals, and leaderboard rewards are contract state, and the static frontend connects to Freighter and submits `place_bet` invocations to Stellar Testnet. Live contract addresses are listed above.

## Current status

The Soroban contracts are deployed and initialized on Stellar Testnet. The static frontend displays live public Stellar network data and XLM pricing, connects to Freighter, and submits positions for verified Testnet market #3 directly to the deployed prediction-market contract. The other market cards remain clearly labeled demonstrations.

### Testnet contracts

| Contract | Testnet address |
| --- | --- |
| Prediction Market | `CAPCAPWPGPOCENAJFYYIE22WYNFEDVZ3CT73M5MAKILFMBQ5TN2MIS6T` |
| PRESAGO Token | `CBYUQUXPGWUQRV7STCV3YPVLWNTFJHKLEAG7LVAOK7H4FIFJGZW5P476` |
| Referral Registry | `CCKVUVYXR6FBB4VFYGDF3IDDUVBRJGKPDDRABTZYKI2LKAJNVLF3TTQ2` |
| Leaderboard | `CCMNYMUI4XMDBTTMM7E6KNQFF3OVKS3Q2ERJ4EVQGCLW4VQCGUGG2AQM` |

Testnet deployer: `GC5D4ENQ3U3Q23L5RUG2GGIDFFVKOVJ6GUFJRTNIQ6SRP5J7RMECKSL7`

The deployment output is stored locally in the ignored `deploy-output.json` file. Contract activity can be inspected with [Stellar Expert Testnet](https://stellar.expert/explorer/testnet).

## Repository layout

- `contracts/` — Rust/Soroban contracts for markets, rewards, referrals, and leaderboards.
- `frontend/` — static HTML, CSS, and JavaScript website.
- `scripts/` — testnet/mainnet deployment and smoke-test scripts.
- `docs/` — contract invocation examples and technical documentation.

## Prerequisites

| Tool | Notes |
| --- | --- |
| **Python 3** | to serve the static frontend |
| **Freighter** | browser wallet on Stellar Testnet |
| **Rust + Stellar CLI** | only for the contracts workspace |

## Run the static frontend

Opening `frontend/index.html` directly works for most UI features. A local HTTP server is recommended because browsers may restrict API requests from `file://` pages.

Using Python:

```bash
cd frontend
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

You can also use the VS Code Live Server extension or deploy the contents of `frontend/` to any static host.

## Frontend files

- `frontend/index.html` — page structure and inline SVG icon library.
- `frontend/markets.html` — searchable and filterable market catalog.
- `frontend/leaderboard.html` — community ranking page.
- `frontend/styles.css` — core theme and responsive layout.
- `frontend/product.css` — trading workspace, dashboard, FAQ, and expanded product sections.
- `frontend/pages.css` — shared styling for dedicated application pages.
- `frontend/script.js` — live data, market filters, Testnet order flow, simulations, and dashboard interactions.
- `frontend/soroban.js` — Soroban simulation, signing, submission, confirmation polling, and contract errors.
- `frontend/pages.js` — market catalog and leaderboard rendering.
- `frontend/wallet.js` — Freighter connection, testnet validation, balance display, and Friendbot funding.

## Connect a wallet

1. Install the [Freighter browser extension](https://www.freighter.app/).
2. Open Freighter and switch its network to **Testnet**.
3. Serve the frontend over HTTP and select **Connect wallet**.
4. Approve access in Freighter.
5. If the testnet account is empty, use the **Fund** action to request free test XLM from Friendbot.

The wallet integration uses the official `@stellar/freighter-api` package as a pinned browser module. The site never receives or stores the wallet secret key. Freighter asks the user for approval and exposes only the selected public address.

### Place a Testnet position

1. Connect a funded Freighter account on Testnet.
2. Select the market labeled **Testnet #3**.
3. Choose YES or NO and enter at least 1 test XLM.
4. Review and approve the exact contract transaction in Freighter.
5. Wait for confirmation, then open the transaction from the dashboard in Stellar Expert.

The browser loads the source account, builds a `place_bet` invocation, simulates it through Stellar RPC, asks Freighter to sign the prepared XDR, submits it to Testnet, and polls until the ledger confirms success. A failed or cancelled wallet request is never displayed as a completed position.

The page retrieves:

- Stellar ledger information from public Horizon APIs.
- XLM/USD market information from CoinGecko.

If a public API is unavailable, the interface displays an unavailable state instead of fabricated live values.

## Smart contracts

The Soroban workspace contains four contracts:

- `prediction_market` — market creation, YES/NO bets, resolution, claims, cancellations, refunds, and fees.
- `PRESAGO_token` — reward token and authorized minters.
- `referral_registry` — user registration, referrals, and bonuses.
- `leaderboard` — points, win/loss statistics, rankings, and token rewards.

### Contract tests

Install Rust and Stellar CLI, then run:

```bash
cd contracts
cargo test --workspace
```

The current contract suite contains 89 passing tests.

## Testnet deployment

The deployment script uses the ignored `.deploy.env` file and free Friendbot test XLM:

```bash
bash scripts/deploy-testnet.sh
```

The script:

1. Builds optimized WASM artifacts.
2. Funds the deployer on testnet.
3. Deploys all four contracts.
4. Initializes and connects the contracts.
5. Configures token-minter permissions.
6. Writes the public deployment details to `deploy-output.json`.

Run the end-to-end contract workflow with:

```bash
bash scripts/smoke-test.sh
```

The smoke test creates temporary Friendbot-funded users and checks registration, betting, cancellation, refunds, resolution, claims, token rewards, fees, and leaderboard data.

## Scripts reference

Run the commands below from the repository root. Deployment and upgrade scripts need Bash, Stellar CLI, `curl`, Python 3, and the relevant Rust/WASM build tools; they change network state and may change local Stellar keystore identities. Frontend validation uses Node.js with `import.meta.dirname` support and needs no package installation.

| File | Purpose | Required inputs and prerequisites | Confirmation |
| --- | --- | --- | --- |
| [`scripts/deploy-testnet.sh`](scripts/deploy-testnet.sh) | Build, deploy, initialize and connect the four Testnet contracts; write ignored `deploy-output.json`. | `.deploy.env` containing `DEPLOYER_SECRET`; optional `RESOLVER_PUBLIC_KEY` and `SPONSOR_SECRET`. Rust **1.91.1** and the `wasm32v1-none` target. Imports/replaces the local **`PULSE-deployer`** identity and requests Friendbot funds. | None; running `bash scripts/deploy-testnet.sh` begins the workflow. |
| [`scripts/deploy-mainnet.sh`](scripts/deploy-mainnet.sh) | Deploy and initialize all four contracts on Mainnet; write ignored `deploy-mainnet-output.json`. | Existing **`PULSE-deployer`** keystore identity funded on Mainnet; WASM files under `contracts/target/wasm32v1-none/release/` (the script attempts a build if any is missing). Its header requires at least **10 XLM** and estimates 7–10 XLM in deployment fees; the current executable balance guard rejects balances below 8 XLM. Verify deployed IDs before updating frontend configuration. | Exact phrase **`deploy mainnet`**. |
| [`scripts/create-mainnet-markets.sh`](scripts/create-mainnet-markets.sh) | Create the seed markets listed in `mainnet-markets.json` on Mainnet. | Successful Mainnet deployment and `deploy-mainnet-output.json` with `contracts.market` and `deployer`; **`PULSE-deployer`** identity and enough Mainnet XLM for transaction fees. Review the questions and durations in the JSON first, including the schema mismatch noted below. | Exact phrase **`create`**. |
| [`scripts/smoke-test.sh`](scripts/smoke-test.sh) | Exercise registration, markets, bets, refunds, resolution, claims, rewards, fee withdrawal and leaderboard behavior on Testnet. | **`deploy-output.json` from a successful Testnet deployment** and the **`PULSE-deployer`** identity. Run from the repository root because the JSON reads use a relative path. Creates Friendbot-funded `smoke-alice`, `smoke-bob` and `smoke-charlie` identities, then removes them on normal completion. | None; running `bash scripts/smoke-test.sh` begins the workflow. |
| [`scripts/upgrade-gas-reduction.sh`](scripts/upgrade-gas-reduction.sh) | Install new WASM and upgrade `leaderboard` and `referral_registry` in place, followed by read-only checks. | `bash scripts/upgrade-gas-reduction.sh testnet` or `mainnet`; **`PULSE-deployer`** must be the contract admin and both WASM files must already be built. Testnet requires `LEADERBOARD_ID`, `REFERRAL_ID` and `ADMIN`. Mainnet uses the script’s default contract IDs, optionally overridden by `LEADERBOARD_ID`/`REFERRAL_ID`, and its configured admin; Mainnet fees use real XLM. | Mainnet: exact **`UPGRADE`**; Testnet: none. |
| [`scripts/validate-frontend.mjs`](scripts/validate-frontend.mjs) | Check vendored integrity, frontend metadata, duplicate HTML IDs, local asset references, retired branding and possible secret/seed strings. | `node scripts/validate-frontend.mjs`; Node.js, the `frontend/` tree and its vendor manifest/files. No environment variables or keystore identity. | None; read-only validation. |
| [`scripts/verify-vendor-integrity.mjs`](scripts/verify-vendor-integrity.mjs) | Verify package byte sizes and canonical base64 SHA-256/SHA-384 SRI values against the actual vendored bytes. | `node scripts/verify-vendor-integrity.mjs`; Node.js and `frontend/vendor/integrity.json` with its referenced vendor files. No environment variables or keystore identity. | None; read-only validation. |
| [`scripts/verify-vendor-integrity.test.mjs`](scripts/verify-vendor-integrity.test.mjs) | Run the offline vendor-verifier regression tests, including changed bytes, malformed digests, missing files and out-of-directory paths. | `node --test scripts/verify-vendor-integrity.test.mjs`; Node.js. Uses temporary fixtures and removes them after each test. No network, environment variables or keystore identity required. | None. |
| [`scripts/update-accent-names.ps1`](scripts/update-accent-names.ps1) | Historical PowerShell utility for renaming `accent-green` to `accent-mint` in the former `frontend/src` layout, creating `.bak` copies before editing files. | PowerShell and that former `frontend/src` tree, which is absent from the current static frontend. It is not part of the current frontend workflow; no maintainer decision to retire or remove it is assumed. | None; when its target tree exists it edits matching source files. |
| [`scripts/mainnet-markets.json`](scripts/mainnet-markets.json) | Data input for Mainnet market creation; contains seven proposed markets. | Review `id`, `category`, `question`, `image_url`, `duration_secs`, `resolves`, `days` and `note` before using `create-mainnet-markets.sh`. This is configuration data, not an executable script. | The consuming script asks for **`create`**. |

### Deployment prerequisites to resolve

- The deployment and upgrade scripts reference a `contracts/` workspace, but it is absent from this checkout. Supply the intended Soroban workspace and build outputs before using them; this reference does not imply that deployment is currently runnable.
- `mainnet-markets.json` uses `days`, while the creation script reads `duration_days` in Python fallback expressions. Reconcile those field names before running market creation, even when `duration_secs` or `resolves` is present, because Python evaluates the fallback argument first.
- The existing keystore alias is named `PULSE-deployer` in the scripts despite the project’s current Presago name. Use the exact existing alias; do not put secret keys in README, command history or committed files.

## Security

- Never commit `.deploy.env`, secret keys, seed phrases, or wallet exports.
- Contract IDs and public account addresses are safe to publish.
- Wallet connection, balance lookup, and positions on market #3 are real Testnet operations. All other market cards remain simulations and are labeled accordingly.

## Environment variables

Copy `.env.example` to `.env` and fill in your values (see the file for inline docs). Key groups:

| Variable group | Key variables |
| --- | --- |
| Deployment | `DEPLOYER_SECRET`, `SPONSOR_SECRET`, `RESOLVER_PUBLIC_KEY` (in `.deploy.env`, never committed) |

## License

This project is licensed under the MIT License.
