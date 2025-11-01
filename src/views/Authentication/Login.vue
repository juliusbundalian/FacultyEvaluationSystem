<template>
  <div class="d-flex row gap-1">
    <div class="ch4">Welcome!</div>
    <div class="body1">Please enter your credentials to login</div>
  </div>

  <div v-if="error" class="alert alert-danger m-0" role="alert">
    {{ error }}
  </div>

  <div>
    <form class="d-flex row gap-4" @submit.prevent="login">
      <div>
        <label for="userId" class="form-label m-0">User ID</label>
        <input
          v-model="userId"
          type="text"
          class="form-control"
          id="userId"
          placeholder="Enter your user ID"
          required
        />
      </div>

      <div>
        <label for="password" class="form-label m-0">Password</label>
        <div class="input-group">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="form-control"
            id="password"
            placeholder="Enter your password"
            required
          />
          <button
            class="btn btn-outline-secondary"
            type="button"
            @click="togglePassword"
            tabindex="-1"
          >
            <img :src="showPassword ? hiddenIcon : visibleIcon" alt="Toggle visibility" />
          </button>
        </div>
      </div>

      <div class="d-grid">
        <button type="submit" class="btn btn-primary" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          <span v-if="!loading">Login</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import visibleIcon from "@/assets/icons/visibility.svg"
import hiddenIcon from "@/assets/icons/visibility_off.svg"

export default {
  name: "Login",
  data() {
    return {
      userId: "",
      password: "",
      showPassword: false,
      visibleIcon,
      hiddenIcon,
      error: "",
      loading: false,
    }
  },
  methods: {
    togglePassword() {
      this.showPassword = !this.showPassword
    },

    async login() {
      this.loading = true
      this.error = ""

      try {
        // 🔹 Step 1: Find user by ID in Firestore
        const q = query(collection(db, "Users"), where("id", "==", this.userId))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          throw new Error("User ID not found")
        }

        const userDoc = querySnapshot.docs[0].data()
        const email = userDoc.email
        const role = userDoc.role?.toLowerCase() || "student" // default fallback

        // 🔹 Step 2: Authenticate with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, this.password)
        console.log("✅ Logged in:", userCredential.user)
        console.log("👤 Role:", role)

        // 🔹 Step 3: Redirect by role
        if (role === "admin") {
          this.$router.push("/main/evaluation")
        } else {
          this.$router.push("/evaluations") // student or any other role
        }
      } catch (err) {
        console.error("❌ Login error:", err)
        this.error = "Invalid User ID or password."
      } finally {
        this.loading = false
      }
    },
  },
}
</script>


<style scoped lang="less">
.form-control{
  background-color: transparent;
}
</style>