import { randomUUID } from 'node:crypto';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'eva-aima';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const db = getFirestore();
const auth = getAuth();
const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
};

const TABLE_MAPPINGS = [
  ['finance_goals', 'goals'],
  ['finance_budget_limits', 'budget_limits'],
  ['finance_spending_events', 'spending_events'],
  ['finance_financial_entries', 'financial_entries'],
  ['finance_subscriptions', 'subscriptions'],
  ['finance_import_jobs', 'import_jobs'],
  ['finance_draft_transactions', 'draft_transactions'],
  ['notifications', 'notifications'],
];

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

async function fetchTable(tableName) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=${pageSize}&offset=${offset}`,
      { headers },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${tableName}: ${response.status} ${await response.text()}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) {
      break;
    }

    rows.push(...payload);
    if (payload.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return rows;
}

async function fetchAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      { headers },
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch Supabase auth users: ${response.status} ${await response.text()}`);
    }

    const payload = await response.json();
    const batch = Array.isArray(payload.users) ? payload.users : [];
    if (!batch.length) {
      break;
    }

    users.push(...batch);
    if (batch.length < perPage) {
      break;
    }
    page += 1;
  }

  return users;
}

function normalizeProfileRow(row, authUser) {
  const email = authUser?.email ?? row?.email ?? null;
  return {
    ...row,
    email,
    migrated_from_public: Boolean(row?.legacy_public_user_id),
    password_setup_completed: row?.password_setup_completed ?? false,
    updated_at: row?.updated_at ?? new Date().toISOString(),
    created_at: row?.created_at ?? new Date().toISOString(),
  };
}

async function upsertFirebaseUser(user) {
  const displayName =
    user.user_metadata?.full_name ||
    [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ') ||
    user.email?.split('@')[0] ||
    'EVA User';

  const payload = {
    uid: user.id,
    email: user.email,
    emailVerified: Boolean(user.email_confirmed_at),
    displayName,
    disabled: false,
    password: `${randomUUID()}Aa!`,
  };

  try {
    await auth.updateUser(user.id, payload);
  } catch {
    await auth.createUser(payload);
  }
}

async function writeCollection(uid, collectionName, rows) {
  for (const records of chunk(rows, 400)) {
    const batch = db.batch();
    for (const row of records) {
      const ref = db.collection('users').doc(uid).collection(collectionName).doc(String(row.id));
      batch.set(ref, row);
    }
    await batch.commit();
  }
}

async function main() {
  console.log('Fetching Supabase auth users...');
  const authUsers = await fetchAuthUsers();
  console.log(`Fetched ${authUsers.length} auth users.`);

  const authUsersById = new Map(authUsers.map((user) => [user.id, user]));

  console.log('Migrating Firebase Auth users...');
  for (const user of authUsers) {
    await upsertFirebaseUser(user);
  }

  console.log('Fetching canonical finance tables...');
  const profiles = await fetchTable('finance_profiles');
  const profilesByUserId = new Map(profiles.map((row) => [row.user_id, row]));

  for (const [supabaseTable, firestoreCollection] of TABLE_MAPPINGS) {
    console.log(`Fetching ${supabaseTable}...`);
    const rows = await fetchTable(supabaseTable);
    const grouped = new Map();
    for (const row of rows) {
      const uid = row.user_id;
      if (!uid) continue;
      const existing = grouped.get(uid) || [];
      existing.push(row);
      grouped.set(uid, existing);
    }

    console.log(`Writing ${supabaseTable} into ${firestoreCollection}...`);
    for (const [uid, records] of grouped.entries()) {
      await writeCollection(uid, firestoreCollection, records);
    }
  }

  console.log('Writing root user documents...');
  for (const user of authUsers) {
    const profile = normalizeProfileRow(profilesByUserId.get(user.id) || { user_id: user.id }, user);
    await db.collection('users').doc(user.id).set(profile, { merge: true });
  }

  console.log('Supabase -> Firebase migration complete.');
  console.log('Next step: trigger password reset emails for migrated users before cutting traffic over.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
