/**
 * Isolated auth-flow integration tests (plan U5, KTD6).
 *
 * Everything here runs against the local Firebase emulators under the inert
 * `demo-auth-flows` project; the dev server runs in `e2e-auth` mode
 * (see .env.e2e-auth and src/firebase.ts). Run via `yarn e2e:auth-flows`,
 * which wraps this suite in `firebase emulators:exec`.
 *
 * Isolation model:
 * - beforeEach flushes Auth accounts, Firestore documents, and RTDB data via
 *   the emulator REST endpoints, so retried runs cannot share state.
 * - Each test seeds only the fixtures it needs (helpers below).
 * - A network guard aborts and records any request to a production Firebase
 *   host; afterEach fails the test if any fired.
 * - afterAll flushes again so the emulator is empty when the suite exits.
 */

import { expect, test, type Page } from "@playwright/test";
import admin from "firebase-admin";
import { RESET_REQUEST_CONFIRMATION } from "../src/components/Auth/authErrors";

// ---------------------------------------------------------------------------
// Emulator endpoints (ports pinned in firebase.json)
// ---------------------------------------------------------------------------

const PROJECT = "demo-auth-flows";
const AUTH_EMU = "http://127.0.0.1:9099";
const FIRESTORE_EMU = "http://127.0.0.1:8080";
const RTDB_EMU = "http://127.0.0.1:9000";
const RTDB_NS = "demo-auth-flows-default-rtdb";

// This spec must never run outside `firebase emulators:exec`. emulators:exec
// exports the emulator host env vars to the child process; if they are missing
// or non-local, refuse to run at all.
const firestoreEmuHost = process.env.FIRESTORE_EMULATOR_HOST;
if (
  !firestoreEmuHost ||
  !/^(127\.0\.0\.1|localhost):\d+$/.test(firestoreEmuHost)
) {
  throw new Error(
    "e2e/auth-flows.spec.ts must run via `yarn e2e:auth-flows` so all Firebase traffic stays on local emulators.",
  );
}

// The season document is admin-write-only in firestore.rules, so seeding it
// requires the Admin SDK. With FIRESTORE_EMULATOR_HOST set (emulators:exec)
// and a demo- project id, this needs no credentials and cannot reach
// production.
if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: PROJECT });
}
const adminDb = admin.firestore();

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SEASON_ID = "season_1";
const SEASON_ORDER = 1;
const SEASON_NAME = "Test Season One";
const SEASON_PLAYERS = [1, 2, 3, 4].map((n) => ({
  season_id: SEASON_ID,
  season_num: SEASON_ORDER,
  castaway_id: `US99${String(n).padStart(2, "0")}`,
  full_name: `Test Player ${n}`,
  img: "",
}));

const PASSWORD = "correct-horse-7";
const NEW_PASSWORD = "brand-new-phrase-9";

let userCounter = 0;
const uniqueEmail = (label: string) =>
  `e2e-${label}-${Date.now()}-${userCounter++}@example.com`;

type SeededUser = { uid: string; email: string; displayName: string };

const VALID_INVITE_DRAFT = "draft_valid_invite";
const STARTED_DRAFT = "draft_started";
const MEMBER_DRAFT = "draft_existing_member";

// ---------------------------------------------------------------------------
// Emulator REST helpers
// ---------------------------------------------------------------------------

const wipeAuth = async () => {
  const res = await fetch(
    `${AUTH_EMU}/emulator/v1/projects/${PROJECT}/accounts`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`auth wipe failed: ${res.status}`);
};

const wipeFirestore = async () => {
  const res = await fetch(
    `${FIRESTORE_EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`firestore wipe failed: ${res.status}`);
};

const RTDB_HEADERS = {
  "Content-Type": "application/json",
  Authorization: "Bearer owner",
};
const rtdbUrl = (path: string) => `${RTDB_EMU}/${path}.json?ns=${RTDB_NS}`;

const wipeRtdb = async () => {
  const res = await fetch(rtdbUrl(""), {
    method: "PUT",
    headers: RTDB_HEADERS,
    body: "null",
  });
  if (!res.ok) throw new Error(`rtdb wipe failed: ${res.status}`);
};

const wipeEmulators = async () => {
  await Promise.all([wipeAuth(), wipeFirestore(), wipeRtdb()]);
};

const createUser = async (
  email: string,
  password: string,
  displayName: string,
): Promise<SeededUser> => {
  const res = await fetch(
    `${AUTH_EMU}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        displayName,
        returnSecureToken: true,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`seed signUp failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { localId: string };
  return { uid: data.localId, email, displayName };
};

// The emulator's account-list endpoint is not available in all firebase-tools
// versions, but password sign-in always is. It returns localId and doubles as
// proof that the given password currently works for the account.
const findAccountByEmail = async (email: string, password: string) => {
  const res = await fetch(
    `${AUTH_EMU}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    throw new Error(`account lookup failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { localId: string; email: string };
  return data;
};

const requestResetEmail = async (email: string) => {
  const res = await fetch(
    `${AUTH_EMU}/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
    },
  );
  if (!res.ok) {
    throw new Error(`sendOobCode failed: ${res.status} ${await res.text()}`);
  }
};

type OobCode = { email: string; requestType: string; oobCode: string };

const getPasswordResetCodes = async (email: string): Promise<OobCode[]> => {
  const res = await fetch(
    `${AUTH_EMU}/emulator/v1/projects/${PROJECT}/oobCodes`,
  );
  if (!res.ok) throw new Error(`oobCodes failed: ${res.status}`);
  const data = (await res.json()) as { oobCodes?: OobCode[] };
  return (data.oobCodes ?? []).filter(
    (c) => c.email === email && c.requestType === "PASSWORD_RESET",
  );
};

const seedSeason = async () => {
  await adminDb.doc(`seasons/${SEASON_ID}`).set({
    id: SEASON_ID,
    order: SEASON_ORDER,
    name: SEASON_NAME,
    img: "",
    players: SEASON_PLAYERS,
    episodes: [],
    castawayLookup: {},
  });
};

const participantMap = (users: SeededUser[]) =>
  Object.fromEntries(
    users.map((u) => [
      u.uid,
      {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        isAdmin: false,
      },
    ]),
  );

const seedDraft = async (
  draftId: string,
  participants: SeededUser[],
  opts: { started: boolean },
) => {
  const creator = participants[0];
  const record = {
    id: draftId,
    season_id: SEASON_ID,
    season_num: SEASON_ORDER,
    competiton_id: `competition_${draftId}`,
    creator_uid: creator.uid,
    participants: participantMap(participants),
    total_players: SEASON_PLAYERS.length,
    pick_order_uids: opts.started
      ? Object.fromEntries(participants.map((u, i) => [String(i), u.uid]))
      : {},
    turns: opts.started ? { "1": creator.uid } : {},
    draft_picks: {},
    prop_bets: {},
    state: {
      current_pick_number: opts.started ? 1 : 0,
      started: opts.started,
      finished: false,
    },
    created_at: Date.now(),
  };
  const res = await fetch(rtdbUrl(`drafts/${draftId}`), {
    method: "PUT",
    headers: RTDB_HEADERS,
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`draft seed failed: ${res.status}`);
};

type RtdbDraft = {
  creator_uid: string;
  participants?: Record<string, { uid: string }>;
  state?: { started?: boolean };
};

const readDrafts = async (): Promise<Record<string, RtdbDraft> | null> => {
  const res = await fetch(rtdbUrl("drafts"), { headers: RTDB_HEADERS });
  if (!res.ok) throw new Error(`draft read failed: ${res.status}`);
  return (await res.json()) as Record<string, RtdbDraft> | null;
};

// ---------------------------------------------------------------------------
// Network guard: fail on any production-bound Firebase request
// ---------------------------------------------------------------------------

const PROD_HOST_SUFFIXES = [
  ".googleapis.com",
  ".firebaseio.com",
  ".firebasedatabase.app",
  ".firebaseapp.com",
  ".google-analytics.com",
  ".googletagmanager.com",
];

const isProductionHost = (hostname: string): boolean => {
  if (hostname === "127.0.0.1" || hostname === "localhost") return false;
  return PROD_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
  );
};

let productionViolations: string[] = [];

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

const SLOW = { timeout: 20_000 };

const dialog = (page: Page) => page.getByRole("dialog");

const registerThrough = async (
  page: Page,
  user: { name: string; email: string; password: string },
) => {
  await dialog(page).getByLabel("Display Name").fill(user.name);
  await dialog(page).getByLabel("Email").fill(user.email);
  await dialog(page)
    .getByRole("textbox", { name: "Password" })
    .fill(user.password);
  await dialog(page).getByRole("button", { name: "Create account" }).click();
};

const signInThrough = async (
  page: Page,
  user: { email: string; password: string },
) => {
  // Season and draft gates open the modal in register mode; the navbar opens
  // it in sign-in mode. Selecting the tab is a no-op in the latter case.
  await dialog(page).getByRole("tab", { name: "Sign in" }).click();
  await dialog(page).getByLabel("Email").fill(user.email);
  await dialog(page)
    .getByRole("textbox", { name: "Password" })
    .fill(user.password);
  await dialog(page).getByRole("button", { name: "Sign in" }).click();
};

const openMobileNav = async (page: Page) => {
  await page.getByRole("button", { name: "Toggle navigation" }).click();
};

const expectSignedIn = async (page: Page, isMobile: boolean) => {
  if (isMobile) await openMobileNav(page);
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible(SLOW);
  if (isMobile) await openMobileNav(page); // close the overlay again
};

const signOutViaNavbar = async (page: Page, isMobile: boolean) => {
  if (isMobile) await openMobileNav(page);
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeVisible(SLOW);
  if (isMobile) await openMobileNav(page); // close the overlay again
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.beforeEach(async ({ context }) => {
  productionViolations = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (isProductionHost(url.hostname)) {
      productionViolations.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await wipeEmulators();
});

test.afterEach(async () => {
  expect(
    productionViolations,
    `production-bound Firebase requests: ${productionViolations.join(", ")}`,
  ).toEqual([]);
});

test.afterAll(async () => {
  await wipeEmulators();
});

test("suite guard: app talks only to local emulators", async ({ page }) => {
  await seedSeason();
  const user = await createUser(uniqueEmail("guard"), PASSWORD, "Guard User");

  const firestoreRequest = page.waitForRequest((r) =>
    r.url().startsWith(FIRESTORE_EMU),
  );
  await page.goto(`/seasons/${SEASON_ID}`);
  await firestoreRequest;

  const authRequest = page.waitForRequest((r) => r.url().startsWith(AUTH_EMU));
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await signInThrough(page, { email: user.email, password: PASSWORD });
  await authRequest;

  // Signed-in UI confirms the full emulator round trip; any production-bound
  // request would already have failed this test via the network guard.
  await expect(
    page.getByRole("button", { name: "Start a draft" }).first(),
  ).toBeVisible(SLOW);
});

// AE1 + duplicate-effect guard: under the dev server React Strict Mode replays
// effects, and exactly one draft record must still result.
test("registration from Start creates exactly one draft and lands in its lobby (AE1)", async ({
  page,
}) => {
  await seedSeason();
  const email = uniqueEmail("register-start");

  await page.goto(`/seasons/${SEASON_ID}`);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    dialog(page).getByText(`Start a draft for ${SEASON_NAME}`),
  ).toBeVisible();
  await registerThrough(page, {
    name: "New Player",
    email,
    password: PASSWORD,
  });

  // No second start action: the retained intent continues on its own.
  await expect(page).toHaveURL(
    new RegExp(`/seasons/${SEASON_ID}/draft/draft_`),
    SLOW,
  );
  await expect(page.getByRole("heading", { name: "Draft Lobby" })).toBeVisible(
    SLOW,
  );

  const account = await findAccountByEmail(email, PASSWORD);
  const drafts = await readDrafts();
  const records = Object.values(drafts ?? {});
  expect(records).toHaveLength(1);
  expect(records[0].creator_uid).toBe(account.localId);
  expect(Object.keys(records[0].participants ?? {})).toEqual([account.localId]);
  expect(records[0].state?.started).toBe(false);
});

test("sign-in from Start creates one draft without another click", async ({
  page,
  isMobile,
}) => {
  test.skip(Boolean(isMobile), "desktop-only scenario");
  await seedSeason();
  const user = await createUser(
    uniqueEmail("login-start"),
    PASSWORD,
    "Returning Player",
  );

  await page.goto(`/seasons/${SEASON_ID}`);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await signInThrough(page, { email: user.email, password: PASSWORD });

  await expect(page).toHaveURL(
    new RegExp(`/seasons/${SEASON_ID}/draft/draft_`),
    SLOW,
  );
  await expect(page.getByRole("heading", { name: "Draft Lobby" })).toBeVisible(
    SLOW,
  );

  const drafts = await readDrafts();
  const records = Object.values(drafts ?? {});
  expect(records).toHaveLength(1);
  expect(records[0].creator_uid).toBe(user.uid);
});

// AE2: register from a valid invitation and land in the lobby as a participant.
test("registration from a valid invitation joins exactly once (AE2)", async ({
  page,
}) => {
  await seedSeason();
  const host = await createUser(uniqueEmail("host"), PASSWORD, "Host User");
  await seedDraft(VALID_INVITE_DRAFT, [host], { started: false });
  const email = uniqueEmail("invitee");

  await page.goto(`/seasons/${SEASON_ID}/draft/${VALID_INVITE_DRAFT}`);
  await page.getByRole("button", { name: "Log in to join" }).click();
  await expect(
    dialog(page).getByText(`Join the ${SEASON_NAME} draft`),
  ).toBeVisible();
  await registerThrough(page, {
    name: "Invited Friend",
    email,
    password: PASSWORD,
  });

  await expect(page.getByRole("heading", { name: "Draft Lobby" })).toBeVisible(
    SLOW,
  );
  await expect(page.getByText("2 joined")).toBeVisible(SLOW);

  const account = await findAccountByEmail(email, PASSWORD);
  const drafts = await readDrafts();
  const participants = Object.values(
    drafts?.[VALID_INVITE_DRAFT]?.participants ?? {},
  );
  expect(participants).toHaveLength(2);
  expect(participants.filter((p) => p.uid === account.localId)).toHaveLength(1);
});

// AE7 family: an existing member signing in from the invitation must not
// produce a duplicate membership write.
test("sign-in as an existing participant adds no duplicate membership", async ({
  page,
  isMobile,
}) => {
  test.skip(Boolean(isMobile), "desktop-only scenario");
  await seedSeason();
  const host = await createUser(uniqueEmail("host"), PASSWORD, "Host User");
  const member = await createUser(
    uniqueEmail("member"),
    PASSWORD,
    "Member User",
  );
  await seedDraft(MEMBER_DRAFT, [host, member], { started: false });

  await page.goto(`/seasons/${SEASON_ID}/draft/${MEMBER_DRAFT}`);
  await page.getByRole("button", { name: "Log in to join" }).click();
  await signInThrough(page, { email: member.email, password: PASSWORD });

  await expect(page.getByRole("heading", { name: "Draft Lobby" })).toBeVisible(
    SLOW,
  );
  await expect(page.getByText("2 joined")).toBeVisible(SLOW);

  const drafts = await readDrafts();
  const participants = Object.values(
    drafts?.[MEMBER_DRAFT]?.participants ?? {},
  );
  expect(participants).toHaveLength(2);
  expect(participants.filter((p) => p.uid === member.uid)).toHaveLength(1);
});

// AE3: the draft starts before authentication completes.
test("stale invitation: started draft stays signed in, adds no participant, shows the unavailable state (AE3)", async ({
  page,
  isMobile,
}) => {
  test.skip(Boolean(isMobile), "desktop-only scenario");
  await seedSeason();
  const host = await createUser(uniqueEmail("host"), PASSWORD, "Host User");
  await seedDraft(STARTED_DRAFT, [host], { started: true });
  const email = uniqueEmail("late-invitee");

  await page.goto(`/seasons/${SEASON_ID}/draft/${STARTED_DRAFT}`);
  await page.getByRole("button", { name: "Log in to join" }).click();
  await registerThrough(page, {
    name: "Late Friend",
    email,
    password: PASSWORD,
  });

  await expect(
    page.getByText("This draft can no longer be joined"),
  ).toBeVisible(SLOW);
  await expect(
    page.getByText(
      "This draft has already started and can no longer be joined.",
    ),
  ).toBeVisible(SLOW);
  await expect(
    page.getByRole("link", { name: "Browse competitions" }),
  ).toBeVisible();

  // The user remains signed in and no membership write happened.
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  const drafts = await readDrafts();
  const participants = Object.values(
    drafts?.[STARTED_DRAFT]?.participants ?? {},
  );
  expect(participants).toHaveLength(1);
  expect(participants[0].uid).toBe(host.uid);
});

// AE4/AE5: the confirmation is identical for known and unknown emails.
test("reset request shows the identical confirmation for known and unknown emails (AE4/AE5)", async ({
  page,
}) => {
  await seedSeason();
  const known = await createUser(uniqueEmail("known"), PASSWORD, "Known User");
  const unknownEmail = uniqueEmail("ghost");

  await page.goto(`/seasons/${SEASON_ID}`);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await dialog(page).getByRole("tab", { name: "Sign in" }).click();
  await dialog(page).getByLabel("Email").fill(unknownEmail);
  await dialog(page).getByRole("button", { name: "Forgot password?" }).click();

  // The entered email carries forward into the reset-request form.
  await expect(dialog(page).getByLabel("Email")).toHaveValue(unknownEmail);

  await dialog(page).getByRole("button", { name: "Send reset email" }).click();
  await expect(dialog(page).getByRole("alert")).toHaveText(
    RESET_REQUEST_CONFIRMATION,
    SLOW,
  );

  await dialog(page).getByLabel("Email").fill(known.email);
  await dialog(page).getByRole("button", { name: "Send reset email" }).click();
  // The known-email request actually reaches the emulator; only then compare.
  await expect
    .poll(async () => (await getPasswordResetCodes(known.email)).length, {
      timeout: 15_000,
    })
    .toBe(1);
  await expect(dialog(page).getByRole("alert")).toHaveText(
    RESET_REQUEST_CONFIRMATION,
  );
  expect(await getPasswordResetCodes(unknownEmail)).toHaveLength(0);
});

// AE4: complete the reset through the app-owned handler.
test("reset completion: new password signs in, old password fails, reused code is invalid (AE4)", async ({
  page,
  isMobile,
}) => {
  const user = await createUser(uniqueEmail("reset"), PASSWORD, "Reset User");
  // The old-password check below uses the season page sign-in gate.
  await seedSeason();
  await requestResetEmail(user.email);
  await expect
    .poll(async () => (await getPasswordResetCodes(user.email)).length, {
      timeout: 15_000,
    })
    .toBe(1);
  const code = (await getPasswordResetCodes(user.email))[0].oobCode;

  await page.goto(`/reset-password?mode=resetPassword&oobCode=${code}`);
  // The one-time code is captured into page memory and stripped from the
  // address bar before any form renders.
  await expect(page).toHaveURL("/reset-password");

  await page.getByRole("textbox", { name: "New password" }).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(
    page.getByRole("heading", { name: "Password updated" }),
  ).toBeVisible(SLOW);

  // Sign in with the new password; the email is prefilled from verification.
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(dialog(page).getByLabel("Email")).toHaveValue(user.email);
  await dialog(page)
    .getByRole("textbox", { name: "Password" })
    .fill(NEW_PASSWORD);
  await dialog(page).getByRole("button", { name: "Sign in" }).click();
  await expect(dialog(page)).toBeHidden(SLOW);
  await expectSignedIn(page, Boolean(isMobile));

  await signOutViaNavbar(page, Boolean(isMobile));

  // The old password no longer signs in.
  await page.goto(`/seasons/${SEASON_ID}`);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await signInThrough(page, { email: user.email, password: PASSWORD });
  await expect(dialog(page).getByRole("alert")).toContainText(
    "We could not sign you in with that email and password",
    SLOW,
  );

  // The consumed code cannot be reused.
  await page.goto(`/reset-password?mode=resetPassword&oobCode=${code}`);
  await expect(
    page.getByRole("heading", { name: "Reset link no longer valid" }),
  ).toBeVisible(SLOW);
  await expect(
    page.getByRole("button", { name: "Request a new reset email" }),
  ).toBeVisible();
});

// AE8-lite: sign-out restores signed-out entry points.
test("logout from the navbar restores signed-out entry points (AE8-lite)", async ({
  page,
  isMobile,
}) => {
  test.skip(Boolean(isMobile), "desktop-only scenario");
  await seedSeason();
  const user = await createUser(uniqueEmail("logout"), PASSWORD, "Logout User");

  await page.goto("/");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await signInThrough(page, { email: user.email, password: PASSWORD });
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible(SLOW);

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeVisible(SLOW);

  await page.goto(`/seasons/${SEASON_ID}`);
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeVisible();
});

test("login completes with keyboard only", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "desktop-only scenario");
  const user = await createUser(
    uniqueEmail("keyboard"),
    PASSWORD,
    "Keyboard User",
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(dialog(page)).toBeVisible();

  // The modal heading starts focused; tab forward to each field.
  const tabToInput = async (type: "email" | "password") => {
    for (let i = 0; i < 15; i++) {
      const matched = await page.evaluate(
        (t) =>
          document.activeElement instanceof HTMLInputElement &&
          document.activeElement.type === t,
        type,
      );
      if (matched) return;
      await page.keyboard.press("Tab");
    }
    throw new Error(`keyboard navigation did not reach the ${type} field`);
  };

  await tabToInput("email");
  await page.keyboard.type(user.email);
  await tabToInput("password");
  await page.keyboard.type(PASSWORD);
  await page.keyboard.press("Enter");

  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible(SLOW);
});
