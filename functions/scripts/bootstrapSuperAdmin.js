/**
 * One-time setup: creates the first super admin from the HR sheet, so they can log in and
 * import everyone else from the app (Super Admin → Import HR sheet).
 *
 *   cd functions
 *   node scripts/bootstrapSuperAdmin.js "../EMP DATA FOR APP.xlsx" 4033
 *
 * Uses Application Default Credentials (`gcloud auth application-default login`).
 * Prints only the employee's name; the date of birth is never printed.
 */
const path = require('path');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
// SheetJS is a dependency of the app (root node_modules), not of the functions.
const XLSX = require(require.resolve('xlsx', { paths: [path.join(__dirname, '..', '..')] }));

const PROJECT_ID = 'purchase-team-app';

function toIso(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

function readDob(value) {
  if (typeof value === 'number') {
    const p = XLSX.SSF.parse_date_code(value);
    return p ? toIso(p.y, p.m, p.d) : null;
  }
  const s = String(value ?? '').trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) return toIso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
  if (m) return toIso(+m[3], +m[2], +m[1]);
  return null;
}

async function main() {
  const [file, rawId] = process.argv.slice(2);
  if (!file || !rawId) {
    console.error('Usage: node scripts/bootstrapSuperAdmin.js <sheet.xlsx> <employeeId>');
    process.exit(1);
  }
  const employeeId = String(rawId).trim().toUpperCase();

  const wb = XLSX.readFile(file);
  const table = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true });
  const header = (table[0] || []).map(h => String(h ?? '').toLowerCase().replace(/[^a-z]/g, ''));
  const col = needles => header.findIndex(h => needles.some(n => h.includes(n)));
  const dobCol = col(['birth', 'dob']);
  const deptCol = col(['dept', 'department']);
  const nameCol = header.findIndex((h, i) => i !== dobCol && i !== deptCol && h.includes('name'));
  const idCol = header.findIndex(
    (h, i) => ![dobCol, deptCol, nameCol].includes(i) && /(code|id|no)$/.test(h),
  );
  if ([idCol, nameCol, dobCol].includes(-1)) throw new Error('Could not find ID, name and DOB columns.');

  const row = table.slice(1).find(r => String(r[idCol] ?? '').trim().toUpperCase() === employeeId);
  if (!row) throw new Error(`Employee ${employeeId} is not in the sheet.`);
  const name = String(row[nameCol]).replace(/\s+/g, ' ').trim();
  const dob = readDob(row[dobCol]);
  if (!dob) throw new Error(`Employee ${employeeId} has an unreadable date of birth.`);
  const department = deptCol >= 0 ? String(row[deptCol] ?? '').trim() : '';

  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  const db = getFirestore();
  const now = Date.now();
  const ref = db.doc(`employees/${employeeId}`);
  const existing = await ref.get();
  await ref.set(
    {
      employeeId,
      name,
      nameLower: name.toLowerCase(),
      department,
      active: true,
      superAdmin: true,
      ...(existing.exists
        ? {}
        : { phone: null, uid: null, failedAttempts: 0, lockedUntil: null, createdAt: now }),
      updatedAt: now,
    },
    { merge: true },
  );
  await db.doc(`employeeSecrets/${employeeId}`).set({ dob });
  await db.collection('auditLog').add({
    type: 'super-admin-granted',
    employeeId,
    name,
    details: 'Initial setup',
    createdAt: now,
  });
  console.log(`Done: ${name} (${employeeId}) is a super admin and can now log in.`);
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
