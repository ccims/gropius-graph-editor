import EventBus from "diagram-js/lib/core/EventBus";

// @ts-ignore
import inherits from "inherits";

// @ts-ignore
import RuleProvider from "diagram-js/lib/features/rules/RuleProvider";

// @ts-ignore
import { isFrameElement } from "diagram-js/lib/util/Elements";
import { ObjectType } from "@/lib/gropius-compatibility/types";


export default function CustomRuleProvider(eventBus: EventBus) {
  // @ts-ignore
  RuleProvider.call(this, eventBus);
}

CustomRuleProvider.$inject = ["eventBus"];

inherits(CustomRuleProvider, RuleProvider);


CustomRuleProvider.prototype.init = function () {
  this.addRule("shape.create", function (context: any) {
    const target = context.target,
      shape = context.shape;

    return target.parent === shape.target;
  });

  this.addRule("connection.create", function (context: any) {
    const source = context.source,
      target = context.target;
    if (source.businessObject && target.businessObject)
      return source.id.startsWith("shape") && source.businessObject.type != ObjectType.Version && target.id.startsWith("shape") && target.businessObject.type != ObjectType.Version;
    //return source.parent === target.parent;
    return false;
  });

  this.addRule("shape.resize", function (context: any) {
    const shape = context.shape;

    return isFrameElement(shape);
  });
};