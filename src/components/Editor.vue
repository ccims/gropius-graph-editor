<template>
    <div>
        <Confirm
                v-if="showConfirmPopup"
                :msg="'Really want to delete the component?'"
                @onConfirm="onConfirm"
                @onDeny="onDeny"
        ></Confirm>
        <!-- ref anstelle -->
        <div id="container"></div>

        <AddComponent
                v-if="showChoicePopup"
                @onChoiceDone="onComponentSelected"
        ></AddComponent>
    </div>
</template>

<script lang="ts">
import {Options, Vue} from "vue-class-component";
import Confirm from "./popup/confirm.vue";
import AddComponent from "./AddComponent.vue";

import GropiusCompatibility from '../lib/gropius-compatibility';
import {GropiusShape, GropiusShapeStyle} from '../lib/gropius-compatibility/types';
import {Coordinates} from "@/types/HelperTypes";
import {GropiusType} from "@/lib/gropius-compatibility/gropiusDefaultTypes";

@Options({
    props: {
        msg: String,
    },
    components: {
        Confirm,
        AddComponent,
    },
})
export default class Editor extends Vue {
    diagram?: GropiusCompatibility;
    showConfirmPopup: Boolean = false;
    showChoicePopup: Boolean = false;
    componentChoices: Array<String> = ["Component A", "Component B"];

    coordinates: Coordinates = {
        x: 0,
        y: 0,
    };
    element: any;

    mounted() {
        this.diagram = new GropiusCompatibility();
        this.diagram.init(document.querySelector("#container"));
        // this.diagram.getGropiusShapeNames()
        this.diagram.test();

        this.diagram.onAddShape = (coordinates: Coordinates) => {
            this.showChoicePopup = true;
            this.coordinates = {
                x: coordinates.x,
                y: coordinates.y,
            };
        };

        this.diagram.onDeleteShape = (element: any) => {
            this.showConfirmPopup = true;
            this.element = element;
        };
    }

    onConfirm() {
        this.showConfirmPopup = false;
        this.diagram?.deleteShape(this.element);
    }

    onDeny() {
        this.showConfirmPopup = false;
    }

    onComponentSelected(type: GropiusType, version: String) {
        if (type.isGropiusDefault) {
            //type = this.diagram ? this.diagram?.getGropiusShapeName(type) : "";
            let grShape = {
                grId: "000",
                grType: type.gropiusId
            };
            this.diagram?.drawGropiusType(this.coordinates, grShape);
        } else {
            // TODO Get styling for custom component
            if(!type.diagramId)
                throw Error("Diagram ID is not defined")
            let grShape: GropiusShape = {
                grId: "2",
                grType: type.gropiusId,
            }
            let grStyle: GropiusShapeStyle = {
                width: 100,
                height: 50,
                color: "orange",
                stroke: "black",
                strokeWidth: 2,
                strokeDasharray: 2,
                radius: 10
            }
            this.diagram?.drawCustomType(type.diagramId, this.coordinates, grShape, grStyle)
        }

        this.showChoicePopup = false;
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
@import "../../node_modules/diagram-js/assets/diagram-js.css";

#container,
#container > div {
    height: 90vh;
    margin: 0;
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
