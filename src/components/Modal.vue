<template>
    <transition name="fade">
        <div
            v-if="modelValue"
            class="modal fade show d-block"
            tabindex="-1"
            role="dialog"
            aria-modal="true"
        >
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <!-- Header -->
                    <div v-if="$slots.header" class="modal-header">
                        <slot name="header" />
                    </div>

                    <!-- Body -->
                    <div class="modal-body">
                        <slot name="modal-body" />
                    </div>

                    <!-- Footer -->
                    <div v-if="$slots.footer" class="modal-footer">
                        <slot name="footer">
                            <Button
                                type="button"
                                class="x-btn x-btn--md"
                                @click="close"
                            >
                                Close
                            </Button>
                        </slot>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import Button from "./Buttons.vue";

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
}>();

function close() {
    emit("update:modelValue", false);
}

function onEsc(e: KeyboardEvent) {
    if (e.key === "Escape") close();
}

onMounted(() => document.addEventListener("keydown", onEsc));
onBeforeUnmount(() => document.removeEventListener("keydown", onEsc));
</script>

<style scoped>
/* Bootstrap fade override for smooth overlay */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
/* Fix backdrop (Bootstrap normally injects via JS) */
.modal {
    background: rgba(0, 0, 0, 0.5);
}

.modal-dialog{
    border: none !important;
}

.modal-content{
    border: none !important;
}
</style>
