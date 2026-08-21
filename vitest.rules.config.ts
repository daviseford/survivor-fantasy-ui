import { defineConfig } from "vitest/config";

/**
 * Firestore security-rules tests.
 *
 * Separate from the main unit suite because these need the Firestore emulator
 * running -- `yarn test:rules` starts it via `firebase emulators:exec`. Keeping
 * them out of `yarn test` means the default suite stays hermetic and fast.
 */
export default defineConfig({
  test: {
    include: ["rules-tests/**/*.test.ts"],
    // Emulator round-trips are slower than pure unit tests, and the whole file
    // shares one emulator instance.
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
