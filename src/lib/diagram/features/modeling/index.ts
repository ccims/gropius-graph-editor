import CommandModule from 'diagram-js/lib/command';
// @ts-ignore
import ChangeSupportModule from 'diagram-js/lib/features/change-support';
// @ts-ignore
import SelectionModule from 'diagram-js/lib/features/selection';
// @ts-ignore
import RulesModule from 'diagram-js/lib/features/rules';
// @ts-ignore
import CroppingConnectionDocking from "diagram-js/lib/layout/CroppingConnectionDocking";

import Modeling from 'diagram-js/lib/features/modeling/Modeling';

//import BaseLayouter from '../../layout/BaseLayouter';
import Layouter from './Layouter';

import Updater from './Updater'

export default {
  __depends__: [
    CommandModule,
    ChangeSupportModule,
    SelectionModule,
    RulesModule
  ],
  __init__: [ 'modeling' , "updater"],
  modeling: [ 'type', Modeling ],
  updater: ["type", Updater],
  layouter: [ 'type', Layouter ],
  connectionDocking: ["type", CroppingConnectionDocking],
};