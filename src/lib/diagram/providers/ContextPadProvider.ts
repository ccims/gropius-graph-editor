import EventBus from "diagram-js/lib/core/EventBus";
import Modeling from "diagram-js/lib/features/modeling/Modeling";

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


ContextPadProvider.prototype.getContextPadEntries = function (element: any) {
  const connect = this._connect,
    modeling = this._modeling;

  function removeElement() {
    // modeling.removeElements([ element ]);
    modeling._eventBus.fire("context.shape.delete", { element: element });
  }

  function startConnect(event: any, element: any, autoActivate: any) {
    connect.start(event, element, autoActivate);
  }

  return {
    "delete": {
      group: "edit",
      className: "context-pad-icon-remove",
      title: "Remove",
      action: {
        click: removeElement,
        dragstart: removeElement
      }
    },
    "connect": {
      group: "connect",
      className: "context-pad-icon-connect",
      title: "Connect",
      action: {
        click: startConnect,
        dragstart: startConnect
      }
    }
  };
};