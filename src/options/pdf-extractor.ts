import { unzlibSync } from 'fflate';

/**
 * Parses embedded CMaps from PDF /ToUnicode streams.
 * Maps character codes to Unicode characters.
 */
function parseCMap(decompressedBytes: Uint8Array | null): Map<number, string> {
  const mapping = new Map<number, string>();
  if (!decompressedBytes || decompressedBytes.length === 0) return mapping;

  const text = new TextDecoder('latin1').decode(decompressedBytes);

  // 1. Parse beginbfchar ... endbfchar
  const bfCharSectionRegex = /beginbfchar([\s\S]*?)endbfchar/g;
  let charSec: RegExpExecArray | null;
  while ((charSec = bfCharSectionRegex.exec(text)) !== null) {
    const bfCharRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let m: RegExpExecArray | null;
    while ((m = bfCharRegex.exec(charSec[1])) !== null) {
      const srcCode = parseInt(m[1], 16);
      const dstHex = m[2];
      let str = '';
      for (let i = 0; i < dstHex.length; i += 4) {
        str += String.fromCharCode(parseInt(dstHex.slice(i, i + 4), 16));
      }
      mapping.set(srcCode, str);
    }
  }

  // 2. Parse beginbfrange ... endbfrange
  const bfRangeSectionRegex = /beginbfrange([\s\S]*?)endbfrange/g;
  let rangeSec: RegExpExecArray | null;
  while ((rangeSec = bfRangeSectionRegex.exec(text)) !== null) {
    const rangeLines = rangeSec[1].trim().split('\n');
    for (const line of rangeLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Format A: <start> <end> [ <dest1> <dest2> ... ]
      const arrayMatch = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/.exec(trimmed);
      if (arrayMatch) {
        const start = parseInt(arrayMatch[1], 16);
        const hexTokens = arrayMatch[3].match(/<([0-9a-fA-F]+)>/g) || [];
        for (let i = 0; i < hexTokens.length; i++) {
          const hex = hexTokens[i].slice(1, -1);
          let str = '';
          for (let j = 0; j < hex.length; j += 4) {
            str += String.fromCharCode(parseInt(hex.slice(j, j + 4), 16));
          }
          mapping.set(start + i, str);
        }
        continue;
      }

      // Format B: <start> <end> <destStart>
      const rangeMatch = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/.exec(trimmed);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 16);
        const end = parseInt(rangeMatch[2], 16);
        const dstStart = parseInt(rangeMatch[3], 16);
        for (let c = start; c <= end; c++) {
          mapping.set(c, String.fromCharCode(dstStart + (c - start)));
        }
      }
    }
  }

  return mapping;
}

/**
 * Extracts raw or Flate-decompressed byte stream from an indirect PDF object.
 */
function getObjectStream(latin1: string, bytes: Uint8Array, objNum: number): Uint8Array | null {
  // Find object header e.g. "12 0 obj" bounded by newline or start-of-file
  let header = `\n${objNum} 0 obj`;
  let idx = latin1.indexOf(header);
  if (idx === -1) {
    if (latin1.startsWith(`${objNum} 0 obj`)) {
      idx = 0;
    } else {
      header = `\r${objNum} 0 obj`;
      idx = latin1.indexOf(header);
      if (idx === -1) return null;
      idx += 1;
    }
  } else {
    idx += 1;
  }

  const endObj = latin1.indexOf('endobj', idx);
  if (endObj === -1) return null;

  const sIdx = latin1.indexOf('stream', idx);
  if (sIdx === -1 || sIdx > endObj) return null;

  let dataStart = sIdx + 6;
  if (bytes[dataStart] === 13) dataStart++;
  if (bytes[dataStart] === 10) dataStart++;

  const eIdx = latin1.indexOf('endstream', dataStart);
  if (eIdx === -1 || eIdx > endObj) return null;

  let raw = bytes.subarray(dataStart, eIdx);
  while (raw.length > 0 && (raw[raw.length - 1] === 10 || raw[raw.length - 1] === 13)) {
    raw = raw.subarray(0, raw.length - 1);
  }

  const headerStr = latin1.slice(idx, sIdx);
  if (headerStr.includes('/FlateDecode')) {
    try {
      return unzlibSync(raw);
    } catch {
      return null;
    }
  }

  return raw;
}

function unescapePdfString(str: string): string {
  return str
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function decodeHexString(hex: string, cmap: Map<number, string> | null): string {
  let s = '';
  if (cmap && cmap.size > 0) {
    // Identity-H 2-byte glyph mapping
    for (let k = 0; k < hex.length; k += 4) {
      const code = parseInt(hex.slice(k, k + 4), 16);
      s += cmap.get(code) || (code <= 255 ? String.fromCharCode(code) : '');
    }
  } else {
    // 1-byte standard hex
    for (let k = 0; k < hex.length; k += 2) {
      s += String.fromCharCode(parseInt(hex.slice(k, k + 2), 16));
    }
  }
  return s;
}

/**
 * Robust zero-egress PDF text extractor.
 * Handles FlateDecode compression, Identity-H subset font CMaps (Google Docs / Skia / macOS / Adobe),
 * literal Tj strings, and TJ array kerning.
 */
export function extractTextFromPdfBuffer(buffer: ArrayBuffer): string {
  if (!buffer || buffer.byteLength === 0) return '';

  const bytes = new Uint8Array(buffer);
  const latin1 = new TextDecoder('latin1').decode(bytes);

  // 1. Discover all Font objects that specify a /ToUnicode CMap
  const fontToCmap = new Map<number, Map<number, string>>();
  const fontRegex = /(\d+)\s+0\s+obj(?:(?!endobj)[\s\S])*?\/Type\s*\/Font(?:(?!endobj)[\s\S])*?\/ToUnicode\s+(\d+)\s+0\s+R/g;
  let fontMatch: RegExpExecArray | null;
  while ((fontMatch = fontRegex.exec(latin1)) !== null) {
    const fontObjNum = Number(fontMatch[1]);
    const cmapObjNum = Number(fontMatch[2]);
    const stream = getObjectStream(latin1, bytes, cmapObjNum);
    fontToCmap.set(fontObjNum, parseCMap(stream));
  }

  // 2. Discover all Page objects and extract their content streams
  const pageObjRegex = /(\d+)\s+0\s+obj(?:(?!endobj)[\s\S])*?\/Type\s*\/Page\b([\s\S]*?)endobj/g;
  let pageMatch: RegExpExecArray | null;
  const pagesText: string[] = [];

  while ((pageMatch = pageObjRegex.exec(latin1)) !== null) {
    const pageBody = pageMatch[2];
    const pageFontMap = new Map<string, Map<number, string>>();

    // Extract font aliases defined in the page resource dictionary: /Font << /F1 4 0 R /F2 5 0 R >>
    const fontDictMatch = /\/Font\s*<<([\s\S]*?)>>/.exec(pageBody);
    if (fontDictMatch) {
      const fontRefRegex = /\/(F\w+)\s+(\d+)\s+0\s+R/g;
      let fr: RegExpExecArray | null;
      while ((fr = fontRefRegex.exec(fontDictMatch[1])) !== null) {
        const fontName = fr[1];
        const fontObjNum = Number(fr[2]);
        if (fontToCmap.has(fontObjNum)) {
          pageFontMap.set(fontName, fontToCmap.get(fontObjNum)!);
        }
      }
    }

    // Extract /Contents object references
    const contentsMatch = /\/Contents\s+(?:(\d+)\s+0\s+R|\[([\s\S]*?)\])/.exec(pageBody);
    if (!contentsMatch) continue;

    const contentObjNums: number[] = [];
    if (contentsMatch[1]) {
      contentObjNums.push(Number(contentsMatch[1]));
    } else if (contentsMatch[2]) {
      const cr = /(\d+)\s+0\s+R/g;
      let cm: RegExpExecArray | null;
      while ((cm = cr.exec(contentsMatch[2])) !== null) {
        contentObjNums.push(Number(cm[1]));
      }
    }

    let pageText = '';
    for (const cNum of contentObjNums) {
      const streamBytes = getObjectStream(latin1, bytes, cNum);
      if (!streamBytes) continue;
      const streamStr = new TextDecoder('latin1').decode(streamBytes);

      let currentFont = '';
      let activeCmap: Map<number, string> | null = null;

      // Match font selects (/F1 16 Tf), hex Tj (<...> Tj), literal Tj ((...) Tj), TJ arrays ([...] TJ)
      const tokenRegex = /\/(F\w+)\s+[\d.]+\s+Tf|<([0-9a-fA-F]+)>\s*Tj|\(([\s\S]*?)\)\s*(?:Tj|'|")|\[([\s\S]*?)\]\s*TJ/g;
      let tok: RegExpExecArray | null;

      while ((tok = tokenRegex.exec(streamStr)) !== null) {
        if (tok[1]) {
          currentFont = tok[1];
          activeCmap = pageFontMap.get(currentFont) || null;
        } else if (tok[2]) {
          pageText += decodeHexString(tok[2], activeCmap);
        } else if (tok[3]) {
          pageText += unescapePdfString(tok[3]);
        } else if (tok[4]) {
          const arrayContent = tok[4];
          const subTokRegex = /<([0-9a-fA-F]+)>|\(([\s\S]*?)\)|(-?[\d.]+)/g;
          let sub: RegExpExecArray | null;
          while ((sub = subTokRegex.exec(arrayContent)) !== null) {
            if (sub[1]) {
              pageText += decodeHexString(sub[1], activeCmap);
            } else if (sub[2]) {
              pageText += unescapePdfString(sub[2]);
            } else if (sub[3]) {
              const kerning = parseFloat(sub[3]);
              // Negative displacement in TJ array indicates horizontal spacing
              if (kerning < -180 && !pageText.endsWith(' ')) {
                pageText += ' ';
              }
            }
          }
        }
      }
    }

    if (pageText.trim()) {
      pagesText.push(pageText);
    }
  }

  // Fallback for simple/uncompressed PDFs without standard Page objects
  if (pagesText.length === 0) {
    const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    let match: RegExpExecArray | null;
    const fallbackMatches: string[] = [];
    while ((match = tjRegex.exec(latin1)) !== null) {
      fallbackMatches.push(unescapePdfString(match[1]));
    }
    if (fallbackMatches.length > 0) {
      pagesText.push(fallbackMatches.join(' '));
    }
  }

  return pagesText
    .join('\n\n')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}
