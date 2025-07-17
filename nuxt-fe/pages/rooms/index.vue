<script setup lang="ts">
const roomCode = ref<string>('');
const errorMessage = ref<string>('');
const otpRef = ref();

onMounted(() => {
  // Focus the first input of the OTP component
  if (otpRef.value) {
    const firstInput = otpRef.value.$el?.querySelector('input') || otpRef.value.$el;
    firstInput?.focus();
  }
});

async function handleSubmit() {
  if (roomCode.value.length !== 4 || !roomCode.value.match(/^\d+$/)) {
    errorMessage.value = 'Room code must be 4 digits';
  } else {
    errorMessage.value = '';
  }

  navigateTo(`/rooms/${roomCode.value}`);
}
</script>

<template>
  <div class="h-screen w-full">
    <div class="h-full w-full flex items-center justify-center">
      <Card>
        <template #title>
          <h1 class="mb-2">Enter room code</h1>
        </template>
        <template #content>
          <InputOtp ref="otpRef" v-model="roomCode" :length="4" name="room-code" required class="mb-2"
            @keyup.enter="handleSubmit" />
          <Message v-if="errorMessage" severity="error" :closable="false" variant="simple" size="small">
            {{ errorMessage }}
          </Message>
        </template>
        <template #footer> <Button label="Join" class="w-full mt-4" @click="handleSubmit" /></template>
      </Card>
    </div>
  </div>
</template>