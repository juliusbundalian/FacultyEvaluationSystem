<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const emit = defineEmits(["click"]);

const props = defineProps({
    id: { type: String, default: null },
    name: { type: String, default: null },
    type: { type: String, default: "button" },
    variant: { type: String, default: "primary-main" },
    styleType: { type: String, default: "filled" },
    size: { type: String, default: "md" },
    iconLeft: { type: String, default: null },
    iconRight: { type: String, default: null },
    disabled: { type: Boolean, default: false },
    block: { type: Boolean, default: false },
    dataBsToggle: { type: String, default: null },
    dataBsTarget: { type: String, default: null },
    goBack: { type: Boolean, default: false },
    to: { type: [String, Object], default: null },
});

const btnClass = computed(() => {
    const sizeClass = `x-btn--${props.size}`;
    const variantClass = `btn--${props.styleType}-${props.variant}`;
    const disabledClass = props.disabled ? "is-disabled" : "";
    const blockClass = props.block ? "w-100" : "";
    return `x-btn ${sizeClass} ${variantClass} ${disabledClass} ${blockClass} d-inline-flex items-center justify-center text-center gap-1`;
});


const handleClick = (event) => {
    if (props.disabled) return;

    // Handle goBack behavior
    if (props.goBack) {
        event.preventDefault();
        router.back();
        return;
    }

    // Handle route navigation
    if (props.to) {
        event.preventDefault();
        router.push(props.to);
        return;
    }

    emit("click", event);
};

</script>

<template>
    <!-- If href, render <a>, else <button> -->
    <component
        :is="'button'"
        :id="id"
        :name="name"
        :class="btnClass"
        role="button"
        :disabled="disabled && !href"
        :aria-disabled="disabled ? 'true' : 'false'"
        :data-bs-toggle="dataBsToggle"
        :data-bs-target="dataBsTarget"
        @click="handleClick"
    >
        <!-- Left icon -->
        <span
            v-if="iconLeft"
            class="icon-start material-symbols-rounded"
            aria-hidden="true"
        >
            {{ iconLeft }}
        </span>

        <!-- Button text -->
        <span><slot /></span>

        <!-- Right icon -->
        <span
            v-if="iconRight"
            class="icon-end material-symbols-rounded"
            aria-hidden="true"
        >
            {{ iconRight }}
        </span>
    </component>
</template>
