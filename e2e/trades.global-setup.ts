import { execFileSync } from "child_process";

/**
 * Seeds two real test users and a real competition in production Firebase
 * for the trades e2e spec. See scripts/e2e-trade-setup.ts.
 */
export default function globalSetup(): void {
  execFileSync("yarn", ["tsx", "scripts/e2e-trade-setup.ts", "setup"], {
    stdio: "inherit",
    shell: true,
  });
}
