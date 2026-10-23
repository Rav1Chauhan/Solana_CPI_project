# Solana CPI Counter

A small Solana program demonstrating Cross-Program Invocation (CPI) using Rust, Borsh, LiteSVM, and Solana Devnet.

## Architecture

- **Target program** (`src/lib.rs`): Stores a 4-byte Borsh `u32` counter. Changes 0 to 1 on the first call and doubles it on subsequent calls using checked arithmetic.
- **CPI caller** (`cpi-contract/src/lib.rs`): Builds an instruction and invokes the target program using `invoke()`.
- **Client tests** (`client/`): LiteSVM tests cover counter transitions, CPI invocation, and a failed CPI with unchanged state.
- **Devnet client** (`client/devnet-cpi.ts`): Sends a CPI transaction and verifies the updated counter through the Solana CLI.

## Deployed Devnet Programs

| Program | Program ID |
|---|---|
| Target counter program | `DzLGQQPYMcs6nWLQZJk8MwzkTQLb94caqcdgeSzwqfhW` |
| CPI caller program | `7zNZJhq15K5j6SoxEmZdY8qbVnhVQRZJFLChDyFUeTrX` |

If you redeploy with different keypairs, update these IDs in the README and client script.

## Devnet Transaction Evidence

- **0 → 1:** [View transaction](https://explorer.solana.com/tx/4n6yQhc2ChTwuMH7FbxjasmsmN99SGJ4rF8Yn54TqXrqmz7i8jFsFurUMpaAekSznmkUCQcn3co4ESkm4iRzCwQs?cluster=devnet)
- **1 → 2:** [View transaction](https://explorer.solana.com/tx/4L92hdJYN31FaiJhcbqTuXeXVfkEHfPnpiZvhLW292Z6uoDJb2r49HBB6SfSkuXRMjXMf8cso9LwquZEqCd6MpyB?cluster=devnet)
- **2 → 4:** [View transaction](https://explorer.solana.com/tx/46FYQ8Yct68ktLecYJFNXwRZbPXWmKCPgAppm1PBTqUXB7VcDyARivKhRySNKtyWVHPvDHFM77Ha5EXecAdgwk4v?cluster=devnet)

The account data was verified using `solana account`. The recorded counter values were 1, 2, and 4. Check the Explorer links for current transaction status before using them in a public presentation.

## Requirements

- Rust toolchain and Solana CLI
- `cargo build-sbf`
- Bun
- Dependencies installed in `client/package.json`
- A configured Solana CLI wallet with Devnet SOL

## Build Programs

From the project root:

```bash
cargo build-sbf --sbf-out-dir target/deploy
```

Build the CPI caller:

```bash
cd cpi-contract
cargo build-sbf --sbf-out-dir target/deploy
```

## Run Local Tests

```bash
cd client
bun install
bun test
```

Expected result from the development run: **3 pass, 0 fail**.

## Run a Devnet CPI Call

Ensure your Solana CLI is configured for Devnet and your wallet has enough Devnet SOL.

```bash
solana config get
cd client
bun run devnet-cpi.ts
```

The script reads the existing counter, submits one CPI transaction, and checks for the expected updated value. It does not create a new counter account.

## Security and Limitations

- This is a learning/demo project and has not been audited.
- The target instruction accepts empty instruction data and changes 0 to 1; otherwise it doubles the counter.
- The caller assumes the target program and account layout match the expected contract.
- Never commit wallet secret keys, `~/.config/solana/id.json`, `.env` files, or generated program keypair files.
- LiteSVM tests run locally; Devnet transactions provide separate evidence of deployed behavior.
