<template>
  <div class="container">
    <v-row justify="space-around">
      <v-card class="pa-6" width="800">
        <v-tabs v-model="tab" color="#0F94D8" align-tabs="center">
          <v-tab :value="1">Select Component</v-tab>
          <v-tab :value="2">Select Version</v-tab>
        </v-tabs>
        <v-window v-model="tab">
          <!-- Select Component -->
          <v-window-item :value="1">
            <v-container fluid>
              <h3>Select a component</h3>
              <v-select
                v-model="selectedGropiusId"
                label="Select"
                :items="componentChoiceNames"
                :item-title="'name'"
                :item-value="'id'"
              ></v-select>
            </v-container>
          </v-window-item>
          <!-- Select Version -->
          <v-window-item :value="2">
            <v-container fluid>
              <h3>Select a version</h3>
              <v-select label="Select" :items="componentVersions"></v-select>
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
import { GropiusType } from "@/lib/gropius-compatibility/gropiusDefaultTypes";
import gropiusapi from "@/mixins/api";

let selectedComponent: GropiusType;
let componentChoices: GropiusType[];
let componentChoiceNames: String[] = [];

interface ComponentChoiceNames {
  name: string;
  id: string;
}

export default defineComponent({
  name: "AddComponent",
  mixins: [gropiusapi],
  data() {
    return {
      customTabs: [{ title: "Component" }, { title: "Version" }],
      currentTabIndex: 0,
      componentVersions: ["A", "B", "C"],
      selectedComponentVersion: "",
      showOverlay: true,
      tab: null,
      selectedGropiusId: "",
    };
  },
  computed: {
    hideNextButton(): Boolean {
      return selectedComponent === null;
    },
    componentChoiceNames(): ComponentChoiceNames[] {
      let componentChoiceNames: ComponentChoiceNames[] = [];
      componentChoices.forEach((choice) => {
        componentChoiceNames.push({
          name: choice.plainName,
          id: choice.gropiusId,
        });
      });
      return componentChoiceNames;
    },
  },
  mounted() {
    this.initComponentChoices();
  },
  methods: {
    /**
     * Emit to the parent component when steps are completed
     * Steps popup is closed then
     */
    wizardCompleted() {
      ///let selectedComponentType = GropiusDefaultTypes.get
      console.log("gropius id", this.selectedGropiusId);
      if (this.selectedGropiusId !== "") {
        selectedComponent = componentChoices.filter((choice) => {
          return choice.gropiusId === this.selectedGropiusId;
        })[0];
      }

      this.$emit(
        "onChoiceDone",
        selectedComponent,
        this.selectedComponentVersion
      );
    },

    /**
     * Api call via gropius-api mixin
     */
    initComponentChoices() {
      componentChoices = this.getComponentTypes();
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