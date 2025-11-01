<template>
  <div class="d-flex flex-column gap-4">
    <div class="d-flex flex-column gap-1">
      <div class="ch4">Evaluation Forms</div>
      <div class="body1">description</div>
    </div>
    <div class="d-flex flex-column flex-lg-row gap-4">
      <div class="flex-fill card p-3">
        <div class="card-body">
          <div class="d-flex gap-4">
            <div class="gap-1 flex-column">
              <div class="ch4">Students to Faculty</div>
              <div class="body1">Feedback from students</div>
            </div>
            <button class="icon-btn--lg btn--label-warning ms-auto">
              <span class="icon">groups</span>
            </button>
          </div>
        </div>
      </div>
      
      <div class="flex-fill card p-3">
        <div class="card-body ">
          <div class="d-flex gap-4">

            <div class="gap-1 flex-column">
              <div class="ch4">Faculty to Faculty</div>
              <div class="body1">Peer-to-peer evaluation</div>
            </div>
            <button class="icon-btn--lg btn--label-info ms-auto">
              <span class="icon">group</span>
            </button>
          
          </div>
        </div>
      </div>

      <div class="flex-fill card p-3">
        <div class="card-body ">
          <div class="d-flex gap-4">

            <div class="gap-1 flex-column">
              <div class="ch4">Faculty Self Evaluation</div>
              <div class="body1">Self-assessment form</div>
            </div>
            <button class="icon-btn--lg btn--label-success ms-auto">
              <span class="icon">person</span>
            </button>

          </div>
        </div>
      </div>
    </div> 
    

    <div class="d-flex flex-column gap-4">
      <RouterView />
    </div>
  </div>
</template>

<script>
export default {
  name: 'EvaluationView',
}
</script>

<style scoped lang="less">
@import '@/styles/index.less';
.card {
  cursor: pointer;
  transition: all 0.1s linear;
}

.card:hover {
  background-color: @hover;
  transform: translateY(-2px);
}

.ch4  {
  color: @text-primary;
}

.body1 {
  color: @text-secondary;
}
</style>