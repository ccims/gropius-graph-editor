/*// import BehaviorModule from "./behavior";
// import RulesModule from "../rules";
// import DiOrderingModule from "../di-ordering";
// import OrderingModule from "../ordering";

import CommandModule from "diagram-js/lib/command";
// @ts-ignore
import TooltipsModule from "diagram-js/lib/features/tooltips";
// @ts-ignore
import LabelSupportModule from "diagram-js/lib/features/label-support";
// @ts-ignore
import AttachSupportModule from "diagram-js/lib/features/attach-support";
// @ts-ignore
import SelectionModule from "diagram-js/lib/features/selection";
// @ts-ignore
import ChangeSupportModule from "diagram-js/lib/features/change-support";
// @ts-ignore
import SpaceToolModule from "diagram-js/lib/features/space-tool";

import GRFactory from "./GRFactory";
import GRUpdater from "./GRUpdater";
import ElementFactory from "./ElementFactory";
import Modeling from "./Modeling";
import Layouter from "./Layouter";
// @ts-ignore
import CroppingConnectionDocking from "diagram-js/lib/layout/CroppingConnectionDocking";

export default {
  __init__: ["modeling", "grUpdater"],
  __depends__: [
    // BehaviorModule,
    // RulesModule,
    // DiOrderingModule,
    // OrderingModule,
    CommandModule,
    TooltipsModule,
    LabelSupportModule,
    AttachSupportModule,
    SelectionModule,
    ChangeSupportModule,
    SpaceToolModule,
  ],
  // grFactory: ["type", GRFactory],
  // grUpdater: ["type", GRUpdater],
  // elementFactory: ["type", ElementFactory],
  // modeling: ["type", Modeling],
  layouter: ["type", Layouter],
  connectionDocking: ["type", CroppingConnectionDocking],
};*/

import CommandModule from 'diagram-js/lib/command';
// @ts-ignore
import ChangeSupportModule from 'diagram-js/lib/features/change-support';
// @ts-ignore
import SelectionModule from 'diagram-js/lib/features/selection';
// @ts-ignore
import RulesModule from 'diagram-js/lib/features/rules';

import Modeling from 'diagram-js/lib/features/modeling/Modeling';
//import BaseLayouter from '../../layout/BaseLayouter';
import Layouter from './Layouter';



export default {
  __depends__: [
    CommandModule,
    ChangeSupportModule,
    SelectionModule,
    RulesModule
  ],
  __init__: [ 'modeling' ],
  modeling: [ 'type', Modeling ],
  layouter: [ 'type', Layouter ]
};