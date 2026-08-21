/**
 * Setup/teardown for the live trades e2e test (e2e/trades.spec.ts).
 *
 * Creates two real test users and a real competition on season 49
 * (watch-along at episode 2 so auto-finish never triggers and trade locks
 * don't apply — season 49 has no air dates), with two drafted castaways per
 * user. Writes the credentials to e2e/.auth/trades-test.json (gitignored)
 * for the spec to consume.
 *
 * Usage:
 *   yarn tsx scripts/e2e-trade-setup.ts setup
 *   yarn tsx scripts/e2e-trade-setup.ts teardown
 */

import { randomBytes } from "crypto";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { adminAuth } from "./lib/admin.js";

const MODE = process.argv[2];
if (MODE !== "setup" && MODE !== "teardown") {
  console.error("Usage: tsx scripts/e2e-trade-setup.ts <setup|teardown>");
  process.exit(1);
}

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const STATE_PATH = path.join(PROJECT_ROOT, "e2e", ".auth", "trades-test.json");

const SEASON_NUM = 49;
const SEASON_ID = "season_49";

/**
 * Fixtures are scoped to a single run and tagged with an ownership marker.
 *
 * These are real documents and real Auth accounts in the *production* project,
 * so fixed identifiers would make two overlapping runs (or a stale fixture from
 * an abandoned run) delete each other's data. Teardown only ever removes
 * documents carrying `E2E_MARKER_FIELD`, so it can never touch a real
 * competition even if the id were to collide.
 */
const E2E_MARKER_FIELD = "e2e_fixture";
const RUN_ID = randomBytes(4).toString("hex");
const competitionIdFor = (runId: string) => `competition_e2e_trades_${runId}`;
const emailsFor = (runId: string) => ({
  a: `trader-a+${runId}@grabyourtorch.test`,
  b: `trader-b+${runId}@grabyourtorch.test`,
});

const COMPETITION_ID = competitionIdFor(RUN_ID);
const { a: EMAIL_A, b: EMAIL_B } = emailsFor(RUN_ID);

const db = getFirestore();

interface TestUserState {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  /** Full names of this user's drafted castaways, in draft order. */
  players: string[];
}

interface TradesTestState {
  competitionId: string;
  /** Identifies the fixtures this run created, so teardown removes only those. */
  runId: string;
  userA: TestUserState;
  userB: TestUserState;
}

async function ensureUser(
  email: string,
  displayName: string,
): Promise<TestUserState> {
  const password = `e2e-${randomBytes(12).toString("hex")}`;
  try {
    const existing = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(existing.uid, { password, displayName });
    console.log(`  Reused user ${email} (${existing.uid})`);
    return { uid: existing.uid, email, password, displayName, players: [] };
  } catch {
    const created = await adminAuth.createUser({
      email,
      password,
      displayName,
    });
    console.log(`  Created user ${email} (${created.uid})`);
    return { uid: created.uid, email, password, displayName, players: [] };
  }
}

async function deleteUserIfExists(email: string): Promise<void> {
  try {
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.deleteUser(user.uid);
    console.log(`  Deleted user ${email}`);
  } catch {
    console.log(`  User ${email} not found, skipping`);
  }
}

async function deleteTradesSubcollection(competitionId: string): Promise<void> {
  const trades = await db
    .collection("competitions")
    .doc(competitionId)
    .collection("trades")
    .get();
  for (const doc of trades.docs) {
    await doc.ref.delete();
  }
  if (trades.size > 0) {
    console.log(`  Deleted ${trades.size} trade doc(s)`);
  }
}

/**
 * Delete one fixture competition, but only after confirming it carries the
 * ownership marker this script writes. A doc without the marker was not created
 * here and is left alone.
 */
async function deleteFixtureCompetition(competitionId: string): Promise<void> {
  const ref = db.collection("competitions").doc(competitionId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`  Competition ${competitionId} not found, skipping`);
    return;
  }
  if (snap.get(E2E_MARKER_FIELD) !== true) {
    console.warn(
      `  REFUSING to delete ${competitionId}: missing ${E2E_MARKER_FIELD} marker`,
    );
    return;
  }
  await deleteTradesSubcollection(competitionId);
  await ref.delete();
  console.log(`  Deleted ${competitionId}`);
}

async function setup(): Promise<void> {
  console.log("Setting up live trades e2e fixtures...");

  const userA = await ensureUser(EMAIL_A, "Trader Alice");
  const userB = await ensureUser(EMAIL_B, "Trader Bob");

  // Load season 49 data and pick 4 castaways still alive at episode 2 so
  // the competition's alive-only validation passes.
  const seasonPath = path.join(
    PROJECT_ROOT,
    "src",
    "data",
    SEASON_ID,
    "index.ts",
  );
  const mod = await import(
    new URL(`file:///${seasonPath.replace(/\\/g, "/")}`).href
  );
  const players = mod[`SEASON_${SEASON_NUM}_PLAYERS`] as {
    castaway_id: string;
    full_name: string;
  }[];
  const eliminations = Object.values(
    mod[`SEASON_${SEASON_NUM}_ELIMINATIONS`] as Record<
      string,
      { castaway_id: string; episode_num: number }
    >,
  );
  const earlyOuts = new Set(
    eliminations.filter((e) => e.episode_num <= 2).map((e) => e.castaway_id),
  );
  const alivePlayers = players.filter((p) => !earlyOuts.has(p.castaway_id));
  if (alivePlayers.length < 4) {
    throw new Error(
      "Not enough alive castaways at episode 2 to seed trades test",
    );
  }
  const [p1, p2, p3, p4] = alivePlayers.slice(-4);

  const slimA = {
    uid: userA.uid,
    email: userA.email,
    displayName: userA.displayName,
    isAdmin: false,
  };
  const slimB = {
    uid: userB.uid,
    email: userB.email,
    displayName: userB.displayName,
    isAdmin: false,
  };

  const pick = (
    order: number,
    user: TestUserState,
    player: { castaway_id: string; full_name: string },
  ) => ({
    season_id: SEASON_ID,
    season_num: SEASON_NUM,
    order,
    user_name: user.displayName,
    user_uid: user.uid,
    castaway_id: player.castaway_id,
    player_name: player.full_name,
  });

  await deleteTradesSubcollection(COMPETITION_ID);

  await db
    .collection("competitions")
    .doc(COMPETITION_ID)
    .set({
      id: COMPETITION_ID,
      [E2E_MARKER_FIELD]: true,
      e2e_run_id: RUN_ID,
      competition_name: "E2E Trades Test League",
      season_id: SEASON_ID,
      season_num: SEASON_NUM,
      draft_id: "draft_e2e_trades",
      creator_uid: userA.uid,
      participant_uids: [userA.uid, userB.uid],
      participants: [slimA, slimB],
      draft_picks: [
        pick(1, userA, p1),
        pick(2, userB, p3),
        pick(3, userA, p2),
        pick(4, userB, p4),
      ],
      current_episode: 2,
      finished: false,
    });
  console.log(
    `  Seeded ${COMPETITION_ID}: A=[${p1.full_name}, ${p2.full_name}], B=[${p3.full_name}, ${p4.full_name}]`,
  );

  userA.players = [p1.full_name, p2.full_name];
  userB.players = [p3.full_name, p4.full_name];

  const state: TradesTestState = {
    competitionId: COMPETITION_ID,
    runId: RUN_ID,
    userA,
    userB,
  };
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  console.log(
    `  Wrote credentials to ${path.relative(PROJECT_ROOT, STATE_PATH)}`,
  );
  console.log("Setup complete.");
}

/**
 * Remove the fixtures this run created.
 *
 * The state file names them; when it is missing (setup died before writing it,
 * or someone runs teardown standalone) fall back to sweeping every competition
 * carrying the ownership marker, so nothing is orphaned in production.
 */
async function teardown(): Promise<void> {
  console.log("Tearing down live trades e2e fixtures...");

  const state: TradesTestState | null = fs.existsSync(STATE_PATH)
    ? (JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")) as TradesTestState)
    : null;

  if (state) {
    await deleteFixtureCompetition(state.competitionId);
    await deleteUserIfExists(state.userA.email);
    await deleteUserIfExists(state.userB.email);
  } else {
    console.log("  No state file; sweeping marked fixtures instead");
    const marked = await db
      .collection("competitions")
      .where(E2E_MARKER_FIELD, "==", true)
      .get();
    for (const doc of marked.docs) {
      await deleteFixtureCompetition(doc.id);
      const runId = doc.get("e2e_run_id");
      if (typeof runId === "string") {
        const { a, b } = emailsFor(runId);
        await deleteUserIfExists(a);
        await deleteUserIfExists(b);
      }
    }
    if (marked.empty) console.log("  Nothing to sweep");
  }

  if (fs.existsSync(STATE_PATH)) {
    fs.unlinkSync(STATE_PATH);
    console.log("  Removed trades-test.json");
  }
  console.log("Teardown complete.");
}

try {
  if (MODE === "setup") await setup();
  else await teardown();
  process.exit(0);
} catch (err) {
  console.error("e2e-trade-setup failed:", err);
  process.exit(1);
}
