<template>
  <div class="editor-container">
    <Transition>
      <v-alert
        class="notification"
        v-if="showConnectionNotification"
        density="compact"
        type="warning"
        title="No connection available"
        text="There is no valid connection between component A and component B"
      ></v-alert>
    </Transition>
    <Confirm
      v-if="showConfirmPopup"
      :msg="'Really want to delete the component?'"
      @onConfirm="onConfirmDelete"
      @onDeny="onDenyDelete"
    ></Confirm>
    <!-- ref anstelle -->
    <div>
      <button class="ui" @click=handleThemeChange>Theme Switch</button>
      <button class="ui" @click=handleExport>Export</button>
      <button class="ui" @click=autolayout>Layout</button>
      <label class="ui"><input type="checkbox" @change="setHideIssues" v-model="hideIssues" /> Hide Issues</label>
      <label class="ui"><input type="checkbox" @change="setHideInterfaces" v-model="hideInterfaces" /> Hide Interfaces</label>
    </div>

    <div id="container"></div>
    <AddComponent
      v-if="showAddComponent"
      @onChoiceDone="onComponentSelected"
    ></AddComponent>

    <AddConnection
      v-if="showAddConnection"
      @onChoiceDone="onConnectionSelected"
    ></AddConnection>
  </div>
</template>

<script lang="ts">
import Confirm from "./popup/Confirm.vue";
import AddComponent from "./popup/AddComponent.vue";
import AddConnection from "./popup/AddConnection.vue";

import GropiusDiagram from "../lib/gropius-diagram";
import { GropiusShape, ObjectType } from "../lib/gropius-diagram/types";
import { Coordinates } from "@/types/HelperTypes";
import { GropiusType } from "@/lib/gropius-diagram/types";
import { defineComponent } from "vue";

import gropiusapi from "@/mixins/api";
import { ConnectionMarker } from "@/lib/diagram/types";

let diagram: GropiusDiagram;
let coordinates: Coordinates = {
  x: 0,
  y: 0
};

let elementToDelete: string = "";

export default defineComponent({
  props: {
    msg: String
  },
  components: {
    AddComponent,
    Confirm,
    AddConnection
  },
  mixins: [gropiusapi],
  data() {
    return {
      showConfirmPopup: false,
      showAddComponent: false,
      showAddConnection: false,
      showConnectionNotification: false,
      darkMode: false,
      hideIssues: false,
      hideInterfaces: false
    };
  },

  mounted() {
    diagram = new GropiusDiagram();
    //@ts-ignore
    diagram.init(document.getElementById("container"));
    // this.diagram.getGropiusShapeNames()
    diagram.test();

    diagram.onAddShape = (coordinatesAdded: Coordinates) => {
      this.showAddComponent = true;
      coordinates = {
        x: coordinatesAdded.x,
        y: coordinatesAdded.y
      };
    };

    diagram.onDelete = (id: string) => {
      this.showConfirmPopup = true;
      elementToDelete = id;
    };

    diagram.onAddConnection = (sourceId: string, targetId: string, waypoints: Coordinates[]) => {
      diagram.createConnection(sourceId, targetId, {
        strokeColor: "orange",
        strokeWidth: 3,
        strokeDasharray: "5 5",
        sourceMarkerType: ConnectionMarker.Round,
        targetMarkerType: ConnectionMarker.Right
      }, waypoints);
    };
  },
  methods: {

    handleThemeChange() {
      this.darkMode = !this.darkMode;
      diagram.setDarkMode(this.darkMode);
    },

    handleExport() {
      diagram.exportDiagram();
    },

    autolayout() {
      diagram.autolayout();
    },

    /**
     * Called when user confirms the popup that the component is to be deleted
     */
    onConfirmDelete() {
      this.showConfirmPopup = false;
      diagram?.delete(elementToDelete);
    },

    /**
     * Called when user cancels deleting the component
     */
    onDenyDelete() {
      this.showConfirmPopup = false;
    },

    setHideIssues() {
      diagram.setObjectTypeVisibility(ObjectType.Issue, this.hideIssues);
    },

    setHideInterfaces() {
      diagram.setObjectTypeVisibility(ObjectType.Interface, this.hideInterfaces);
    },

    /**
     * Called when the user has selected a component type and version
     */
    onComponentSelected(type: GropiusType, version: string) {
      const id = (Math.floor(Math.random() * 900) + 100).toString();

      diagram.createComponent(id, id, version, type, coordinates);

      this.showAddComponent = false;
    },

    onConnectionSelected() {
      this.showAddConnection = false;
    },

    connectionNotification() {
      this.showConnectionNotification = true;
      setTimeout(() => {
        this.showConnectionNotification = false;
      }, 4000);
    }
  }
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
@import "../../node_modules/diagram-js/assets/diagram-js.css";

.ui {
  width: 10em;
  height: 2em;
  margin-bottom: 0.25em;
  margin-top: 0.25em;
  margin-right: 0.25em;
  background-color: orange;
  border-radius: 5px;
  border: 2px solid black;
}

label {
  padding: 0.3em 0.6em 0.3em 0.6em
}


.editor-container {
  display: grid;
}

.notification {
  margin: 10px;
  position: absolute !important;
  justify-self: center;
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease-in;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

#container,
#container > div {
  height: 100vh;
  margin: 0;
  /*background-color: #333;*/
}

.palette-icon-lasso-tool {
  background: url("data:image/svg+xml,%3Csvg%0A%20%20%20%20%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20%0A%20%20%20%20%20fill%3D%22none%22%0A%20%20%20%20%20stroke%3D%22%23000%22%0A%20%20%20%20%20stroke-width%3D%221.5%22%0A%20%20%20%20%20width%3D%2246%22%0A%20%20%20%20%20height%3D%2246%22%3E%0A%20%20%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2216%22%20height%3D%2216%22%20stroke-dasharray%3D%225%2C%205%22%20%2F%3E%0A%20%20%3Cline%20x1%3D%2216%22%20y1%3D%2226%22%20x2%3D%2236%22%20y2%3D%2226%22%20stroke%3D%22black%22%20%2F%3E%0A%20%20%3Cline%20x1%3D%2226%22%20y1%3D%2216%22%20x2%3D%2226%22%20y2%3D%2236%22%20stroke%3D%22black%22%20%2F%3E%0A%3C%2Fsvg%3E");
}

.palette-icon-create-shape {
  background: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%221.5%22%20width%3D%2246%22%20height%3D%2246%22%3E%3Crect%20x%3D%2210%22%20y%3D%2213%22%20width%3D%2226%22%20height%3D%2220%22%2F%3E%3C%2Fsvg%3E");
}

.palette-icon-create-frame {
  background: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%221.5%22%20stroke-dasharray%3D%224%22%20width%3D%2246%22%20height%3D%2246%22%3E%3Crect%20x%3D%2210%22%20y%3D%2213%22%20width%3D%2226%22%20height%3D%2220%22%2F%3E%3C%2Fsvg%3E");
}

.context-pad-icon-remove {
  background: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%221.5%22%20width%3D%2246%22%20height%3D%2246%22%3E%3Cline%20x1%3D%225%22%20y1%3D%225%22%20x2%3D%2215%22%20y2%3D%2215%22%2F%3E%3Cline%20x1%3D%2215%22%20y1%3D%225%22%20x2%3D%225%22%20y2%3D%2215%22%2F%3E%3C%2Fsvg%3E") !important;
}

.context-pad-icon-connect {
  background: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%221.5%22%20width%3D%2246%22%20height%3D%2246%22%3E%3Cline%20x1%3D%2215%22%20y1%3D%225%22%20x2%3D%225%22%20y2%3D%2215%22%2F%3E%3C%2Fsvg%3E") !important;
}
</style>
