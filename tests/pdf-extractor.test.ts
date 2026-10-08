import { describe, it, expect } from 'vitest';
import { extractTextFromPdfBuffer } from '../src/options/pdf-extractor';
import { scanDocumentText } from '../src/core/engine';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';

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

  const testPdfPath = process.env.TEST_PDF_PATH || path.join(os.homedir(), 'Downloads', '06.26.2025.pdf');
  if (existsSync(testPdfPath)) {
    it('accurately extracts and audits FlateDecode CMap PDF (06.26.2025.pdf)', async () => {
      const buffer = readFileSync(testPdfPath).buffer;
      const extracted = extractTextFromPdfBuffer(buffer);

      expect(extracted.length).toBeGreaterThan(40000);
      expect(extracted).toContain('CONTRACTOR AGREEMENT');
      expect(extracted).toContain('ALIGNERR LLC');
      expect(extracted.toUpperCase()).toContain('ARBITRATION');

      // Run statutory audit on extracted text
      const scanResult = scanDocumentText(extracted, '06.26.2025.pdf', ['document-auditor']);
      expect(scanResult.matches.length).toBeGreaterThan(0);

      // Verify specific high-severity statutory flags detected in contractor agreement
      const titles = scanResult.matches.map(m => m.title);
      expect(titles.some(t => /arbitration/i.test(t))).toBe(true);
      expect(titles.some(t => /class action/i.test(t))).toBe(true);
    });
  }
});
