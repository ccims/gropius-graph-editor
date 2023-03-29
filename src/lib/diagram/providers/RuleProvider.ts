import EventBus from "diagram-js/lib/core/EventBus";

// @ts-ignore
import inherits from "inherits";

// @ts-ignore
import RuleProvider from "diagram-js/lib/features/rules/RuleProvider";

// @ts-ignore
import { isFrameElement } from "diagram-js/lib/util/Elements";


export default function CustomRuleProvider(eventBus: EventBus) {
  // @ts-ignore
  RuleProvider.call(this, eventBus);
}

CustomRuleProvider.$inject = ["eventBus"];

inherits(CustomRuleProvider, RuleProvider);


CustomRuleProvider.prototype.init = function() {
  this.addRule("shape.create", function(context: any) {
    var target = context.target,
      shape = context.shape;

    return target.parent === shape.target;
  });

  this.addRule("connection.create", function(context: any) {
    var source = context.source,
      target = context.target;
    if (source.grShape && target.grShape)
      return source.grShape.grType.startsWith("shape-") && target.grShape.grType.startsWith("shape-");
    //return source.parent === target.parent;
    return false;
  });

  this.addRule("shape.resize", function(context: any) {
    var shape = context.shape;

    return isFrameElement(shape);
  });
};