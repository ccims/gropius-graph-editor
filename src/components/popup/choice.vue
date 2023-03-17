<template>
  <div>
    <p>{{ msg }}</p>
    <div v-for="(choice, choiceKey) in choices" :key="choiceKey">
      <span class="button button__outlined" @click="onChoiceDone(choice)">{{
        choice
      }}</span>
    </div>
    <!-- Wenn multiple choice möglich -->
    <!-- <button @click="onChoiceDone">Ok</button> -->
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";

@Options({
  props: {
    msg: {
      type: String,
    },
    choices: {
      type: Array,
    },
    isMultipleChoice: {
      type: Boolean,
      required: true,
    },
  },
})
export default class Choice extends Vue {
  // Methods

  /**
   * Emits the selected choice to the parent component
   *
   * @param {String} selectedChoice
   */
  onChoiceDone(selectedChoice: String): void {
    this.$emit("onChoiceDone", selectedChoice);
  }
}
</script>

<style lang="scss" scoped>
.button {
  margin-top: 5px;
}
</style>