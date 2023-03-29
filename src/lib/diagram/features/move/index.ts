// @ts-ignore
import InteractionEventsModule from "diagram-js/lib/features/interaction-events";
// @ts-ignore
import SelectionModule from "diagram-js/lib/features/selection";
// @ts-ignore
import OutlineModule from "diagram-js/lib/features/outline";
// @ts-ignore
import RulesModule from "diagram-js/lib/features/rules";
// @ts-ignore
import DraggingModule from "diagram-js/lib/features/dragging";
// @ts-ignore
import PreviewSupportModule from "diagram-js/lib/features/preview-support";

// @ts-ignore
import MoveModule from "./Move";
// @ts-ignore
import MovePreview from "./MovePreview";

export default {
  __depends__: [
    InteractionEventsModule,
    SelectionModule,
    OutlineModule,
    RulesModule,
    DraggingModule,
    PreviewSupportModule
  ],
  __init__: [
    "move",
    "movePreview"
  ],
  move: ["type", MoveModule],
  movePreview: ["type", MovePreview]
};
