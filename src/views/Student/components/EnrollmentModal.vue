<template>
  <div
    v-if="visible"
    class="modal fade show d-block"
    tabindex="-1"
    style="background: rgba(0, 0, 0, 0.5)"
  >
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content rounded-3 shadow-lg">
        <div class="modal-header">
          <h5 class="modal-title">
            Enrollment Details 
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>

        <div class="modal-body">
          <!-- Student Info -->
          <div v-if="student" class="mb-3">
            <div class="row">
              <div class="col-md-6">
                <div class="body1">Student ID: {{ student.id }}</div>
                <div class="body1">Email: {{ student.email }}</div>
              </div>
              <div class="col-md-6">
                <div class="body1">Program: {{ student.program }}</div>
                <div class="body1">Year Level: {{ student.yearLevel }}</div>
              </div>
            </div>
          </div>

          <!-- Enrollment Info -->
          <h6 class="ch5">Enrolled Subjects</h6>

          <div v-if="loading" class="text-center py-3">
            <div class="spinner-border text-primary"></div>
          </div>

          <table v-else class="table table-bordered table-striped">
            <thead class="table-light">
              <tr>
                <th >Subject Code</th>
                <th>Subject Name</th>
                <th>Teacher</th>
                <th>Semester</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="enroll in enrollments" :key="enroll.id">
                <td>{{ enroll.subjectCode }}</td>
                <td>{{ enroll.subjectName }}</td>
                <td>{{ enroll.teacherName }}</td>
                <td>{{ enroll.semester }}</td>
              </tr>
              <tr v-if="enrollments.length === 0 && !loading">
                <td colspan="4" class="text-center text-muted">No enrollments found.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('close')">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useEnrollmentStore } from '@/store/enrollmentStore'

const props = defineProps({
  visible: Boolean,
  student: Object,
})

const enrollmentStore = useEnrollmentStore()
const { enrollments, loading } = storeToRefs(enrollmentStore)

// 🟩 Automatically fetch enrollments when modal opens
watch(
  () => [props.visible, props.student?.id],
  async ([isVisible, studentId]) => {
    if (isVisible && studentId) {
      await enrollmentStore.fetchEnrollmentsByStudentId(studentId)
    } else if (!isVisible) {
      // Optional: clear previous data when closed
      enrollmentStore.enrollments = []
    }
  },
  { immediate: true }
)
</script>


<style scoped lang="less">
@import '../../../styles/index.less';



</style>