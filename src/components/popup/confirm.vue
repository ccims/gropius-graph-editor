<template>
  <div class="container">
    <v-row justify="space-around">
      <v-card class="pa-6" width="400">
        <h3>Do you really want to delete the component=</h3>
        <v-btn @click="onDeny">No</v-btn>
        <v-btn @click="onConfirm">Yes</v-btn>
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
    };
  },
  computed: {
    hideNextButton(): Boolean {
      return selectedComponent === null;
    },
  },
  // Data

  mounted() {
    componentChoices = Array.from(GropiusDefaultTypes.values());
    componentChoices.push({
      plainName: "My custom type",
      gropiusId: "shape-custom-mytype",
      diagramId: "rectangle-custom",
    });
  },
  methods: {
    onDeny() {
      this.$emit("onDeny");
    },

    onConfirm() {
      this.$emit("onConfirm");
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