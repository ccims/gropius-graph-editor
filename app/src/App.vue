<template>
  <Editor />
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Editor from "./components/Editor.vue";

@Options({
  components: {
    Editor,
  },
})
export default class App extends Vue {}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
