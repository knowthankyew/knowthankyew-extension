/**
 * Extracts candidate legal text, checkout disclaimers, and subscription terms
 * from the active webpage while ignoring navigation, script, and style noise.
 * Deduplicates overlapping containers (e.g. main > form.checkout) to ensure
 * text is extracted exactly once.
 */
export const MAX_EXTRACTED_CHAR_CEILING = 50_000;

export function extractPageLegalText(
  root?: Element | Document,
  visited?: Set<Node>
): string {
  const targetDoc = typeof document !== 'undefined' ? document : null;
  let targetRoot: Element | null = null;
  if (root) {
    if ('body' in (root as Document) && (root as Document).body) {
      targetRoot = (root as Document).body;
    } else {
      targetRoot = root as Element;
    }
  } else {
    targetRoot = targetDoc?.body || null;
  }
  if (!targetRoot) return '';

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
    const nodes = targetRoot.querySelectorAll(sel);
    nodes.forEach(n => {
      if (!candidateNodes.includes(n)) {
        candidateNodes.push(n);
      }
    });
  }

  // Fallback to targetRoot if specific containers are sparse
  if (candidateNodes.length === 0) {
    candidateNodes.push(targetRoot as Element);
  }

  // Safety ceiling against adversarial pages with thousands of matching elements
  const MAX_CANDIDATE_NODES = 150;
  const cappedCandidates = candidateNodes.slice(0, MAX_CANDIDATE_NODES);

  // Sort candidate nodes by document preorder so ancestors strictly precede descendants
  cappedCandidates.sort((a, b) => {
    if (a === b) return 0;
    const position = a.compareDocumentPosition(b);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });

  // Single-pass disjoint root collection: skips any node contained inside an already-selected root
  const disjointNodes: Element[] = [];
  for (const node of cappedCandidates) {
    const isContained = disjointNodes.some(root => root.contains(node));
    if (!isContained) {
      disjointNodes.push(node);
    }
  }

  const collectedStrings: string[] = [];

  for (const node of disjointNodes) {
    if (visited && visited.has(node)) {
      continue;
    }

    if (visited) {
      visited.add(node);
      const descendants = node.querySelectorAll('*');
      descendants.forEach(d => visited.add(d));
    }

    // Clone and strip unwanted tags
    const clone = node.cloneNode(true) as HTMLElement;
    const unwanted = clone.querySelectorAll('script, style, noscript, svg, nav, footer, header');
    unwanted.forEach(el => el.remove());

    const text = clone.innerText || clone.textContent || '';
    if (text.trim().length > 0) {
      collectedStrings.push(text);
    }
  }

  // Combine and deduplicate redundant spans with strict 50k safety ceiling
  const combined = collectedStrings.join('\n\n');
  if (combined.length > MAX_EXTRACTED_CHAR_CEILING) {
    return combined.slice(0, MAX_EXTRACTED_CHAR_CEILING);
  }
  return combined;
}

// Alias for spec compatibility
export const extractPageText = extractPageLegalText;

