import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCeKZ75c60ChSc3AQhP_U8j84Kt6Chegjc",
  authDomain: "lcc-daet-fes.firebaseapp.com",
  projectId: "lcc-daet-fes",
  storageBucket: "lcc-daet-fes.firebasestorage.app",
  messagingSenderId: "603001147102",
  appId: "1:603001147102:web:09f9b92d2c4114756f7c4f",
  measurementId: "G-BMB93BL510"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { auth, db, app }
