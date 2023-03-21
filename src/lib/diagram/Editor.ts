// @ts-ignore
import Diagram from 'diagram-js';

// @ts-ignore
import ConnectModule from 'diagram-js/lib/features/connect';
// @ts-ignore
import ContextPadModule from 'diagram-js/lib/features/context-pad';
// @ts-ignore
import CreateModule from 'diagram-js/lib/features/create';
// @ts-ignore
import LassoToolModule from 'diagram-js/lib/features/lasso-tool';
// @ts-ignore
import ModelingModule from 'diagram-js/lib/features/modeling';
// @ts-ignore
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas';
// @ts-ignore
import OutlineModule from 'diagram-js/lib/features/outline';
// @ts-ignore
import PaletteModule from 'diagram-js/lib/features/palette';
// @ts-ignore
import ResizeModule from 'diagram-js/lib/features/resize';
// @ts-ignore
import RulesModule from 'diagram-js/lib/features/rules';
// @ts-ignore
import SelectionModule from 'diagram-js/lib/features/selection';
// @ts-ignore
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll';
// @ts-ignore
import Layouter from 'diagram-js/lib/layout';



// @ts-ignore
import ConnectionPreviewModule from "./features/connection-preview";

// @ts-ignore
import Move from './features/move'

// @ts-ignore
import ProvidersModule from './providers';

// @ts-ignore
import RendererModule from './draw'

/**
 * A module that changes the default diagram look.
 */
const ElementStyleModule = {
    __init__: [
        ['defaultRenderer', function (defaultRenderer: any) {
            // override default styles
            defaultRenderer.CONNECTION_STYLE = {fill: 'none', strokeWidth: 2, stroke: '#ff0000'};
            defaultRenderer.SHAPE_STYLE = {fill: 'white', stroke: '#000', strokeWidth: 2};
            defaultRenderer.FRAME_STYLE = {fill: 'none', stroke: '#000', strokeDasharray: 4, strokeWidth: 2};
        }]
    ]
};

/**
 * Our editor constructor
 *
 * @param { { container: Element, additionalModules?: Array<any> } } options
 *
 * @return {Diagram}
 */
export default function EditorLib(container: Element): Diagram {


    // default modules provided by the toolbox
    const builtinModules = [
        ConnectModule,
        ContextPadModule,
        CreateModule,
        LassoToolModule,
        MoveCanvasModule,
        OutlineModule,
        PaletteModule,
        ResizeModule,
        RulesModule,
        SelectionModule,
        ZoomScrollModule,
    ];

    // our own modules, contributing controls, customizations, and more
    const customModules = [
        ProvidersModule,
        RendererModule,
        ElementStyleModule,
        ConnectionPreviewModule,
        Move,
        ModelingModule,
    ];

    const modules = [
        ...builtinModules,
        ...customModules,
    ]

    const diagram = new Diagram({
        canvas: {
            container
        },
        modules: modules
    });

    return diagram;
}