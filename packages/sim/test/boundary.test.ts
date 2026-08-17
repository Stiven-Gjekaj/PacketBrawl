import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The rule this package lives by, checked rather than promised.
 *
 * The sim is the whole of the game's logic and it depends on nothing. The
 * client imports it to draw a match, the server imports the same module to
 * decide what happened, and tests run it with no browser. Each of those stops
 * working the moment the package reaches for React, the DOM, a clock, or a
 * random source that a state does not carry.
 *
 * A list of forbidden names would not do this. A search for three names
 * reports success while a fourth import sits in the file, so this allows only
 * relative imports instead of naming what to refuse. Anything that is not a
 * sibling file fails, including packages nobody has thought of yet.
 */

const sourceDirectory = join(dirname(fileURLToPath(import.meta.url)), "../src");

function typeScriptFilesIn(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...typeScriptFilesIn(path));
    } else if (entry.name.endsWith(".ts")) {
      found.push(path);
    }
  }
  return found;
}

/**
 * The file with its comments taken out and its strings left in.
 *
 * A comment that explains which call this package refuses contains the name
 * of that call, and a plain search finds it there and reports a breach that
 * does not exist. Taking a regular expression to the comments instead would
 * mistake a `//` inside a string for the start of one, so this walks the
 * characters and knows which of the two it is inside.
 *
 * Strings stay, because an import specifier is a string, and because a call
 * hidden in a template expression is still a call.
 */
function withoutComments(source: string): string {
  let kept = "";
  let index = 0;

  while (index < source.length) {
    const here = source[index];
    const after = source[index + 1];

    if (here === "/" && after === "/") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (here === "/" && after === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        index += 1;
      }
      index += 2;
      continue;
    }

    if (here === '"' || here === "'" || here === "`") {
      const quote = here;
      kept += here;
      index += 1;
      while (index < source.length && source[index] !== quote) {
        if (source[index] === "\\") {
          kept += source[index];
          index += 1;
        }
        kept += source[index];
        index += 1;
      }
      kept += quote;
      index += 1;
      continue;
    }

    kept += here;
    index += 1;
  }

  return kept;
}

/** Every specifier the file imports from, however it spells the import. */
function importedSpecifiers(source: string): string[] {
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  const specifiers: string[] = [];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier !== undefined) {
        specifiers.push(specifier);
      }
    }
  }
  return specifiers;
}

const sourceFiles = typeScriptFilesIn(sourceDirectory);

describe("the sim package boundary", () => {
  // Without this, every check below passes by finding nothing to check. A
  // renamed directory would turn the whole suite green while enforcing
  // nothing at all, and nobody would see it happen.
  it("has sources to check in the first place", () => {
    expect(sourceFiles.length).toBeGreaterThanOrEqual(8);
  });

  it("imports nothing that is not a file beside it", () => {
    const offences: string[] = [];
    for (const file of sourceFiles) {
      const code = withoutComments(readFileSync(file, "utf8"));
      for (const specifier of importedSpecifiers(code)) {
        if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
          offences.push(`${file} imports ${specifier}`);
        }
      }
    }
    expect(offences).toEqual([]);
  });

  // These are not imports, so the check above cannot see them. Each reads
  // something the state does not carry, which means two runs of one match can
  // disagree, and a recorded match stops replaying.
  it("draws no randomness the state does not carry", () => {
    const offences = sourceFiles.filter((file) =>
      /\bMath\s*\.\s*random\b/.test(
        withoutComments(readFileSync(file, "utf8")),
      ),
    );
    expect(offences).toEqual([]);
  });

  it("reads no clock", () => {
    const patterns = [
      /\bDate\s*\.\s*now\b/,
      /\bnew\s+Date\b/,
      /\bperformance\s*\.\s*now\b/,
    ];
    const offences: string[] = [];
    for (const file of sourceFiles) {
      const source = withoutComments(readFileSync(file, "utf8"));
      if (patterns.some((pattern) => pattern.test(source))) {
        offences.push(file);
      }
    }
    expect(offences).toEqual([]);
  });
});
