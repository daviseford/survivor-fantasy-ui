import { execFileSync } from "child_process";

/**
 * Removes the test users, test competition, and its trades from Firebase.
 */
export default function globalTeardown(): void {
  execFileSync("yarn", ["tsx", "scripts/e2e-trade-setup.ts", "teardown"], {
    stdio: "inherit",
    shell: true,
  });
}
