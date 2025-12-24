export type Span = {
    start: number
    end: number
}

export type Replacement = Span & {
    text: string
}

export function applyReplacements(
    sourceText: string,
    replacements: Replacement[]
): string

export function stripTrailingWhitespace(
    sourceText: string
): string

export function convertTabsToFourSpacesOutsideTokens(
    sourceText: string,
    spans: Span[]
): string

export function mergeSpans(
    spans: Span[],
    len: number
): Span[]

export function reindentFourSpacesOutsideTokens(
    sourceText: string,
    tokenSpans: Span[],
    braceEvents: { pos: number, delta: 1 | -1 }[]
): string

export function isInsideAnySpan(
    index: number,
    spans: Span[]
): boolean

