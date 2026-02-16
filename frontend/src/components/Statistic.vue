<template>
  <div class="statistic">
    <h3 class="title">{{ title }}</h3>
    <p class="content">{{ displayContent }}</p>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";

const _props = defineProps(["title", "content"]);
const displayContent = ref(_props.content);

const animateNumber = (target) => {
  // Remove commas and convert to number
  const cleanedTarget = String(target).replace(/,/g, "");
  const targetNum = Number(cleanedTarget);
  const isNumber = !Number.isNaN(targetNum) && targetNum !== null;

  if (!isNumber) {
    displayContent.value = target;
    return;
  }

  const duration = 1500; // milliseconds
  const start = Date.now();
  const startValue = 0;

  const animate = () => {
    const now = Date.now();
    const progress = Math.min((now - start) / duration, 1);
    const current = Math.floor(
      startValue + (targetNum - startValue) * progress,
    );
    displayContent.value = current
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      displayContent.value = targetNum
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
  };

  animate();
};

watch(
  () => _props.content,
  (newValue) => {
    animateNumber(newValue);
  },
);

onMounted(() => {
  animateNumber(_props.content);
});
</script>

<style scoped>
.statistic {
  font-family: "Caladea", serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #333;
  width: 200px;
}
.title {
  font-size: 1.3rem;
  font-weight: 400;
}
.content {
  font-size: 1.5rem;
  font-weight: 700;
}
</style>
