<template>
  <div class="container">
    <v-row justify="space-around">
      <v-card class="pa-6" width="800">
        <v-tabs v-model="tab" color="#0F94D8" align-tabs="center">
          <v-tab :value="1">Select Relation</v-tab>
        </v-tabs>
        <v-window v-model="tab">
          <!-- Select Relation -->
          <v-window-item :value="1">
            <v-container fluid>
              <h3>Select a relation</h3>
              <!-- <v-select
                v-model="selectedGropiusId"
                label="Select"
                :items="componentChoiceNames"
                :item-title="'name'"
                :item-value="'id'"
              ></v-select> -->
              <v-btn @click="wizardCompleted">Completed</v-btn>
            </v-container>
          </v-window-item>
        </v-window>
      </v-card>
    </v-row>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import gropiusapi from "@/mixins/api";

interface RelationChoiceNames {
  name: string;
  id: string;
}

export default defineComponent({
  name: "AddRelation",
  mixins: [gropiusapi],
  data() {
    return {
      tab: null,
    };
  },
  computed: {
    relationChoiceNames(): RelationChoiceNames[] {
      let relationChoiceNames: RelationChoiceNames[] = [];

      return relationChoiceNames;
    },
  },
  mounted() {
    this.initRelationChoices();
  },
  methods: {
    /**
     * Emit to the parent component when steps are completed
     * Steps popup is closed then
     */
    wizardCompleted() {
      this.$emit("onChoiceDone");
    },

    /**
     * Api call via gropius-api mixin
     */
    initRelationChoices() {
      //   componentChoices = this.getComponentTypes();
    },
  },
});
</script>
<style scoped>
.container {
  /* The Modal (background) */
  display: flex;
  position: fixed;
  /* Stay in place */
  z-index: 1;
  /* Sit on top */
  left: 0;
  top: 0;
  width: 100%;
  /* Full width */
  height: 100%;
  /* Full height */
  overflow: auto;
  /* Enable scroll if needed */
  background-color: rgb(0, 0, 0);
  /* Fallback color */
  background-color: rgba(0, 0, 0, 0.4);
  /* Black w/ opacity */
  align-items: center;
  justify-content: center;
}
</style>