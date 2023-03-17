<template>
  <div>
    <p>{{ msg }}</p>
    <button class="button button__filled" @click="onConfirm">Yes</button>
    <button class="button button__outlined" @click="onDeny">No</button>
  </div>
</template>
<script lang="ts">
import { Options, Vue } from "vue-class-component";

@Options({
  props: {
    msg: String,
  },
})
export default class Confirm extends Vue {
  // Methods

  /**
   * Emits the confirm event to parent component
   */
  onConfirm(): void {
    this.$emit("onConfirm");
  }

  /**
   * Emits the deny event to parent component
   */
  onDeny(): void {
    this.$emit("onDeny");
  }
}
</script>
<style lang="scss" scoped>
.button {
  margin: 1px;
}
</style>