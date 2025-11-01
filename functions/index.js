const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()
const db = admin.firestore()

/**
 * Callable function to bulk create faculty accounts.
 * Expects data: { users: [{ id,name,email,department,status }], passwordLength }
 * Returns: { successes: [{ email, uid, password, id, department, status }], failures: [{ email, error }] }
 */
exports.bulkCreateFaculty = functions.region('us-central1').https.onCall(async (data, context) => {
  // Debug logging to see what auth context we're getting
  console.log('=== FUNCTION START ===')
  console.log('Function called with data:', JSON.stringify(data, null, 2))
  console.log('context.auth exists:', !!context.auth)
  console.log('context.auth.uid:', context.auth?.uid)
  console.log('context.auth.token:', context.auth?.token ? 'present' : 'missing')
  console.log('context.auth object:', context.auth)

  // TEMPORARILY ALLOW CALLS WITHOUT AUTH FOR DEBUGGING
  if (!context.auth) {
    console.error('No auth context found - but continuing for debug')
    // Don't throw error for now - just log it
    // throw new functions.https.HttpsError('unauthenticated', 'Request has no auth context')
  } else {
    console.log('Auth context found successfully!')
  }

  const users = Array.isArray(data.users) ? data.users : []
  const passwordLength = data.passwordLength || 12

  const successes = []
  const failures = []

  const generatePassword = (len) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
    let out = ''
    for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length))
    return out
  }

  for (const u of users) {
    const email = (u.email || '').toString().trim()
    const displayName = (u.name || '')
    const department = u.department || ''
    const status = u.status || 'active'
    const externalId = u.id || null

    if (!email) {
      failures.push({ email: null, error: 'missing email' })
      continue
    }

    const password = generatePassword(passwordLength)

    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
      })

      // save user meta in Firestore 'Users' collection using uid
      await db.collection('Users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        id: externalId,
        name: displayName,
        email,
        department,
        status,
        role: 'teacher',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      successes.push({ email, uid: userRecord.uid, password, id: externalId, department, status })
    } catch (err) {
      console.error('bulkCreateFaculty failure for', email, err)
      failures.push({ email, error: err.message || String(err) })
    }
  }

  return { successes, failures }
})
