import GropiusDefaultTypes, {
    GropiusType,
} from "@/lib/gropius-compatibility/gropiusDefaultTypes";

export default {
    data() {
        return { /* data */ }
    },
    methods: {
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

        }
    },
}