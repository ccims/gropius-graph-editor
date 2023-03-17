import Renderer from './Renderer'
import TextRenderer from "./TextRenderer";

export default {
    __init__: ["renderer"],
    renderer: ["type", Renderer],
    textRenderer: ["type", TextRenderer]
}