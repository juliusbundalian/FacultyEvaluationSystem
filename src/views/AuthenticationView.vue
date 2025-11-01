<template>
  <div class="container-fluid d-flex align-items-center justify-content-center">
    <div class="col-10 col-sm-4 d-flex gap-4 card main-bg border-1 p-5">
      <img
        src="@/assets/images/logo-text.png"
        class=""
        style="height: 80%; width: 80%"
        alt="logo"
      />
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AuthenticationView',
}
</script>

<style lang="less" scoped></style>
