import { adminAuth } from "./lib/admin.js";

const uid = process.argv[2];

if (!uid) {
  console.error("Usage: tsx scripts/set-admin-claim.ts <uid>");
  process.exit(1);
}

async function main() {
  const user = await adminAuth.getUser(uid);
  const currentClaims = user.customClaims || {};
  const newClaims = { ...currentClaims, admin: true };

  await adminAuth.setCustomUserClaims(uid, newClaims);

  console.log(`Successfully set custom claims for ${user.email} (${uid}):`);
  console.log(JSON.stringify(newClaims, null, 2));
  console.log(
    "\nThe user must sign out and back in for the new claims to take effect.",
  );
}

main().catch((err) => {
  console.error("Failed to set admin claim:", err.message);
  process.exit(1);
});
