import Diagram from 'diagram-js';

import ConnectModule from 'diagram-js/lib/features/connect';
import ContextPadModule from 'diagram-js/lib/features/context-pad';
import CreateModule from 'diagram-js/lib/features/create';
import LassoToolModule from 'diagram-js/lib/features/lasso-tool';
import ModelingModule from 'diagram-js/lib/features/modeling';
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas';
import MoveModule from 'diagram-js/lib/features/move';
import OutlineModule from 'diagram-js/lib/features/outline';
import PaletteModule from 'diagram-js/lib/features/palette';
import ResizeModule from 'diagram-js/lib/features/resize';
import RulesModule from 'diagram-js/lib/features/rules';
import SelectionModule from 'diagram-js/lib/features/selection';
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll';

import ConnectionPreviewModule from "./features/connection-preview";
//import ConnectionPreviewModule from "diagram-js/lib/features/connection-preview";
import Move from './features/move'

import ProvidersModule from './providers';

import RendererModule from './draw'

/**
 * A module that changes the default diagram look.
 */
const ElementStyleModule = {
    __init__: [
        ['defaultRenderer', function (defaultRenderer) {
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
export default function EditorLib(options) {
    const {
        container,
        additionalModules = [
            ConnectionPreviewModule,
            Move
        ]
    } = options;

    // default modules provided by the toolbox
    const builtinModules = [
        ConnectModule,
        ContextPadModule,
        CreateModule,
        LassoToolModule,
        ModelingModule,
        MoveCanvasModule,
        //MoveModule,
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
        ElementStyleModule
    ];

    let modules = [
        ...builtinModules,
        ...customModules,
        ...additionalModules,
    ]

    const diagram = new Diagram({
        canvas: {
            container
        },
        modules: modules
    });

    return diagram;
}