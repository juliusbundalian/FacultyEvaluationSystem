import { defineStore } from "pinia"
import { auth, db } from "@/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import router from "@/router"   // ✅ import the router instance


export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,        // Firebase user (basic info)
    userData: null,    // Extra Firestore data (userId, role, etc.)
    loading: true,     // Track auth state resolving
  }),
  actions: {
    async init() {
      console.log("🚀 Initializing auth listener...")

      onAuthStateChanged(auth, async (user) => {
        this.loading = false
        this.user = user

        if (user) {
          console.log("👤 Firebase Auth user:", {
            uid: user.uid,
            email: user.email
          })

          try {
            const q = query(collection(db, "Users"), where("email", "==", user.email))
            const snapshot = await getDocs(q)

            if (!snapshot.empty) {
              this.userData = snapshot.docs[0].data()
              console.log("📄 Firestore userData loaded:", this.userData)
            } else {
              console.warn("⚠️ No Firestore document found for:", user.email)
              this.userData = null
            }
          } catch (err) {
            console.error("❌ Firestore query error:", err)
          }
        } else {
          console.log("🚪 No authenticated user")
          this.userData = null
        }
      })
    },

    async logout() {
      console.log("🔒 Logging out...")
      await signOut(auth)
      this.user = null
      this.userData = null
      console.log("✅ Logout complete")
      router.push({ path: "/" })  // ✅ redirect to login after logout
    }
  },
  getters: {
    isAuthenticated: (state) => {
      const result = !!state.user
      console.log("🔎 isAuthenticated?", result)
      return result
    },
    role: (state) => {
      const role = state.userData?.role || "guest"
      console.log("🎭 User role:", role)
      return role
    }
  }
})
