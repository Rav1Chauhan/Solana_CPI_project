
import { readFileSync } from "node:fs";

import {
  AccountRole,
  address,
  createClient,
  createKeyPairSignerFromBytes,
} from "@solana/kit";

import { solanaDevnetRpc } from "@solana/kit-plugin-rpc";
import { signer } from "@solana/kit-plugin-signer";

const CALLER_PROGRAM = address(
  "7zNZJhq15K5j6SoxEmZdY8qbVnhVQRZJFLChDyFUeTrX",
);

const TARGET_PROGRAM = address(
  "DzLGQQPYMcs6nWLQZJk8MwzkTQLb94caqcdgeSzwqfhW",
);

const COUNTER_ACCOUNT = address(
  "ftrjruDgmdhVDrJFHnMgogybF2SVZxsztCfQp4eCgah",
);

async function main() {
  const keypairPath =
    `${process.env.HOME}/.config/solana/id.json`;

  const secretKey = new Uint8Array(
    JSON.parse(readFileSync(keypairPath, "utf8")),
  );

  const payer = await createKeyPairSignerFromBytes(secretKey);

  const client = createClient()
    .use(signer(payer))
    .use(solanaDevnetRpc());

  console.log("Wallet:", payer.address);
  console.log("Counter:", COUNTER_ACCOUNT);

  const cpiInstruction = {
    programAddress: CALLER_PROGRAM,
    accounts: [
      {
        address: COUNTER_ACCOUNT,
        role: AccountRole.WRITABLE,
      },
      {
        address: TARGET_PROGRAM,
        role: AccountRole.READONLY,
      },
    ],
    data: new Uint8Array(),
  };

  const result = await client.sendTransaction([cpiInstruction]);

  console.log("Transaction submitted!");
  console.log("Signature:", result.context.signature);
  console.log(
    `Explorer: https://explorer.solana.com/tx/${result.context.signature}?cluster=devnet`,
  );
}

main().catch((error) => {
  console.error("Devnet CPI failed:", error);
  process.exitCode = 1;
});
