import { describe, it, expect } from 'vitest';
import { extractTextFromPdfBuffer } from '../src/options/pdf-extractor';
import { scanDocumentText } from '../src/core/engine';
import { zlibSync } from 'fflate';

describe('PDF Text Extractor (pdf-extractor.test.ts)', () => {
  it('returns empty string for empty buffer', () => {
    expect(extractTextFromPdfBuffer(new ArrayBuffer(0))).toBe('');
  });

  it('extracts fallback uncompressed Tj strings', () => {
    const rawPdf = `%PDF-1.4
1 0 obj
<< /Length 40 >>
stream
BT
/F1 12 Tf
(This is an arbitration clause.) Tj
ET
endstream
endobj`;
    const buffer = new TextEncoder().encode(rawPdf).buffer;
    const text = extractTextFromPdfBuffer(buffer);
    expect(text).toContain('This is an arbitration clause.');
  });

  it('extracts FlateDecode compressed stream with zero egress', () => {
    const streamContent = 'BT /F1 12 Tf (Any dispute arising hereunder shall be resolved by binding arbitration administered by the American Arbitration Association.) Tj ET';
    const compressed = zlibSync(new TextEncoder().encode(streamContent));

    const pdfHeader = `%PDF-1.4\n1 0 obj\n<< /Type /Page /Contents 2 0 R >>\nendobj\n2 0 obj\n<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`;
    const pdfFooter = `\nendstream\nendobj\nxref\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;

    const hBytes = new TextEncoder().encode(pdfHeader);
    const fBytes = new TextEncoder().encode(pdfFooter);
    const full = new Uint8Array(hBytes.length + compressed.length + fBytes.length);
    full.set(hBytes, 0);
    full.set(compressed, hBytes.length);
    full.set(fBytes, hBytes.length + compressed.length);

    const extracted = extractTextFromPdfBuffer(full.buffer);
    expect(extracted).toContain('Any dispute arising hereunder shall be resolved by binding arbitration');

    const scanResult = scanDocumentText(extracted, 'synthetic-contract.pdf', ['document-auditor']);
    expect(scanResult.matches.length).toBeGreaterThan(0);
    const titles = scanResult.matches.map(m => m.title);
    expect(titles.some(t => /arbitration/i.test(t))).toBe(true);
  });

  it('safely aborts decompression on zip bombs exceeding 20MB limit without crashing', () => {
    // Generate 21MB of repetitive compressible content
    const bombPayload = new Uint8Array(21 * 1024 * 1024);
    bombPayload.fill(65); // ASCII 'A'
    const compressed = zlibSync(bombPayload);

    const pdfBomb = `%PDF-1.4\n1 0 obj\n<< /Type /Page /Contents 2 0 R >>\nendobj\n2 0 obj\n<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`;
    const pdfFooter = `\nendstream\nendobj\nxref\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;

    const hBytes = new TextEncoder().encode(pdfBomb);
    const fBytes = new TextEncoder().encode(pdfFooter);
    const full = new Uint8Array(hBytes.length + compressed.length + fBytes.length);
    full.set(hBytes, 0);
    full.set(compressed, hBytes.length);
    full.set(fBytes, hBytes.length + compressed.length);

    // Should abort cleanly and return empty string rather than allocating 21MB+ or crashing
    const extracted = extractTextFromPdfBuffer(full.buffer);
    expect(extracted).toBe('');
  });

  it('handles truncated or malformed streams gracefully', () => {
    // Stream with invalid/incomplete Flate data
    const malformed = `%PDF-1.4\n1 0 obj\n<< /Type /Page /Contents 2 0 R >>\nendobj\n2 0 obj\n<< /Length 15 /Filter /FlateDecode >>\nstream\nNOT_VALID_ZLIB_DATA\nendstream\nendobj\n%%EOF`;
    const buffer = new TextEncoder().encode(malformed).buffer;
    const extracted = extractTextFromPdfBuffer(buffer);
    expect(extracted).toBe('');
  });

  it('extracts text from TJ kerning arrays with word spacing', () => {
    const rawPdf = `%PDF-1.4
1 0 obj
<< /Type /Page /Contents 2 0 R >>
endobj
2 0 obj
<< /Length 120 >>
stream
BT
/F1 12 Tf
[(Mandatory) -250 (binding) -200 (arbitration) -220 (clause)] TJ
ET
endstream
endobj
%%EOF`;
    const buffer = new TextEncoder().encode(rawPdf).buffer;
    const extracted = extractTextFromPdfBuffer(buffer);
    expect(extracted).toContain('Mandatory binding arbitration clause');
  });

  it('resolves glyphs via embedded ToUnicode CMap', () => {
    const cmap = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Custom-ToUnicode def
/CMapType 2 def
1 begincodespacerange
<0000> <FFFF>
endcodespacerange
1 beginbfrange
<0001> <0002> <0041>
endbfrange
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;
    const rawPdf = `%PDF-1.4
1 0 obj
<< /Type /Font /Subtype /Type0 /ToUnicode 2 0 R >>
endobj
2 0 obj
<< /Length ${cmap.length} >>
stream
${cmap}
endstream
endobj
3 0 obj
<< /Type /Page /Font << /F1 1 0 R >> /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 40 >>
stream
BT
/F1 12 Tf
<00010002> Tj
ET
endstream
endobj
%%EOF`;
    const buffer = new TextEncoder().encode(rawPdf).buffer;
    const extracted = extractTextFromPdfBuffer(buffer);
    expect(extracted).toContain('AB');
  });
});
