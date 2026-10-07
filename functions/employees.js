const crypto = require('crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions/v2');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

/**
 * Employee login and super-admin management.
 *
 * Collections (all written only by these functions):
 *   employees/{employeeId}        name, department, active, superAdmin, phone, uid, lock state.
 *                                 Readable by super admins (rules) — never contains the DOB.
 *   employeeSecrets/{employeeId}  { dob: 'YYYY-MM-DD' } — no client access at all.
 *   users/emp_{employeeId}        the app profile; the Firebase Auth uid is derived from the
 *                                 employee ID, so it stays the same when the phone number changes.
 *   loginThrottle/{ipHash}        failed attempts per network, to stop guessing across many IDs.
 *   auditLog/{id}                 logins, number changes, lockouts and admin actions.
 *
 * Login: verifyEmployee (ID + DOB, before OTP) → phone OTP on the client → linkEmployee
 * (re-checks ID + DOB, returns a custom token for emp_{id}) → client signs in with it.
 */

const db = () => getFirestore();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 30 * 60 * 1000;
const IP_MAX_FAILURES = 20;
const IP_WINDOW_MS = 60 * 60 * 1000;

const GENERIC_MISMATCH = 'Employee ID or date of birth is incorrect.';

const employeeUid = employeeId => `emp_${employeeId}`;

function normalizeEmployeeId(value) {
  const id = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(id)) return null;
  return id;
}

function normalizeDob(value) {
  const dob = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const d = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== dob) return null;
  return dob;
}

function cleanText(value, max = 100) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function clientIp(request) {
  const raw = request.rawRequest;
  const forwarded = raw?.headers?.['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) || raw?.ip || 'unknown';
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

async function audit(type, fields) {
  await db()
    .collection('auditLog')
    .add({
      type,
      ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
      createdAt: Date.now(),
    })
    .catch(e => logger.error('audit write failed', e));
}

function formatIstTime(ms) {
  return new Date(ms).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Checks ID + DOB, counting failures per employee and per network. Never throws inside the
 * transaction (that would roll back the failure counters); returns an outcome instead.
 */
async function checkCredentials(request, rawId, rawDob) {
  const employeeId = normalizeEmployeeId(rawId);
  const dob = normalizeDob(rawDob);
  if (!employeeId || !dob) {
    throw new HttpsError('invalid-argument', 'Enter your employee ID and date of birth.');
  }
  const ipRef = db().doc(`loginThrottle/${clientIp(request)}`);
  const empRef = db().doc(`employees/${employeeId}`);
  const secretRef = db().doc(`employeeSecrets/${employeeId}`);
  const now = Date.now();

  const outcome = await db().runTransaction(async tx => {
    const [ipSnap, empSnap, secretSnap] = await Promise.all([
      tx.get(ipRef),
      tx.get(empRef),
      tx.get(secretRef),
    ]);

    const ip = ipSnap.exists ? ipSnap.data() : null;
    const ipWindowActive = ip && now - ip.windowStart < IP_WINDOW_MS;
    if (ipWindowActive && ip.failures >= IP_MAX_FAILURES) return { result: 'ip-blocked' };

    const recordIpFailure = () =>
      tx.set(ipRef, {
        windowStart: ipWindowActive ? ip.windowStart : now,
        failures: (ipWindowActive ? ip.failures : 0) + 1,
      });

    if (!empSnap.exists || !secretSnap.exists) {
      recordIpFailure();
      return { result: 'mismatch' };
    }
    const emp = empSnap.data();
    if (emp.lockedUntil && emp.lockedUntil > now) {
      return { result: 'locked', lockedUntil: emp.lockedUntil };
    }
    if (secretSnap.data().dob !== dob) {
      recordIpFailure();
      const failed = (emp.failedAttempts ?? 0) + 1;
      if (failed >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = now + LOCK_MS;
        tx.update(empRef, { failedAttempts: 0, lockedUntil });
        return { result: 'locked-now', lockedUntil, emp };
      }
      tx.update(empRef, { failedAttempts: failed });
      return { result: 'mismatch' };
    }
    if (emp.active !== true) return { result: 'inactive' };
    if (emp.failedAttempts || emp.lockedUntil) {
      tx.update(empRef, { failedAttempts: 0, lockedUntil: null });
    }
    return { result: 'ok', emp };
  });

  switch (outcome.result) {
    case 'ok':
      return { employeeId, emp: outcome.emp };
    case 'ip-blocked':
      throw new HttpsError('resource-exhausted', 'Too many attempts from this network. Try again in an hour.');
    case 'locked-now':
      await audit('lockout', { employeeId, name: outcome.emp.name });
    // fall through
    case 'locked':
      throw new HttpsError(
        'permission-denied',
        `Too many wrong attempts. Try again after ${formatIstTime(outcome.lockedUntil)}, or contact the admin.`,
      );
    case 'inactive':
      throw new HttpsError('permission-denied', 'Your access has been disabled. Please contact the admin.');
    default:
      throw new HttpsError('permission-denied', GENERIC_MISMATCH);
  }
}

/** "+919876543210" → "******3210". */
function maskPhone(phone) {
  return phone ? `******${String(phone).slice(-4)}` : null;
}

function normalizePhone(value) {
  const p = String(value ?? '').replace(/[^\d+]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}

/**
 * Each employee's account is locked to the mobile number of their first login. A different
 * number can't log in; it can only request a change, which the super admin approves.
 */
function wrongNumberError(emp) {
  return new HttpsError(
    'failed-precondition',
    `This employee ID is registered to mobile number ${maskPhone(emp.phone)}. Log in with that number, or request a number change.`,
    { reason: 'phone-mismatch', maskedPhone: maskPhone(emp.phone) },
  );
}

/** The phone-number account only proves the number; the app runs as emp_{id}. */
async function deletePhoneUser(auth) {
  await getAuth()
    .deleteUser(auth.uid)
    .catch(e => logger.warn('could not delete phone user', e));
}

function requirePhoneAuth(request) {
  const auth = request.auth;
  const phone = auth?.token?.phone_number;
  if (!auth || auth.token.firebase?.sign_in_provider !== 'phone' || !phone) {
    throw new HttpsError('unauthenticated', 'Verify your mobile number first.');
  }
  return { auth, phone };
}

/**
 * Step 1 of login (ID + DOB), and again with { phone } before the OTP is sent, so a number
 * that isn't the registered one is stopped without sending an SMS. No auth needed.
 */
exports.verifyEmployee = onCall(async request => {
  const { employeeId, emp } = await checkCredentials(request, request.data?.employeeId, request.data?.dob);
  const phone = request.data?.phone ? normalizePhone(request.data.phone) : null;
  if (request.data?.phone && !phone) {
    throw new HttpsError('invalid-argument', 'Enter a valid mobile number.');
  }
  if (phone && emp.phone && emp.phone !== phone) {
    await audit('wrong-number-attempt', { employeeId, name: emp.name, phone });
    throw wrongNumberError(emp);
  }
  return { name: emp.name, maskedPhone: maskPhone(emp.phone) };
});

/** Step 3 of login: called while signed in with the phone number just verified by OTP. */
exports.linkEmployee = onCall(async request => {
  const { auth, phone } = requirePhoneAuth(request);
  const { employeeId, emp } = await checkCredentials(request, request.data?.employeeId, request.data?.dob);
  if (emp.phone && emp.phone !== phone) {
    await deletePhoneUser(auth);
    await audit('wrong-number-attempt', { employeeId, name: emp.name, phone });
    throw wrongNumberError(emp);
  }
  const firstLogin = !emp.phone;
  const uid = employeeUid(employeeId);
  const authAdmin = getAuth();

  try {
    await authAdmin.getUser(uid);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    await authAdmin.createUser({ uid, displayName: emp.name });
  }
  // One active phone per employee: anything signed in before now is logged out.
  await authAdmin.revokeRefreshTokens(uid);

  const now = Date.now();
  const userRef = db().doc(`users/${uid}`);
  const sessionVersion = await db().runTransaction(async tx => {
    const snap = await tx.get(userRef);
    const prev = snap.exists ? snap.data() : null;
    const next = (prev?.sessionVersion ?? 0) + 1;
    tx.set(
      userRef,
      {
        employeeId,
        name: emp.name,
        department: emp.department ?? '',
        phone,
        active: true,
        superAdmin: emp.superAdmin === true,
        admin: emp.admin === true,
        sessionVersion: next,
        teamIds: prev?.teamIds ?? [],
        fcmToken: null,
        createdAt: prev?.createdAt ?? now,
        lastLoginAt: now,
      },
      { merge: true },
    );
    tx.update(db().doc(`employees/${employeeId}`), {
      uid,
      phone,
      linkedAt: emp.linkedAt ?? now,
      lastLoginAt: now,
    });
    return next;
  });

  await audit(firstLogin ? 'first-login' : 'login', { employeeId, name: emp.name, phone });

  const token = await authAdmin.createCustomToken(uid, { employeeId });
  await deletePhoneUser(auth);
  return { token, sessionVersion };
});

/**
 * Number change: the employee proves ID + DOB and the new number (OTP), and a request goes to
 * the super admin. It does not log them in. One pending request per employee (the latest wins).
 */
exports.requestNumberChange = onCall(async request => {
  const { auth, phone } = requirePhoneAuth(request);
  const { employeeId, emp } = await checkCredentials(request, request.data?.employeeId, request.data?.dob);
  await deletePhoneUser(auth);
  if (!emp.phone || emp.phone === phone) {
    throw new HttpsError('failed-precondition', 'This number can already be used to log in.');
  }
  await db().doc(`numberChangeRequests/${employeeId}`).set({
    employeeId,
    name: emp.name,
    department: emp.department ?? '',
    oldPhone: emp.phone,
    newPhone: phone,
    status: 'pending',
    requestedAt: Date.now(),
  });
  await audit('number-change-requested', {
    employeeId,
    name: emp.name,
    phone,
    previousPhone: emp.phone,
  });
  // Tell the super admin(s); pushOnNotification sends it to their phones.
  const admins = await db().collection('users').where('superAdmin', '==', true).get();
  await Promise.all(
    admins.docs.map(d =>
      db()
        .collection('notifications')
        .add({
          teamId: '',
          userId: d.id,
          title: 'Mobile number change request',
          body: `${emp.name} (${employeeId}) wants to change to ${phone}`,
          type: 'number-change',
          read: false,
          createdAt: Date.now(),
        }),
    ),
  );
  return { maskedPhone: maskPhone(phone) };
});

// ---------------------------------------------------------------------------------------
// Super admin
// ---------------------------------------------------------------------------------------

async function requireSuperAdmin(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Please log in.');
  const snap = await db().doc(`users/${uid}`).get();
  const me = snap.data();
  if (!me || me.active !== true || me.superAdmin !== true) {
    throw new HttpsError('permission-denied', 'Only the super admin can do this.');
  }
  return { uid, employeeId: me.employeeId, name: me.name };
}

async function getEmployeeOrThrow(rawId) {
  const employeeId = normalizeEmployeeId(rawId);
  if (!employeeId) throw new HttpsError('invalid-argument', 'Invalid employee ID.');
  const snap = await db().doc(`employees/${employeeId}`).get();
  if (!snap.exists) throw new HttpsError('not-found', `Employee ${employeeId} not found.`);
  return { employeeId, emp: snap.data() };
}

/** Logs the employee out everywhere (their app signs out when sessionVersion changes). */
async function forceLogout(employeeId, extraUserFields = {}) {
  const uid = employeeUid(employeeId);
  const userRef = db().doc(`users/${uid}`);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    await userRef.update({ sessionVersion: FieldValue.increment(1), fcmToken: null, ...extraUserFields });
  }
  await getAuth()
    .revokeRefreshTokens(uid)
    .catch(e => {
      if (e.code !== 'auth/user-not-found') throw e;
    });
}

/**
 * Bulk import from the HR sheet. rows: [{ employeeId, name, dob: 'YYYY-MM-DD', department }].
 * dryRun returns the summary without writing. deactivateMissing deactivates active employees
 * that are not in the sheet (never the caller); employees deactivated by an earlier import are
 * reactivated when they reappear, but manual deactivations are kept.
 */
exports.importEmployees = onCall({ timeoutSeconds: 300, memory: '512MiB' }, async request => {
  const actor = await requireSuperAdmin(request);
  const { rows, dryRun = true, deactivateMissing = false } = request.data ?? {};
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new HttpsError('invalid-argument', 'The sheet has no rows.');
  }
  if (rows.length > 20000) throw new HttpsError('invalid-argument', 'Too many rows (max 20,000).');

  const errors = [];
  const incoming = new Map();
  rows.forEach((r, i) => {
    const line = i + 2; // header is row 1
    const employeeId = normalizeEmployeeId(r?.employeeId);
    const name = cleanText(r?.name);
    const dob = normalizeDob(r?.dob);
    const department = cleanText(r?.department, 60);
    if (!employeeId) return errors.push(`Row ${line}: invalid employee ID "${r?.employeeId ?? ''}"`);
    if (!name) return errors.push(`Row ${line}: name is missing`);
    if (!dob) return errors.push(`Row ${line}: invalid date of birth "${r?.dob ?? ''}"`);
    if (incoming.has(employeeId)) return errors.push(`Row ${line}: duplicate employee ID ${employeeId}`);
    incoming.set(employeeId, { employeeId, name, dob, department });
  });

  const [empSnap, secretSnap] = await Promise.all([
    db().collection('employees').get(),
    db().collection('employeeSecrets').get(),
  ]);
  const existing = new Map(empSnap.docs.map(d => [d.id, d.data()]));
  const secrets = new Map(secretSnap.docs.map(d => [d.id, d.data().dob]));

  const toCreate = [];
  const toUpdate = [];
  const toReactivate = [];
  let unchanged = 0;
  for (const row of incoming.values()) {
    const cur = existing.get(row.employeeId);
    if (!cur) {
      toCreate.push(row);
      continue;
    }
    const reactivate = cur.active !== true && cur.deactivatedBy === 'import';
    const changed =
      cur.name !== row.name || (cur.department ?? '') !== row.department || secrets.get(row.employeeId) !== row.dob;
    if (reactivate) toReactivate.push(row);
    else if (changed) toUpdate.push(row);
    else unchanged += 1;
  }
  const toDeactivate = deactivateMissing
    ? [...existing.entries()]
        .filter(([id, e]) => e.active === true && !incoming.has(id) && id !== actor.employeeId)
        .map(([id, e]) => ({ employeeId: id, name: e.name }))
    : [];

  const summary = {
    valid: incoming.size,
    created: toCreate.length,
    updated: toUpdate.length,
    reactivated: toReactivate.length,
    unchanged,
    deactivated: toDeactivate.length,
    errors: errors.slice(0, 50),
    errorCount: errors.length,
  };
  if (dryRun) return summary;

  const now = Date.now();
  const writer = db().bulkWriter();
  for (const row of toCreate) {
    writer.set(db().doc(`employees/${row.employeeId}`), {
      employeeId: row.employeeId,
      name: row.name,
      nameLower: row.name.toLowerCase(),
      department: row.department,
      active: true,
      superAdmin: false,
      phone: null,
      uid: null,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    });
    writer.set(db().doc(`employeeSecrets/${row.employeeId}`), { dob: row.dob });
  }
  for (const row of [...toUpdate, ...toReactivate]) {
    const fields = {
      name: row.name,
      nameLower: row.name.toLowerCase(),
      department: row.department,
      updatedAt: now,
    };
    if (toReactivate.includes(row)) Object.assign(fields, { active: true, deactivatedBy: null });
    writer.update(db().doc(`employees/${row.employeeId}`), fields);
    writer.set(db().doc(`employeeSecrets/${row.employeeId}`), { dob: row.dob });
    if (existing.get(row.employeeId).uid) {
      writer.set(
        db().doc(`users/${employeeUid(row.employeeId)}`),
        { name: row.name, department: row.department },
        { merge: true },
      );
    }
  }
  for (const { employeeId } of toDeactivate) {
    writer.update(db().doc(`employees/${employeeId}`), {
      active: false,
      deactivatedBy: 'import',
      updatedAt: now,
    });
  }
  await writer.close();
  await Promise.all(toDeactivate.map(({ employeeId }) => forceLogout(employeeId, { active: false })));

  await audit('import', {
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
    details: `${summary.created} added, ${summary.updated} updated, ${summary.reactivated} reactivated, ${summary.deactivated} deactivated`,
  });
  return summary;
});

/** Add or edit a single employee without re-uploading the sheet. dob is optional when editing. */
exports.upsertEmployee = onCall(async request => {
  const actor = await requireSuperAdmin(request);
  const employeeId = normalizeEmployeeId(request.data?.employeeId);
  const name = cleanText(request.data?.name);
  const department = cleanText(request.data?.department, 60);
  const rawDob = request.data?.dob;
  const dob = rawDob ? normalizeDob(rawDob) : null;
  if (!employeeId) throw new HttpsError('invalid-argument', 'Invalid employee ID.');
  if (!name) throw new HttpsError('invalid-argument', 'Name is required.');
  if (rawDob && !dob) throw new HttpsError('invalid-argument', 'Invalid date of birth.');

  const ref = db().doc(`employees/${employeeId}`);
  const snap = await ref.get();
  const now = Date.now();
  if (!snap.exists) {
    if (!dob) throw new HttpsError('invalid-argument', 'Date of birth is required for a new employee.');
    await ref.set({
      employeeId,
      name,
      nameLower: name.toLowerCase(),
      department,
      active: true,
      superAdmin: false,
      phone: null,
      uid: null,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await ref.update({ name, nameLower: name.toLowerCase(), department, updatedAt: now });
    if (snap.data().uid) {
      await db().doc(`users/${employeeUid(employeeId)}`).set({ name, department }, { merge: true });
    }
  }
  if (dob) await db().doc(`employeeSecrets/${employeeId}`).set({ dob });

  await audit(snap.exists ? 'employee-edited' : 'employee-added', {
    employeeId,
    name,
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
    ...(dob && snap.exists ? { details: 'Date of birth changed' } : {}),
  });
  return { created: !snap.exists };
});

exports.setEmployeeActive = onCall(async request => {
  const actor = await requireSuperAdmin(request);
  const { employeeId, emp } = await getEmployeeOrThrow(request.data?.employeeId);
  const active = request.data?.active === true;
  if (!active && employeeId === actor.employeeId) {
    throw new HttpsError('failed-precondition', 'You cannot deactivate yourself.');
  }
  await db()
    .doc(`employees/${employeeId}`)
    .update({ active, deactivatedBy: active ? null : 'manual', updatedAt: Date.now() });
  if (active) {
    const userRef = db().doc(`users/${employeeUid(employeeId)}`);
    if ((await userRef.get()).exists) await userRef.update({ active: true });
  } else {
    await forceLogout(employeeId, { active: false });
  }
  await audit(active ? 'activated' : 'deactivated', {
    employeeId,
    name: emp.name,
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
  });
});

exports.unlockEmployee = onCall(async request => {
  const actor = await requireSuperAdmin(request);
  const { employeeId, emp } = await getEmployeeOrThrow(request.data?.employeeId);
  await db().doc(`employees/${employeeId}`).update({ failedAttempts: 0, lockedUntil: null });
  await audit('unlocked', { employeeId, name: emp.name, actorEmployeeId: actor.employeeId, actorName: actor.name });
});

exports.logoutEmployee = onCall(async request => {
  const actor = await requireSuperAdmin(request);
  const { employeeId, emp } = await getEmployeeOrThrow(request.data?.employeeId);
  await forceLogout(employeeId);
  await audit('forced-logout', {
    employeeId,
    name: emp.name,
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
  });
});

/** Super admin: approve or reject a pending number change ({ employeeId, approve }). */
exports.decideNumberChange = onCall(async request => {
  const actor = await requireSuperAdmin(request);
  const { employeeId, emp } = await getEmployeeOrThrow(request.data?.employeeId);
  const approve = request.data?.approve === true;
  const reqRef = db().doc(`numberChangeRequests/${employeeId}`);
  const req = (await reqRef.get()).data();
  if (!req || req.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'There is no pending request for this employee.');
  }
  const now = Date.now();
  if (approve) {
    await db().doc(`employees/${employeeId}`).update({ phone: req.newPhone, updatedAt: now });
    // The old phone is logged out; the employee logs in again with the new number.
    await forceLogout(employeeId);
  }
  await reqRef.update({
    status: approve ? 'approved' : 'rejected',
    decidedAt: now,
    decidedBy: actor.employeeId,
  });
  await audit(approve ? 'number-change-approved' : 'number-change-rejected', {
    employeeId,
    name: emp.name,
    phone: req.newPhone,
    previousPhone: req.oldPhone,
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
  });
});

/**
 * Super admin: clear the registered number (e.g. someone else registered first). The next
 * login with ID + DOB registers whichever number is used. Logs out the current phone.
 */
exports.resetEmployeePhone = onCall(async request => {
  const actor = await requireSuperAdmin(request);
  const { employeeId, emp } = await getEmployeeOrThrow(request.data?.employeeId);
  await db().doc(`employees/${employeeId}`).update({ phone: null, updatedAt: Date.now() });
  await forceLogout(employeeId);
  await db()
    .doc(`numberChangeRequests/${employeeId}`)
    .delete()
    .catch(() => {});
  await audit('phone-reset', {
    employeeId,
    name: emp.name,
    previousPhone: emp.phone ?? undefined,
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
  });
});

// ---------------------------------------------------------------------------------------
// Teams. Admins (VP level, marked by the super admin) create teams and manage the members of
// teams they belong to; inside a team they have full task rights. Everyone else is a member.
// ---------------------------------------------------------------------------------------

async function requireActiveUser(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Please log in.');
  const me = (await db().doc(`users/${uid}`).get()).data();
  if (!me || me.active !== true) throw new HttpsError('permission-denied', 'Your access is disabled.');
  return { uid, ...me, teamIds: me.teamIds ?? [] };
}

const isAdminUser = u => u?.admin === true || u?.superAdmin === true;

async function requireTeamManager(request, teamId) {
  const me = await requireActiveUser(request);
  if (me.superAdmin === true || (me.admin === true && me.teamIds.includes(teamId))) return me;
  throw new HttpsError('permission-denied', 'Only an admin of this team can do this.');
}

async function getTeamOrThrow(teamId) {
  if (!teamId) throw new HttpsError('invalid-argument', 'Team is required.');
  const snap = await db().doc(`teams/${teamId}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Team not found.');
  return snap.data();
}

/** Profile fields for an employee who has never logged in (created ahead of time). */
function newProfile(employeeId, emp) {
  return {
    employeeId,
    name: emp.name,
    department: emp.department ?? '',
    phone: null,
    active: emp.active === true,
    superAdmin: emp.superAdmin === true,
    admin: emp.admin === true,
    sessionVersion: 0,
    teamIds: [],
    fcmToken: null,
    createdAt: Date.now(),
  };
}

/** Super admin: mark an employee as Admin (can create and manage teams). */
exports.setAdmin = onCall(async request => {
  const actor = await requireSuperAdmin(request);
  const { employeeId, emp } = await getEmployeeOrThrow(request.data?.employeeId);
  const value = request.data?.value === true;
  await db().doc(`employees/${employeeId}`).update({ admin: value, updatedAt: Date.now() });
  const userRef = db().doc(`users/${employeeUid(employeeId)}`);
  const snap = await userRef.get();
  if (snap.exists) await userRef.update({ admin: value });
  else await userRef.set({ ...newProfile(employeeId, emp), admin: value });
  await audit(value ? 'admin-granted' : 'admin-removed', {
    employeeId,
    name: emp.name,
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
  });
});

/**
 * Adds an employee to a team ({ teamId, member: true }) or removes them ({ member: false }).
 * Allowed for the super admin and for admins of that team. A team always keeps one admin.
 */
exports.setTeamAccess = onCall(async request => {
  const teamId = request.data?.teamId ? String(request.data.teamId) : null;
  const team = await getTeamOrThrow(teamId);
  const actor = await requireTeamManager(request, teamId);
  const { employeeId, emp } = await getEmployeeOrThrow(request.data?.employeeId);
  const member = request.data?.member !== false;
  const userRef = db().doc(`users/${employeeUid(employeeId)}`);

  await db().runTransaction(async tx => {
    const snap = await tx.get(userRef);
    const prev = snap.exists ? snap.data() : null;
    const teamIds = new Set(prev?.teamIds ?? []);
    if (member) {
      if (!emp.active) throw new HttpsError('failed-precondition', `${emp.name} is deactivated.`);
      teamIds.add(teamId);
    } else {
      if (!teamIds.has(teamId)) return;
      if (isAdminUser(prev)) {
        const members = await tx.get(db().collection('users').where('teamIds', 'array-contains', teamId));
        const otherAdmins = members.docs.filter(d => d.id !== userRef.id && isAdminUser(d.data()));
        if (otherAdmins.length === 0) {
          throw new HttpsError(
            'failed-precondition',
            `${team.name} needs at least one admin. Add another admin to the team first.`,
          );
        }
      }
      teamIds.delete(teamId);
    }
    if (prev) tx.update(userRef, { teamIds: [...teamIds] });
    else tx.set(userRef, { ...newProfile(employeeId, emp), teamIds: [...teamIds] });
  });

  await audit(member ? 'team-member-added' : 'team-member-removed', {
    employeeId,
    name: emp.name,
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
    details: team.name,
  });
});

/**
 * Admins and the super admin create teams. Admins always join the teams they create; the super
 * admin can create a team for others from Super Admin → Teams ({ join: false }).
 */
exports.createTeam = onCall(async request => {
  const actor = await requireActiveUser(request);
  if (!isAdminUser(actor)) throw new HttpsError('permission-denied', 'Only admins can create teams.');
  const name = cleanText(request.data?.name, 60);
  if (!name) throw new HttpsError('invalid-argument', 'Team name is required.');
  const existing = await db().collection('teams').get();
  if (existing.docs.some(d => String(d.data().name).toLowerCase() === name.toLowerCase())) {
    throw new HttpsError('already-exists', `A team called ${name} already exists.`);
  }
  const ref = await db().collection('teams').add({ name, createdBy: actor.uid, createdAt: Date.now() });
  if (request.data?.join !== false || actor.superAdmin !== true) {
    await db().doc(`users/${actor.uid}`).update({ teamIds: FieldValue.arrayUnion(ref.id) });
  }
  await audit('team-created', { actorEmployeeId: actor.employeeId, actorName: actor.name, details: name });
  return { id: ref.id };
});

exports.renameTeam = onCall(async request => {
  const teamId = request.data?.teamId ? String(request.data.teamId) : null;
  const team = await getTeamOrThrow(teamId);
  const actor = await requireTeamManager(request, teamId);
  const name = cleanText(request.data?.name, 60);
  if (!name) throw new HttpsError('invalid-argument', 'Team name is required.');
  await db().doc(`teams/${teamId}`).update({ name });
  await audit('team-renamed', {
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
    details: `${team.name} → ${name}`,
  });
});

/** Employee lookup for admins adding members: ID, name and department only. */
exports.searchEmployeesForTeam = onCall(async request => {
  const me = await requireActiveUser(request);
  if (!isAdminUser(me)) throw new HttpsError('permission-denied', 'Only admins can add members.');
  const term = cleanText(request.data?.query, 60);
  if (term.length < 2) return { results: [] };
  const results = new Map();
  const byId = await db().doc(`employees/${term.toUpperCase()}`).get();
  if (byId.exists) results.set(byId.id, byId.data());
  const lower = term.toLowerCase();
  const byName = await db()
    .collection('employees')
    .orderBy('nameLower')
    .startAt(lower)
    .endAt(`${lower}`)
    .limit(30)
    .get();
  byName.docs.forEach(d => results.set(d.id, d.data()));
  return {
    results: [...results.values()]
      .filter(e => e.active === true)
      .map(e => ({ employeeId: e.employeeId, name: e.name, department: e.department ?? '' })),
  };
});
