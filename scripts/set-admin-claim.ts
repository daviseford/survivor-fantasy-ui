/**
 * Set the `admin` custom claim on a Firebase Auth user.
 *
 * Usage: npx tsx scripts/set-admin-claim.ts <uid>
 */

import { adminAuth } from "./lib/admin.js";

async function main(): Promise<void> {
  const uid = process.argv[2];

  if (!uid) {
    console.error("Usage: tsx scripts/set-admin-claim.ts <uid>");
    process.exit(1);
  }

  const user = await adminAuth.getUser(uid);
  const claims = { ...user.customClaims, admin: true };

  await adminAuth.setCustomUserClaims(uid, claims);

  console.log(`Successfully set custom claims for ${user.email} (${uid}):`);
  console.log(JSON.stringify(claims, null, 2));
  console.log(
    "\nThe user must sign out and back in for the new claims to take effect.",
  );
}

main().catch((err) => {
  console.error("Failed to set admin claim:", err.message);
  process.exit(1);
});
