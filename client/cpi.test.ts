import { test } from "bun:test";
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

const here = path.dirname(fileURLToPath(import.meta.url));

const CALLER_PATH = path.resolve(
  here,
  "../cpi-contract/target/deploy/cpi_in_solana.so",
);

// Change this path to your actual target program .so file.
const TARGET_PATH = path.resolve(
  here,
  "/home/ravichauhan/solana/cpi-in-solana/target/deploy/cpi_in_solana.so",
);

test("CPI caller invokes target program and doubles the counter", async () => {
  const svm = new LiteSVM();

  const caller = await generateKeyPairSigner();
  const target = await generateKeyPairSigner();
  const payer = await generateKeyPairSigner();
  const dataAccount = await generateKeyPairSigner();

  svm.addProgramFromFile(caller.address, CALLER_PATH);
  svm.addProgramFromFile(target.address, TARGET_PATH);

  svm.airdrop(payer.address, lamports(2_000_000_000n));

  // Initial counter = 3; account is owned by the target program.
  svm.setAccount({
    address: dataAccount.address,
    data: new Uint8Array([3, 0, 0, 0]),
    executable: false,
    lamports: lamports(svm.minimumBalanceForRentExemption(4n)),
    programAddress: target.address,
    space: 4n,
  });

  const instruction = {
    programAddress: caller.address,
    accounts: [
      { address: dataAccount.address, role: AccountRole.WRITABLE },
      { address: target.address, role: AccountRole.READONLY },
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

  const account = svm.getAccount(dataAccount.address);
  assert.ok(account.exists);

  const actual = new DataView(
    account.data.buffer,
    account.data.byteOffset,
    account.data.byteLength,
  ).getUint32(0, true);

  assert.equal(actual, 6);
});

test("failed CPI leaves counter unchanged", async () => {
  const svm = new LiteSVM();

  const caller = await generateKeyPairSigner();
  const target = await generateKeyPairSigner();
  const payer = await generateKeyPairSigner();
  const dataAccount = await generateKeyPairSigner();

  svm.addProgramFromFile(caller.address, CALLER_PATH);
  svm.addProgramFromFile(target.address, TARGET_PATH);

  svm.airdrop(payer.address, lamports(2_000_000_000n));

  // Deliberately wrong owner: caller instead of target.
  svm.setAccount({
    address: dataAccount.address,
    data: new Uint8Array([3, 0, 0, 0]),
    executable: false,
    lamports: lamports(svm.minimumBalanceForRentExemption(4n)),
    programAddress: caller.address,
    space: 4n,
  });

  const instruction = {
    programAddress: caller.address,
    accounts: [
      { address: dataAccount.address, role: AccountRole.WRITABLE },
      { address: target.address, role: AccountRole.READONLY },
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

  assert.ok(
    result instanceof FailedTransactionMetadata,
    "Transaction should fail because the counter account has the wrong owner",
  );

  const account = svm.getAccount(dataAccount.address);
  assert.ok(account.exists);

  const actual = new DataView(
    account.data.buffer,
    account.data.byteOffset,
    account.data.byteLength,
  ).getUint32(0, true);

  assert.equal(actual, 3, "Counter must remain unchanged after failure");
});

// counter
// Program Id: DzLGQQPYMcs6nWLQZJk8MwzkTQLb94caqcdgeSzwqfhW

// Signature: 46xeevmuj6sqbBMVdHHYPZNqXxtgrWGivJNZT6Fepdg77pTjPz21KdYJvUYKwzsaE4b1e4BkpFQDUojhNZzmYY9k



// cpi
// Program Id: 7zNZJhq15K5j6SoxEmZdY8qbVnhVQRZJFLChDyFUeTrX

// Signature: 5qKVgCNXezAP5DPodE5HjcqByraDS6N1XcwZFRDsP6imxizvNk14fokr1WUjTgAfL9khjkNtYVgEGzpbDuZUw8JJ