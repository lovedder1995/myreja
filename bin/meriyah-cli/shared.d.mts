export function importMeriyah(): Promise<any>

export function importTypescript(): Promise<any>

export function loadForbiddenWords(): Promise<Set<string>>

export function printHelp(): void

export function isPathLike(
    value: unknown
): value is string

export function collectFiles(
    inputPath: string,
    out: Set<string>
): Promise<void>

