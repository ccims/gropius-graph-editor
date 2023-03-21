import ContextPadProvider from './ContextPadProvider';
import PaletteProvider from './PaletteProvider';
import RuleProvider from './RuleProvider';

export default {
    __init__: [
        'exampleContextPadProvider',
        'examplePaletteProvider',
        'exampleRuleProvider',
    ],
    exampleContextPadProvider: ['type', ContextPadProvider],
    examplePaletteProvider: ['type', PaletteProvider],
    exampleRuleProvider: ['type', RuleProvider],
};