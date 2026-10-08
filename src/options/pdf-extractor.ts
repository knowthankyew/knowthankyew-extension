import { Unzlib } from 'fflate';

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
      if (mapping.size >= 4000) break;
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
        const end = parseInt(arrayMatch[2], 16);
        const maxTokens = Math.max(0, end - start + 1);
        const hexTokens = arrayMatch[3].match(/<([0-9a-fA-F]+)>/g) || [];
        const limit = Math.min(hexTokens.length, maxTokens);
        for (let i = 0; i < limit; i++) {
          if (mapping.size >= 4000) break;
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
        if (end < start || end - start > 0xffff) continue;
        for (let c = start; c <= end; c++) {
          if (mapping.size >= 4000) break;
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
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      let aborted = false;
      const MAX_DECOMPRESSED_BYTES = 20 * 1024 * 1024;

      const u = new Unzlib((chunk) => {
        if (aborted) return;
        totalBytes += chunk.length;
        if (totalBytes > MAX_DECOMPRESSED_BYTES) {
          aborted = true;
          throw new Error('Decompression limit exceeded');
        }
        chunks.push(chunk);
      });

      const CHUNK_SIZE = 64 * 1024;
      for (let p = 0; p < raw.length; p += CHUNK_SIZE) {
        if (aborted) break;
        const slice = raw.subarray(p, Math.min(raw.length, p + CHUNK_SIZE));
        const isFinal = p + CHUNK_SIZE >= raw.length;
        u.push(slice, isFinal);
      }
      if (aborted) return null;

      const out = new Uint8Array(totalBytes);
      let offset = 0;
      for (const c of chunks) {
        out.set(c, offset);
        offset += c.length;
      }
      return out;
    } catch {
      return null;
    }
  }

  return raw;
}

function unescapePdfString(str: string): string {
  return str.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, esc) => {
    switch (esc) {
      case 'n': return '\n';
      case 'r': return '\r';
      case 't': return '\t';
      case 'b': return '\b';
      case 'f': return '\f';
      case '(': return '(';
      case ')': return ')';
      case '\\': return '\\';
      default:
        return String.fromCharCode(parseInt(esc, 8));
    }
  });
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
  // Cap input buffer at 10MB to prevent main-thread UI lockup
  const MAX_PDF_BUFFER_BYTES = 10 * 1024 * 1024;
  if (buffer.byteLength > MAX_PDF_BUFFER_BYTES) return '';

  const bytes = new Uint8Array(buffer);
  const latin1 = new TextDecoder('latin1').decode(bytes);

  // 1. Discover all Font objects that specify a /ToUnicode CMap and Page objects
  const MAX_SCANNED_OBJECTS = 500;
  const MAX_FONT_OBJECTS = 25;
  const fontToCmap = new Map<number, Map<number, string>>();
  const pageBodies: string[] = [];

  const objRegex = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
  let objMatch: RegExpExecArray | null;
  let objectCount = 0;
  while ((objMatch = objRegex.exec(latin1)) !== null) {
    if (++objectCount > MAX_SCANNED_OBJECTS) break;
    const objNum = Number(objMatch[1]);
    const body = objMatch[2];
    if (body.includes('/Type') && /\/Type\s*\/Font\b/.test(body)) {
      if (fontToCmap.size < MAX_FONT_OBJECTS) {
        const toUnicodeMatch = /\/ToUnicode\s+(\d+)\s+0\s+R/.exec(body);
        if (toUnicodeMatch) {
          const cmapObjNum = Number(toUnicodeMatch[1]);
          const stream = getObjectStream(latin1, bytes, cmapObjNum);
          fontToCmap.set(objNum, parseCMap(stream));
        }
      }
    } else if (body.includes('/Type') && /\/Type\s*\/Page\b/.test(body)) {
      pageBodies.push(body);
    }
  }

  // 2. Discover all Page objects and extract their content streams
  const pagesText: string[] = [];

  for (const pageBody of pageBodies) {
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
