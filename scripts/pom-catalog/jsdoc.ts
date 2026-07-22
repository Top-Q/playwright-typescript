/**
 * JSDoc parsing for the POM catalog.
 *
 * Custom tags: @aliases, @prerequisites, @observable-state, @url.
 * Standard tags handled: @param, @returns, @deprecated.
 *
 * There is deliberately no markdown-heading fallback. The source was
 * normalised to tags in a one-time pass, so a fallback would be dead code
 * while remaining permanently supported legacy surface. Methods missing tags
 * show up in the coverage report instead of being silently patched over.
 */

import * as ts from 'typescript';

export interface ParsedJsDoc {
  description: string;
  aliases: string[];
  prerequisites: string;
  observableState: string;
  url?: string;
  deprecated?: string;
  /** param name -> description */
  params: Map<string, string>;
  returns?: string;
}

/**
 * Normalise whitespace so output is byte-identical across platforms.
 *
 * The TypeScript API returns comment text with the source file's line endings,
 * so on Windows multi-line descriptions arrive containing literal \r\n. Without
 * this, catalog JSON differs between a Windows checkout and CI and `--check`
 * fails on a clean tree.
 */
function normalise(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** Keep paragraph breaks but normalise line endings and trailing space. */
function normaliseDescription(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/** Canonical tag name: lowercased, separators stripped. */
function canonicalTag(name: string): string {
  return name.toLowerCase().replace(/[-_]/g, '');
}

/** Split an @aliases value on commas and/or whitespace. */
function parseAliases(text: string): string[] {
  return text
    .split(/[,\s]+/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
}

export function parseJsDoc(node: ts.Node): ParsedJsDoc {
  const result: ParsedJsDoc = {
    description: '',
    aliases: [],
    prerequisites: '',
    observableState: '',
    params: new Map<string, string>(),
  };

  // The compiler already excludes tag text from a doc block's own comment,
  // so @param text cannot bleed into the description.
  const docs = ts
    .getJSDocCommentsAndTags(node)
    .filter((d): d is ts.JSDoc => ts.isJSDoc(d));
  const descriptions = docs
    .map((doc) => normaliseDescription(ts.getTextOfJSDocComment(doc.comment)))
    .filter((d) => d.length > 0);
  result.description = descriptions.join('\n\n');

  for (const tag of ts.getJSDocTags(node)) {
    const text = normalise(ts.getTextOfJSDocComment(tag.comment));

    if (ts.isJSDocParameterTag(tag)) {
      const name = tag.name.getText();
      // Strip the conventional "- " separator between name and description.
      result.params.set(name, text.replace(/^-\s*/, ''));
      continue;
    }
    if (ts.isJSDocReturnTag(tag)) {
      result.returns = text;
      continue;
    }
    if (ts.isJSDocDeprecatedTag(tag)) {
      result.deprecated = text || 'deprecated';
      continue;
    }

    switch (canonicalTag(tag.tagName.text)) {
      case 'alias':
      case 'aliases':
        result.aliases.push(...parseAliases(text));
        break;
      case 'prerequisite':
      case 'prerequisites':
        result.prerequisites = text;
        break;
      case 'observablestate':
        result.observableState = text;
        break;
      case 'url':
        result.url = text;
        break;
      default:
        break;
    }
  }

  return result;
}
