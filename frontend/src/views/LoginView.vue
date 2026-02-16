<template>
<div class="title-container">
    <h2 class="subtitle">Reaction</h2>
    <h1 class="title">Accedi</h1>
</div>
<div class="login-form">
    <TextInputForm label="Email" placeholder="Inserisci la tua email" name="email" id="email" type="email" />
    <TextInputForm label="Password" placeholder="Inserisci la tua password" name="password" id="password" type="password" />
    <div class="button-container">
      <Button to="/TODO" label="Login" />
      <Button to="/TODO" label="Login con Google" />
    </div>
  </div>
</template>

<script>
import Button from "@/components/Button.vue";
import TextInputForm from "@/components/TextInputForm.vue";
export default {
  name: "LoginView",
  components: {
    Button,
    TextInputForm,
  },
};
</script>

<style scoped>
.title-container {
  font-family: "Caladea", serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #A9CA5F;
  height: 15vh;
  min-height: 100px;
  width: 80vw;
  border-radius: 10px;
  
}
.subtitle {
  font-weight: 100;
  font-size: 1.4rem;
  line-height: 1;
}
.title {
  line-height: 1;
  font-weight: 700;
  font-size: 3rem;
}

.button-container {
  display: flex;
  justify-content: center;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 1rem;
  gap: 2rem;
  padding: 2rem;
}


.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 4rem;
}

@media (max-width: 600px) {
  .button-container {
  display: flex;
  justify-content: center;
   flex-direction: column;
    flex-wrap: wrap;
    gap: 1rem;
  gap: 2rem;
  padding: 2rem;
}
}
</style>