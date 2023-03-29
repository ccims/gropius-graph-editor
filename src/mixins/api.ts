import GropiusDefaultTypes, {
    GropiusType,
} from "@/lib/gropius-compatibility/gropiusDefaultTypes";
import {
    GropiusShapeStyle,
} from "@/lib/gropius-compatibility/types";

export default {
    data() {
        return { /* data */ }
    },
    methods: {
        // als Rückmeldung, ob Erstellen der Komponente erfolgreich
        // param evtl. id
        addComponent(): Boolean {
            return true;
        },

        // same
        addConnection(): Boolean {
            return true;
        },

        /**
         * 
         * @returns available component choices
         */
        getComponentTypes(): GropiusType[] {
            let componentChoices = Array.from(GropiusDefaultTypes.values());
            componentChoices.push({
                plainName: "My custom type",
                gropiusId: "shape-custom-mytype",
                diagramId: "diamond",
            });
            return componentChoices;
        },

        getValidRelationTypes() {

        },

        getComponentStyle(gropiusId: string): GropiusShapeStyle {
            // api call
            const shapeStyle = {
                width: 100,
                height: 50,
                color: "orange",
                stroke: "black",
                strokeWidth: 2,
                strokeDasharray: "2 5",
                radius: 10,
            };
            return shapeStyle;
        }
    },
}