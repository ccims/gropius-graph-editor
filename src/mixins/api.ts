import {
  GropiusType
} from "@/lib/gropius-compatibility/types";
import {
  GropiusShapeStyle, Shape
} from "@/lib/gropius-compatibility/types";

export default {
  data() {
    return { /* data */ };
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
      const GropiusDefaultTypes: Map<string, GropiusType> = new Map<string, GropiusType>([
        ["Component", {
          name: "Component",
          shape: Shape.Rectangle,
          style: {
            width: 100,
            height: 50,
            color: "white",
            stroke: "black",
            strokeWidth: 2,
            strokeDasharray: "",
            radius: 5
          }
        }],
        ["Library", {
          name: "Library",
          shape: Shape.Diamond,
          style: {
            width: 100,
            height: 50,
            color: "white",
            stroke: "black",
            strokeWidth: 2,
            strokeDasharray: "",
            radius: 5
          }
        }],
        ["Hexagon", {
          name: "Hexagon",
          shape: Shape.Hexagon,
          style: {
            width: 100,
            height: 50,
            color: "white",
            stroke: "black",
            strokeWidth: 2,
            strokeDasharray: "",
            radius: 5
          }
        }],
        ["Ellipse", {
          name: "Ellipse",
          shape: Shape.Ellipse,
          style: {
            width: 100,
            height: 50,
            color: "white",
            stroke: "black",
            strokeWidth: 2,
            strokeDasharray: "",
            radius: 5
          }
        }],
        ["Octagon", {
          name: "Octagon",
          shape: Shape.Octagon,
          style: {
            width: 100,
            height: 50,
            color: "white",
            stroke: "black",
            strokeWidth: 2,
            strokeDasharray: "",
            radius: 5
          }
        }],
        ["Circle", {
          name: "Circle",
          shape: Shape.Circle,
          style: {
            width: 100,
            height: 50,
            color: "white",
            stroke: "black",
            strokeWidth: 2,
            strokeDasharray: "",
            radius: 5
          }
        }],
        ["Triangle", {
          name: "Triangle",
          shape: Shape.Triangle,
          style: {
            width: 100,
            height: 50,
            color: "white",
            stroke: "black",
            strokeWidth: 2,
            strokeDasharray: "",
            radius: 5
          }
        }],
        ["Parallelogram", {
          name: "Parallelogram",
          shape: Shape.Parallelogram,
          style: {
            width: 100,
            height: 50,
            color: "white",
            stroke: "black",
            strokeWidth: 2,
            strokeDasharray: "",
            radius: 5
          }
        }],
        ["Trapeze", {
          name: "Trapeze",
          shape: Shape.Trapeze,
          style: {
            width: 100,
            height: 50,
            color: "white",
            stroke: "black",
            strokeWidth: 2,
            strokeDasharray: "",
            radius: 5
          }
        }]
      ]);

      let componentChoices = Array.from(GropiusDefaultTypes.values());
      return componentChoices;
    },

    getValidRelationTypes() {

    },
  }
};