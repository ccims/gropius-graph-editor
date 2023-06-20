import EventBus from "diagram-js/lib/core/EventBus";
import Modeling from "diagram-js/lib/features/modeling/Modeling";
import { ObjectType } from "@/lib/gropius-diagram/types";

/**
 * A example context pad provider.
 */
export default function ContextPadProvider(eventBus: EventBus, connect: any, create: any, contextPad: any, modeling: Modeling) {
  // @ts-ignore
  this._connect = connect;
  // @ts-ignore
  this._modeling = modeling;

  // @ts-ignore
  contextPad.registerProvider(this);
}

ContextPadProvider.$inject = [
  "eventBus",
  "connect",
  "create",
  "contextPad",
  "modeling"
];


ContextPadProvider.prototype.getContextPadEntries = function(element: any) {
  const connect = this._connect,
    modeling = this._modeling;

  function removeElement() {
    // modeling.removeElements([ element ]);
    modeling._eventBus.fire("context.shape.delete", { element: element });
  }

  function startConnect(event: any, element: any, autoActivate: any) {
    connect.start(event, element, autoActivate);
  }

  const deleteIcon = {
    group: "edit",
    className: "context-pad-icon-remove",
    title: "Remove",
    action: {
      click: removeElement,
      dragstart: removeElement
    }
  };

  const connectIcon = {
    group: "connect",
    className: "context-pad-icon-connect",
    title: "Connect",
    action: {
      click: startConnect,
      dragstart: startConnect
    }
  };

  switch(element.businessObject.type) {
    case ObjectType.ComponentVersion:
      return {
        "delete": deleteIcon,
        "connect": connectIcon
      };
    case ObjectType.Interface:
      return {
        "delete": deleteIcon,
        "connect": connectIcon
      };
    case ObjectType.Connection:
      return {
        "delete": deleteIcon
      };
    case ObjectType.IssueFolder:
      return {
        "delete": deleteIcon,
        "connect": connectIcon
      };
    default:
      return {}
  }

};