
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LiteSVM, FailedTransactionMetadata } from "litesvm";
import {
  AccountRole,
  appendTransactionMessageInstruction,
  createTransactionMessage,
  generateKeyPairSigner,
  lamports,
  pipe,
  setTransactionMessageFeePayerSigner,
  signTransactionMessageWithSigners,
} from "@solana/kit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROGRAM_PATH = path.resolve(
  __dirname,
  "../target/deploy/cpi_in_solana.so",
);

test("counter transitions from 0 to 1 to 2 to 4", async () => {
  const svm = new LiteSVM();

  // Load the compiled Solana program.
  const programSigner = await generateKeyPairSigner();
  const programId = programSigner.address;

  svm.addProgramFromFile(programId, PROGRAM_PATH);

  // Create and fund transaction fee payer.
  const payer = await generateKeyPairSigner();
  svm.airdrop(payer.address, lamports(2_000_000_000n));

  // Create a program-owned counter account.
  const dataAccount = await generateKeyPairSigner();

  svm.setAccount({
    address: dataAccount.address,
    data: new Uint8Array(4),
    executable: false,
    lamports: lamports(svm.minimumBalanceForRentExemption(4n)),
    programAddress: programId,
    space: 4n,
  });

  // Read the u32 counter from account data.
  function readCounter() {
    const account = svm.getAccount(dataAccount.address);

    if (!account.exists) {
      throw new Error("Counter account does not exist");
    }

    return new DataView(
      account.data.buffer,
      account.data.byteOffset,
      account.data.byteLength,
    ).getUint32(0, true);
  }

  assert.equal(readCounter(), 0);

  async function invokeCounter() {
    const instruction = {
      programAddress: programId,
      accounts: [
        {
          address: dataAccount.address,
          role: AccountRole.WRITABLE,
        },
      ],
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
      throw new Error(`Transaction failed: ${result.err()}`);
    }
  }

  // Verify 0 -> 1 -> 2 -> 4.
  for (const expected of [1, 2, 4]) {
    await invokeCounter();
    assert.equal(readCounter(), expected);
    svm.expireBlockhash();
  }
});
