/**
 * Extracts candidate legal text, checkout disclaimers, and subscription terms
 * from the active webpage while ignoring navigation, script, and style noise.
 */
export function extractPageLegalText(): string {
  // Elements likely to contain contracts, fine print, checkout forms, and modals
  const selectors = [
    'main',
    'article',
    '[role="dialog"]',
    '[role="main"]',
    '.terms',
    '.legal',
    '.privacy',
    '.disclaimer',
    '.checkout',
    '.subscription',
    '.agreement',
    '.modal',
    '#terms',
    '#privacy',
    '#legal',
    'form'
  ];

  const candidateNodes: Element[] = [];
  for (const sel of selectors) {
    const nodes = document.querySelectorAll(sel);
    nodes.forEach(n => candidateNodes.push(n));
  }

  // Fallback to document.body if specific containers are sparse
  if (candidateNodes.length === 0 && document.body) {
    candidateNodes.push(document.body);
  }

  const collectedStrings: string[] = [];

  for (const node of candidateNodes) {
    // Clone and strip unwanted tags
    const clone = node.cloneNode(true) as HTMLElement;
    const unwanted = clone.querySelectorAll('script, style, noscript, svg, nav, footer, header');
    unwanted.forEach(el => el.remove());

    const text = clone.innerText || clone.textContent || '';
    if (text.trim().length > 0) {
      collectedStrings.push(text);
    }
  }

  // Combine and deduplicate redundant spans
  return collectedStrings.join('\n\n');
}
