import ElementFactory from "diagram-js/lib/core/ElementFactory";

/**
 * A example palette provider.
 */
export default function PaletteProvider(create: any, elementFactory: ElementFactory, lassoTool: any, palette: any) {

  // @ts-ignore
  this._create = create;
  // @ts-ignore
  this._elementFactory = elementFactory;
  // @ts-ignore
  this._lassoTool = lassoTool;
  // @ts-ignore
  this._palette = palette;

  // @ts-ignore
  palette.registerProvider(this);
}

PaletteProvider.$inject = [
  "create",
  "elementFactory",
  "lassoTool",
  "palette"
];


PaletteProvider.prototype.getPaletteEntries = function () {
  var create = this._create,
    elementFactory = this._elementFactory,
    lassoTool = this._lassoTool;

  return {
    "lasso-tool": {
      group: "tools",
      className: "palette-icon-lasso-tool",
      title: "Activate Lasso Tool",
      action: {
        click: function (event: any) {
          lassoTool.activateSelection(event);
        }
      }
    },
    "tool-separator": {
      group: "tools",
      separator: true
    },
    "create-shape": {
      group: "create",
      className: "palette-icon-create-shape",
      title: "Create Shape",
      action: {
        click: function () {
          let shape = elementFactory.createShape({
            width: 100,
            height: 80,
            isFrame: true
          });

          create.start(event, shape);
        }
      }
    }
    // 'create-frame': {
    //   group: 'create',
    //   className: 'palette-icon-create-frame',
    //   title: 'Create Frame',
    //   action: {
    //     click: function() {
    //       let shape = elementFactory.createShape({
    //         width: 100,
    //         height: 100,
    //         isFrame: true
    //       });
    //
    //       create.start(event, shape);
    //     }
    //   }
    // }
  };
};