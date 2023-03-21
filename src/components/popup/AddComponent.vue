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
                label="Select"
                :items="componentChoices"
                :item-title="plainName"
              ></v-select>
              <v-btn @click="next">Next</v-btn>
            </v-container>
          </v-window-item>
          <!-- Select Version -->
          <v-window-item :value="2">
            <v-container fluid>
              <h3>Select a version</h3>
              <v-select label="Select" :items="componentVersions"></v-select>
              <v-btn @click="previous">Previous</v-btn>
              <v-btn @click="wizardCompleted">Next</v-btn>
            </v-container>
          </v-window-item>
        </v-window>
      </v-card>
    </v-row>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
// @ts-ignore
import Wizard from "form-wizard-vue3";
import "form-wizard-vue3/dist/form-wizard-vue3.css";
import GropiusDefaultTypes, {
  GropiusType,
} from "@/lib/gropius-compatibility/gropiusDefaultTypes";

let selectedComponent: GropiusType;
let componentChoices: GropiusType[];

export default defineComponent({
  name: "AddComponent",
  components: { Wizard },
  data() {
    return {
      customTabs: [{ title: "Component" }, { title: "Version" }],
      currentTabIndex: 0,
      componentVersions: ["A", "B", "C"],
      selectedComponentVersion: "",
      showOverlay: true,
      tab: null,
    };
  },
  computed: {
    hideNextButton(): Boolean {
      return selectedComponent === null;
    },
  },
  mounted() {
    componentChoices = Array.from(GropiusDefaultTypes.values());
    componentChoices.push({
      plainName: "My custom type",
      gropiusId: "shape-custom-mytype",
      diagramId: "rectangle-custom",
    });
  },
  methods: {
    /**
     * Emit to the parent component when steps are completed
     * Steps popup is closed then
     */
    wizardCompleted() {
      ///let selectedComponentType = GropiusDefaultTypes.get
      selectedComponent = componentChoices[1];
      this.$emit(
        "onChoiceDone",
        selectedComponent,
        this.selectedComponentVersion
      );
    },
    /**
     * Called when user wants to go to the previous tab
     */
    previous() {},
    /**
     * Called when user wants to go to next tab
     */
    next() {},
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