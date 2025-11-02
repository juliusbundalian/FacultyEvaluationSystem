const functions = require('firebase-functions')
const admin = require('firebase-admin')
const nodemailer = require('nodemailer')

admin.initializeApp()
const db = admin.firestore()

// Email transporter configuration - Updated 2025-11-01
// Using Firebase Functions config for email credentials
const emailTransporter = nodemailer.createTransport({
  service: 'gmail', // or 'smtp', 'sendgrid', etc.
  auth: {
    user: functions.config().email?.user || 'your-email@gmail.com',
    pass: functions.config().email?.password || 'your-app-password',
  },
})

// Customizable email template with credentials
const createInvitationEmailHTML = (facultyName, department, userId, tempPassword, loginUrl) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Faculty Evaluation System - Account Created</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials { background: #e9ecef; border: 2px solid #007bff; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 16px; font-weight: bold; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>La Consolacion College of Daet</h1>
      <h1>Faculty Evaluation System</h1>
    </div>
    <div class="content">
      <h2>Welcome, ${facultyName}!</h2>
      <p>Your account has been successfully created for the Faculty Evaluation System.</p>
      
      <div class="credentials">
        <h3>🔐 Your Login Credentials</h3>
        <p><strong>User ID:</strong> <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px;">${userId}</code></p>
        <p><strong>Temporary Password:</strong> <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px;">${tempPassword}</code></p>
      </div>
      
      <div class="warning">
        <strong>⚠️ Important Security Notice:</strong> Please change your password after your first login for security purposes.
      </div>
      
      <div style="text-align: center;">
        <a href="${loginUrl}" class="button">🚀 Login to Faculty Evaluation System</a>
      </div>
      
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Click the login button above to access the system</li>
        <li>Use your User ID and temporary password to sign in</li>
        <li>Change your password to something secure and memorable</li>
      </ol>
      
      <p>If you have any questions or need assistance, please contact the system administrator.</p>

      <p>Best regards,<br>La Consolacion College of Daet</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Send welcome email with login credentials
 */
const sendInvitationEmail = async (email, facultyName, department, userId, tempPassword) => {
  // Skip email sending if credentials not properly configured
  const emailUser = functions.config().email?.user
  const emailPass = functions.config().email?.password

  if (
    !emailUser ||
    !emailPass ||
    emailUser === 'your-email@gmail.com' ||
    emailPass === 'your-app-password'
  ) {
    console.log(`Email skipped for ${email} - email credentials not configured`)
    return {
      success: false,
      error:
        'Email credentials not configured. Please set up email.user and email.password in Firebase Functions config.',
    }
  }

  const loginUrl = 'https://lcc-daet-fes.web.app/'

  const mailOptions = {
    from: `"Faculty Evaluation System" <${emailUser}>`,
    to: email,
    subject: `Faculty Evaluation System - Your Account Credentials`,
    html: createInvitationEmailHTML(facultyName, department, userId, tempPassword, loginUrl),
    text: `
Welcome ${facultyName}!

Your account has been created for the Faculty Evaluation System in the ${department} department.

LOGIN CREDENTIALS:
User ID: ${userId}
Temporary Password: ${tempPassword}

Login URL: ${loginUrl}

Please change your password after your first login for security.

Best regards,
La Consolacion College of Daet
    `.trim(),
  }

  try {
    // Debug: Log email configuration (without password)
    const config = functions.config()
    console.log('Email config check:', {
      user: config.email?.user,
      passwordSet: !!config.email?.password,
      passwordLength: config.email?.password?.length,
    })

    await emailTransporter.sendMail(mailOptions)
    console.log(`✅ Email sent successfully to ${email}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Email sending failed for', email, ':', error.message)
    console.error('Full error details:', error)
    return { success: false, error: error.message }
  }
}

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
    const displayName = u.name || ''
    const department = u.department || ''
    const status = u.status || 'active'
    const externalId = u.id || null

    if (!email) {
      failures.push({ email: null, error: 'missing email' })
      continue
    }

    try {
      // Create auth account with temporary password
      const tempPassword = generatePassword(passwordLength)
      const userRecord = await admin.auth().createUser({
        email,
        password: tempPassword,
        displayName,
        emailVerified: true, // Account is ready to use with temp password
      })

      // Save user metadata in Firestore
      await db.collection('Users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        id: externalId,
        name: displayName,
        email,
        department,
        status: 'active', // Account is ready to use
        role: 'teacher',
        accountSetupCompleted: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // Send welcome email with login credentials
      const emailResult = await sendInvitationEmail(
        email,
        displayName,
        department,
        externalId,
        tempPassword,
      )

      if (emailResult.success) {
        successes.push({
          email,
          uid: userRecord.uid,
          tempPassword, // Include for console logging
          emailSent: true,
          id: externalId,
          department,
          status: 'account-ready',
        })
      } else {
        // Account created but email failed
        successes.push({
          email,
          uid: userRecord.uid,
          tempPassword, // Include for console logging even if email failed
          emailSent: false,
          emailError: emailResult.error,
          id: externalId,
          department,
          status: 'email-failed',
        })
      }
    } catch (err) {
      console.error('bulkCreateFaculty failure for', email, err)
      failures.push({ email, error: err.message || String(err) })
    }
  }

  return { successes, failures }
})

// Student email template with credentials
const createStudentWelcomeEmailHTML = (
  studentName,
  program,
  yearLevel,
  studentId,
  tempPassword,
  loginUrl,
) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Faculty Evaluation System - Student Account Created</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials { background: #e9ecef; border: 2px solid #007bff; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 16px; font-weight: bold; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>La Consolacion College of Daet</h1>
      <h1>Faculty Evaluation System</h1>
    </div>
    <div class="content">
      <h2>Welcome, ${studentName}!</h2>
      <p>Your student account has been successfully created for the Faculty Evaluation System.</p>
      <p><strong>Program:</strong> ${program} - Year ${yearLevel}</p>
      
      <div class="credentials">
        <h3>🔐 Your Login Credentials</h3>
        <p><strong>Student ID:</strong> <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px;">${studentId}</code></p>
        <p><strong>Temporary Password:</strong> <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px;">${tempPassword}</code></p>
      </div>
      
      <div class="warning">
        <strong>⚠️ Important Security Notice:</strong> Please change your password after your first login for security purposes.
      </div>
      
      <div style="text-align: center;">
        <a href="${loginUrl}" class="button">🚀 Login to Faculty Evaluation System</a>
      </div>
      
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Click the login button above to access the system</li>
        <li>Use your Student ID and temporary password to sign in</li>
        <li>Change your password to something secure and memorable</li>
        <li>Complete your profile setup</li>
      </ol>
      
      <p>You will use this system to evaluate your professors for each subject you're enrolled in.</p>
      
      <p>If you have any questions or need assistance, please contact the system administrator.</p>

      <p>Best regards,<br>La Consolacion College of Daet</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Send welcome email to students with login credentials
 */
const sendStudentWelcomeEmail = async (
  email,
  studentName,
  program,
  yearLevel,
  studentId,
  tempPassword,
) => {
  // Skip email sending if credentials not properly configured
  const emailUser = functions.config().email?.user
  const emailPass = functions.config().email?.password

  if (
    !emailUser ||
    !emailPass ||
    emailUser === 'your-email@gmail.com' ||
    emailPass === 'your-app-password'
  ) {
    console.log(`Email skipped for ${email} - email credentials not configured`)
    return {
      success: false,
      error:
        'Email credentials not configured. Please set up email.user and email.password in Firebase Functions config.',
    }
  }

  const loginUrl = 'https://lcc-daet-fes.web.app/'

  const mailOptions = {
    from: `"Faculty Evaluation System" <${emailUser}>`,
    to: email,
    subject: `Faculty Evaluation System - Your Student Account Credentials`,
    html: createStudentWelcomeEmailHTML(
      studentName,
      program,
      yearLevel,
      studentId,
      tempPassword,
      loginUrl,
    ),
    text: `
Welcome ${studentName}!

Your student account has been created for the Faculty Evaluation System.

Program: ${program} - Year ${yearLevel}

LOGIN CREDENTIALS:
Student ID: ${studentId}
Temporary Password: ${tempPassword}

Login URL: ${loginUrl}

Please change your password after your first login for security.

Best regards,
La Consolacion College of Daet
    `.trim(),
  }

  try {
    // Debug: Log email configuration (without password)
    const config = functions.config()
    console.log('Email config check:', {
      user: config.email?.user,
      passwordSet: !!config.email?.password,
      passwordLength: config.email?.password?.length,
    })

    await emailTransporter.sendMail(mailOptions)
    console.log(`✅ Email sent successfully to ${email}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Email sending failed for', email, ':', error.message)
    console.error('Full error details:', error)
    return { success: false, error: error.message }
  }
}
/**
 * Callable function to bulk create students and their enrollments
 * Expects data: { students: [...], passwordLength?: number }
 * Each student: { studentId, studentName, email, yearLevel, program, semester, subjectCode, subjectName, teacherId, teacherName, section?, status? }
 * Returns: { successes: [...], failures: [...] }
 */
exports.bulkCreateStudents = functions.region('us-central1').https.onCall(async (data, context) => {
  console.log('bulkCreateStudents called with data:', data)
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

  const enrollmentData = Array.isArray(data.students) ? data.students : []
  const passwordLength = data.passwordLength || 12

  const successes = []
  const failures = []

  const generatePassword = (len) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
    let out = ''
    for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length))
    return out
  }

  // Group enrollment data by student ID
  const studentsMap = new Map()

  for (const enrollment of enrollmentData) {
    const studentId = (enrollment.studentId || '').toString().trim()
    const email = (enrollment.email || '').toString().trim()
    const studentName = enrollment.studentName || ''
    const yearLevel = parseInt(enrollment.yearLevel) || 1
    const program = enrollment.program || ''
    const status = enrollment.status || 'active'
    const section = enrollment.section || ''

    if (!studentId || !email || !studentName) {
      failures.push({
        studentId,
        email: email || null,
        error: 'Missing required fields: studentId, email, or studentName',
      })
      continue
    }

    // Group by student ID
    if (!studentsMap.has(studentId)) {
      studentsMap.set(studentId, {
        studentId,
        studentName,
        email,
        yearLevel,
        program,
        status,
        section,
        enrollments: [],
      })
    }

    // Add enrollment data
    studentsMap.get(studentId).enrollments.push({
      semester: enrollment.semester || '',
      subjectCode: enrollment.subjectCode || '',
      subjectName: enrollment.subjectName || '',
      teacherId: enrollment.teacherId || '',
      teacherName: enrollment.teacherName || '',
    })
  }

  console.log(
    `Processing ${studentsMap.size} unique students with ${enrollmentData.length} total enrollments`,
  )

  // Process each unique student
  for (const [studentId, studentData] of studentsMap) {
    try {
      let userRecord = null
      let tempPassword = null
      let isNewStudent = false

      // Check if student already exists in Auth
      try {
        // Try to find existing user by email
        userRecord = await admin.auth().getUserByEmail(studentData.email)
        console.log(`Student ${studentId} already exists in Auth:`, userRecord.uid)
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          // Create new student account
          tempPassword = generatePassword(passwordLength)
          userRecord = await admin.auth().createUser({
            email: studentData.email,
            password: tempPassword,
            displayName: studentData.studentName,
            emailVerified: true, // Account is ready to use
          })
          isNewStudent = true
          console.log(`Created new student Auth account: ${studentId} -> ${userRecord.uid}`)
        } else {
          throw err
        }
      }

      // Create or update student in Users collection
      if (isNewStudent) {
        await db.collection('Users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          id: studentData.studentId,
          name: studentData.studentName,
          email: studentData.email,
          yearLevel: studentData.yearLevel,
          program: studentData.program,
          section: studentData.section,
          status: studentData.status,
          role: 'student',
          accountSetupCompleted: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        console.log(`Created student in Users collection: ${studentId}`)
      } else {
        // Update existing student data
        await db.collection('Users').doc(userRecord.uid).update({
          name: studentData.studentName,
          yearLevel: studentData.yearLevel,
          program: studentData.program,
          section: studentData.section,
          status: studentData.status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        console.log(`Updated existing student in Users collection: ${studentId}`)
      }

      // Create enrollment records
      const enrollmentPromises = studentData.enrollments.map(async (enrollment) => {
        const enrollmentDoc = {
          studentId: studentData.studentId,
          studentName: studentData.studentName,
          yearLevel: studentData.yearLevel,
          program: studentData.program,
          semester: enrollment.semester,
          subjectCode: enrollment.subjectCode,
          subjectName: enrollment.subjectName,
          teacherId: enrollment.teacherId,
          teacherName: enrollment.teacherName,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }

        await db.collection('Enrollments').add(enrollmentDoc)
        console.log(`Created enrollment: ${studentData.studentId} -> ${enrollment.subjectCode}`)
      })

      await Promise.all(enrollmentPromises)

      // Send welcome email only for new students
      let emailResult = { success: true, skipped: true }
      if (isNewStudent && tempPassword) {
        emailResult = await sendStudentWelcomeEmail(
          studentData.email,
          studentData.studentName,
          studentData.program,
          studentData.yearLevel,
          studentData.studentId,
          tempPassword,
        )
      }

      if (emailResult.success) {
        successes.push({
          studentId: studentData.studentId,
          email: studentData.email,
          uid: userRecord.uid,
          tempPassword: isNewStudent ? tempPassword : 'existing-account',
          emailSent: isNewStudent && !emailResult.skipped,
          enrollmentsCreated: studentData.enrollments.length,
          isNewStudent,
          program: studentData.program,
          yearLevel: studentData.yearLevel,
          status: 'account-ready',
        })
      } else {
        // Account created but email failed
        successes.push({
          studentId: studentData.studentId,
          email: studentData.email,
          uid: userRecord.uid,
          tempPassword: tempPassword || 'existing-account',
          emailSent: false,
          emailError: emailResult.error,
          enrollmentsCreated: studentData.enrollments.length,
          isNewStudent,
          program: studentData.program,
          yearLevel: studentData.yearLevel,
          status: 'email-failed',
        })
      }
    } catch (err) {
      console.error('bulkCreateStudents failure for', studentId, err)
      failures.push({
        studentId,
        email: studentData.email,
        error: err.message || String(err),
      })
    }
  }

  return { successes, failures }
})
