import { test } from "bun:test";
import assert from "node:assert/strict";
import path from "node:path";
import { address } from "@solana/kit";
import { fileURLToPath } from "node:url";

import { LiteSVM, FailedTransactionMetadata } from "litesvm";
import {
  AccountRole,
  appendTransactionMessageInstruction,
  createTransactionMessage,
  generateKeyPairSigner,
  getAddressEncoder,
  getProgramDerivedAddress,
  lamports,
  pipe,
  setTransactionMessageFeePayerSigner,
  signTransactionMessageWithSigners,
} from "@solana/kit";

const here = path.dirname(fileURLToPath(import.meta.url));

const PROGRAM_PATH = path.resolve(
  here,
  "../class-contracct/target/deploy/class_contracct.so",
);

test("creates a PDA owned by the program with 8 bytes of data", async () => {
  const svm = new LiteSVM();

  // Generate program, user and transaction fee payer.
  const program = await generateKeyPairSigner();
  const user = await generateKeyPairSigner();
  const payer = await generateKeyPairSigner();

  // Load the compiled PDA program.
  svm.addProgramFromFile(program.address, PROGRAM_PATH);

  // Fund both accounts: user funds PDA creation, payer covers transaction fees.
  svm.airdrop(user.address, lamports(2_000_000_000n));
  svm.airdrop(payer.address, lamports(1_000_000_000n));

  // Derive PDA using [user public key bytes, "user"].
  const userBytes = getAddressEncoder().encode(user.address);

  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: program.address,
    seeds: [userBytes, new TextEncoder().encode("user")],
  });

  const instruction = {
    programAddress: program.address,
    accounts: [
      {
        address: pda,
        role: AccountRole.WRITABLE,
      },
      {
        address: user.address,
        role: AccountRole.WRITABLE_SIGNER,
        signer: user,
      },
      {
        address: address("11111111111111111111111111111111"),
        role: AccountRole.READONLY,
      },
    ] as const,
    data: new Uint8Array(),
  };

  const transaction = await pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(payer, tx),
    (tx) => svm.setTransactionMessageLifetimeUsingLatestBlockhash(tx),
    (tx) => appendTransactionMessageInstruction(instruction, tx),
    (tx) => signTransactionMessageWithSigners(tx),
  );

  const result = svm.sendTransaction(transaction);

  if (result instanceof FailedTransactionMetadata) {
    throw new Error(`PDA creation failed: ${result.err()}`);
  }

  const account = svm.getAccount(pda);

  assert.ok(account.exists, "PDA account should exist");
  assert.equal(account.data.length, 8, "PDA should contain 8 bytes");
  assert.equal(
    account.programAddress,
    program.address,
    "PDA should be owned by our program",
  );

  console.log("PDA:", pda);
  console.log("Bump:", bump);
  console.log("Data length:", account.data.length);
});
