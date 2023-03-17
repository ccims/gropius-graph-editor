import inherits from 'inherits-browser';

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import DefaultRenderer from 'diagram-js/lib/draw/DefaultRenderer';
import {getColor} from './RenderUtil'

import {
    componentsToPath,
    createLine
} from 'diagram-js/lib/util/RenderUtil';

import {
    append as svgAppend,
    attr as svgAttr,
    create as svgCreate,
    classes as svgClasses,
    remove as svgRemove
} from 'tiny-svg';

import {assign} from 'min-dash';

import {
    isFrameElement
} from 'diagram-js/lib/util/Elements';
import visuals from "diagram-js/lib/features/grid-snapping/visuals";


/**
 * @typedef {import('../core/EventBus').default} EventBus
 * @typedef {import('./Styles').default} Styles
 */

// apply default renderer with lowest possible priority
// so that it only kicks in if noone else could render
var DEFAULT_RENDER_PRIORITY = 1;
var DEFAULT_TEXT_SIZE = 16;

/**
 * The default renderer used for shapes and connections.
 *
 * @param {EventBus} eventBus
 * @param {Styles} styles
 */
export default function Renderer(eventBus, styles, textRenderer) {
    DefaultRenderer.call(this, eventBus, styles);

    this.CONNECTION_STYLE = styles.style(['no-fill'], {strokeWidth: 5, stroke: 'blue'});
    this.SHAPE_STYLE = styles.style({fill: 'white', stroke: 'black', strokeWidth: 2, strokeDasharray: 0});
    this.FRAME_STYLE = styles.style(['no-fill'], {stroke: 'blue', strokeDasharray: 4, strokeWidth: 2});

    this.handler = function (visuals, element) {
        switch (element.type) {
            case 'rectangle':
                renderRectangle(visuals, element, 0, this.SHAPE_STYLE);
                break;
            case 'rectangle-custom':
                renderRectangle(visuals, element, element.custom.r, element.custom.style)
                break;
            case 'rectangle-rounded':
                renderRectangle(visuals, element, 10, this.SHAPE_STYLE);
                break;
            case 'diamond':
                renderDiamond(visuals, element, this.SHAPE_STYLE)
                break;
            case 'diamond-custom':
                renderDiamond(visuals, element, element.custom.style)
                break;
            default:
                renderRectangle(visuals, element, 0, this.SHAPE_STYLE);
        }
        if (element.custom && element.custom.label)
            renderEmbeddedLabel(visuals, element, "center-middle", element.custom.label);
    }

    function renderRectangle(visuals, element, r, attrs) {
        var rect = svgCreate('rect');

        attrs = styles.style(attrs);

        svgAttr(rect, {
            x: 0,
            y: 0,
            width: element.width || 0,
            height: element.height || 0,
            rx: r,
            ry: r,
            // fill: 'grey', stroke: 'black', strokeWidth: 2,
            ...attrs
        });

        svgAppend(visuals, rect);

        return rect;
    }

    function renderDiamond(parentGfx, element, attrs) {
        let width = element.width;
        let height = element.height;

        var x_2 = width / 2;
        var y_2 = height / 2;

        var points = [
            {x: x_2, y: 0},
            {x: width, y: y_2},
            {x: x_2, y: height},
            {x: 0, y: y_2}
        ];

        var pointsString = points.map(function (point) {
            return point.x + ',' + point.y;
        }).join(' ');

        attrs = styles.style(attrs);

        var polygon = svgCreate('polygon', {
            ...attrs,
            points: pointsString
        });

        svgAppend(parentGfx, polygon);

        return polygon;
    }

    function renderLabel(parentGfx, label, options) {

        options = assign({
            size: {
                width: 100
            }
        }, options);

        var text = textRenderer.createText(label || '', options);

        svgClasses(text).add('djs-label');

        svgAppend(parentGfx, text);

        return text;
    }

    function renderEmbeddedLabel(parentGfx, element, align, text, fontSize) {
        return renderLabel(parentGfx, text, {
            box: element,
            align: align,
            padding: 5,
            style: {
                fill: "black",
                fontSize: fontSize || DEFAULT_TEXT_SIZE,
            },
        });
    }

    function renderExternalLabel(parentGfx, element, text) {
        var box = {
            width: 90,
            height: 30,
            x: element.width / 2 + element.x,
            y: element.height / 2 + element.y,
        };
        return renderLabel(parentGfx, text, {
            box: box,
            fitBox: true,
            style: assign({}, textRenderer.getExternalStyle(), {
                fill: "black",
            }),
        });
    }
}

inherits(Renderer, DefaultRenderer);

Renderer.prototype.canRender = function () {
    return true;
};

Renderer.prototype.drawConnection = function drawConnection(visuals, connection, attrs) {

    var line = createLine(connection.waypoints, assign({}, this.CONNECTION_STYLE, attrs || {}));
    svgAppend(visuals, line);

    return line;
};

Renderer.prototype.drawShape = function drawShape(visuals, element) {
    this.handler(visuals, element)
}

Renderer.prototype.getShapePath = function getShapePath(shape) {

    var x = shape.x,
        y = shape.y,
        width = shape.width,
        height = shape.height;

    var shapePath = [
        ['M', x, y],
        ['l', width, 0],
        ['l', 0, height],
        ['l', -width, 0],
        ['z']
    ];

    return componentsToPath(shapePath);
};

Renderer.prototype.getConnectionPath = function getConnectionPath(connection) {
    var waypoints = connection.waypoints;

    var idx, point, connectionPath = [];

    for (idx = 0; (point = waypoints[idx]); idx++) {

        // take invisible docking into account
        // when creating the path
        point = point.original || point;

        connectionPath.push([idx === 0 ? 'M' : 'L', point.x, point.y]);
    }

    return componentsToPath(connectionPath);
};

Renderer.$inject = ['eventBus', 'styles', 'textRenderer'];

DefaultRenderer.prototype.drawShape = function drawShape(visuals, element) {

}

DefaultRenderer.prototype.drawConnection = function drawShape(visuals, element) {

}