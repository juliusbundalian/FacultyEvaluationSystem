<template>
  <div class="d-flex row gap-1">
    <div class="ch4">Register</div>
    <div class="body1">Create an account</div>
  </div>

  <div>
    <form class="d-flex row gap-4" @submit.prevent="register">
      <!-- Username -->
      <div>
        <label for="username" class="form-label m-0">Username</label>
        <input
          v-model="username"
          type="text"
          class="form-control"
          id="username"
          placeholder="Enter your username"
          required
        />
      </div>

      <!-- Email -->
      <div>
        <label for="email" class="form-label m-0">Email</label>
        <input
          v-model="email"
          type="email"
          class="form-control"
          id="email"
          placeholder="Enter your email"
          required
        />
      </div>

      <!-- Password -->
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

      <!-- Submit -->
      <div class="d-grid">
        <button type="submit" class="btn btn-primary">Register</button>
      </div>

      <!-- Login Link -->
      <div class="text-center">
        <p class="small">
          Already have an account?
          <router-link to="/" class="text-decoration-none">Login</router-link>
        </p>
      </div>
    </form>
  </div>
</template>

<script>
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { app } from "../../firebase"; // <-- your firebase init file

import visibleIcon from "@/assets/icons/visibility.svg";
import hiddenIcon from "@/assets/icons/visibility_off.svg";

export default {
  name: "Register",
  data() {
    return {
      showPassword: false,
      visibleIcon,
      hiddenIcon,
      username: "",
      email: "",
      password: "",
    };
  },
  methods: {
    togglePassword() {
      this.showPassword = !this.showPassword;
    },
    async register() {
      try {
        const auth = getAuth(app);
        const db = getFirestore(app);

        // create user with email/password
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          this.email,
          this.password
        );

        const user = userCredential.user;

        // update display name
        await updateProfile(user, {
          displayName: this.username,
        });

        // save additional data in Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          username: this.username,
          email: this.email,
          createdAt: new Date(),
        });

        alert("Account created successfully!");
        this.$router.push("/"); // redirect to login
      } catch (error) {
        console.error("Registration error:", error.message);
        alert(error.message);
      }
    },
  },
};
</script>
