/**
 * One-time migration (Phase 2): users/{uid} single team { teamId, role } → multiple teams
 * { teamIds: [...], teamRoles: { [teamId]: role } }. Safe to run more than once.
 *
 *   cd functions
 *   node scripts/migrateTeamsToMulti.js          # dry run: prints what would change
 *   node scripts/migrateTeamsToMulti.js --write  # applies it
 *
 * Uses Application Default Credentials (`gcloud auth application-default login`).
 */
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

async function main() {
  const write = process.argv.includes('--write');
  initializeApp({ credential: applicationDefault(), projectId: 'purchase-team-app' });
  const db = getFirestore();
  const snap = await db.collection('users').get();
  let changed = 0;
  const writer = db.bulkWriter();
  snap.forEach(doc => {
    const u = doc.data();
    const hasOld = 'teamId' in u || 'role' in u;
    if (Array.isArray(u.teamIds) && !hasOld) return;
    const teamIds = new Set(Array.isArray(u.teamIds) ? u.teamIds : []);
    const teamRoles = { ...(u.teamRoles || {}) };
    if (u.teamId) {
      teamIds.add(u.teamId);
      teamRoles[u.teamId] = teamRoles[u.teamId] || (u.role === 'admin' ? 'admin' : 'member');
    }
    changed += 1;
    console.log(`${doc.id}: teams ${JSON.stringify(teamRoles)}`);
    if (write) {
      writer.update(doc.ref, {
        teamIds: [...teamIds],
        teamRoles,
        teamId: FieldValue.delete(),
        role: FieldValue.delete(),
      });
    }
  });
  await writer.close();
  console.log(`${changed} of ${snap.size} profiles ${write ? 'migrated' : 'would be migrated (dry run)'}.`);
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
