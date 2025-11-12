import { test, expect } from '@playwright/test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkHighlightApi } from '../../src/index';

/**
 * Helper to process markdown through the full pipeline and render in browser
 */
async function processAndRender(markdown: string, options = {}) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkHighlightApi, options)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true });

  const result = await processor.process(markdown);
  const html = String(result);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: monospace; }
    pre { background: #1e1e1e; padding: 1em; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}

test.describe('End-to-End Browser Tests', () => {
  test('renders multiple code blocks without errors (AST index bug)', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const markdown = `
# Test Document

First code block:

\`\`\`javascript
const first = 1;
const second = 2;
\`\`\`

Second code block:

\`\`\`javascript
const third = 3;
const fourth = 4;
\`\`\`

Third code block:

\`\`\`typescript
const fifth = 5;
const sixth = 6;
\`\`\`
`;

    const html = await processAndRender(markdown);
    await page.setContent(html);
    await page.waitForTimeout(200);

    // Should have no Range creation errors
    const rangeErrors = consoleErrors.filter((msg) => msg.includes('Range creation failed'));
    expect(rangeErrors).toHaveLength(0);

    // Should have highlights registered for all three blocks
    const highlightCount = await page.evaluate(() => {
      return CSS.highlights.size;
    });
    expect(highlightCount).toBeGreaterThan(0);

    // Verify all three code blocks are present
    const preCount = await page.locator('pre.shiki').count();
    expect(preCount).toBe(3);

    // Verify content is correct (not duplicated/corrupted)
    const firstBlock = await page.locator('pre.shiki').nth(0).textContent();
    const secondBlock = await page.locator('pre.shiki').nth(1).textContent();
    const thirdBlock = await page.locator('pre.shiki').nth(2).textContent();

    expect(firstBlock).toContain('first');
    expect(firstBlock).toContain('second');
    expect(secondBlock).toContain('third');
    expect(secondBlock).toContain('fourth');
    expect(thirdBlock).toContain('fifth');
    expect(thirdBlock).toContain('sixth');
  });

  test('renders line numbers without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const markdown = `
\`\`\`javascript showLineNumbers
const x = 1;
const y = 2;
const z = 3;
\`\`\`
`;

    const html = await processAndRender(markdown);
    await page.setContent(html);
    await page.waitForTimeout(100);

    const rangeErrors = consoleErrors.filter((msg) => msg.includes('Range creation failed'));
    expect(rangeErrors).toHaveLength(0);

    // Verify line numbers are present
    const lineNumbers = await page.locator('.line-number').count();
    expect(lineNumbers).toBe(3);

    // Verify highlights work
    const highlightCount = await page.evaluate(() => CSS.highlights.size);
    expect(highlightCount).toBeGreaterThan(0);
  });

  test('renders diff markers without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const markdown = `
\`\`\`javascript +1 -3
const x = 1;
const y = 2;
const z = 3;
\`\`\`
`;

    const html = await processAndRender(markdown);
    await page.setContent(html);
    await page.waitForTimeout(100);

    const rangeErrors = consoleErrors.filter((msg) => msg.includes('Range creation failed'));
    expect(rangeErrors).toHaveLength(0);

    // Verify diff markers are present
    const diffMarkers = await page.locator('.diff-marker').count();
    expect(diffMarkers).toBe(2);

    // Verify highlights work
    const highlightCount = await page.evaluate(() => CSS.highlights.size);
    expect(highlightCount).toBeGreaterThan(0);
  });

  test('renders combined features without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const markdown = `
\`\`\`javascript {1,3} showLineNumbers +2 -3
const x = 1;
const y = 2;
const z = 3;
\`\`\`
`;

    const html = await processAndRender(markdown);
    await page.setContent(html);
    await page.waitForTimeout(100);

    const rangeErrors = consoleErrors.filter((msg) => msg.includes('Range creation failed'));
    expect(rangeErrors).toHaveLength(0);

    // Verify all features are present
    const lineNumbers = await page.locator('.line-number').count();
    expect(lineNumbers).toBe(3);

    const diffMarkers = await page.locator('.diff-marker').count();
    expect(diffMarkers).toBe(2);

    const highlightedLines = await page.locator('.line.highlighted').count();
    expect(highlightedLines).toBe(2);

    // Verify highlights work
    const highlightCount = await page.evaluate(() => CSS.highlights.size);
    expect(highlightCount).toBeGreaterThan(0);
  });

  test('renders multiple code blocks with various features', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    const markdown = `
# Complex Document

Basic block:

\`\`\`javascript
const basic = 1;
\`\`\`

With line numbers:

\`\`\`javascript showLineNumbers
const numbered = 2;
\`\`\`

With diff:

\`\`\`javascript +1 -2
const added = 1;
const removed = 2;
\`\`\`

With everything:

\`\`\`typescript {2,4} showLineNumbers +3 -4
const line1 = 1;
const line2 = 2;
const line3 = 3;
const line4 = 4;
\`\`\`
`;

    const html = await processAndRender(markdown);
    await page.setContent(html);
    await page.waitForTimeout(300);

    // Should have no errors
    const rangeErrors = consoleErrors.filter((msg) => msg.includes('Range creation failed'));
    expect(rangeErrors).toHaveLength(0);

    // Should have no text node warnings
    const textNodeWarnings = consoleWarnings.filter((msg) => msg.includes('No text node found'));
    expect(textNodeWarnings).toHaveLength(0);

    // Verify all blocks are present
    const preCount = await page.locator('pre.shiki').count();
    expect(preCount).toBe(4);

    // Verify highlights work
    const highlightCount = await page.evaluate(() => CSS.highlights.size);
    expect(highlightCount).toBeGreaterThan(0);

    // Verify content is not duplicated or corrupted
    const blocks = await page.locator('pre.shiki').all();
    expect(blocks).toHaveLength(4);

    const contents = await Promise.all(blocks.map((b) => b.textContent()));
    expect(contents[0]).toContain('basic');
    expect(contents[1]).toContain('numbered');
    expect(contents[2]).toContain('added');
    expect(contents[2]).toContain('removed');
    expect(contents[3]).toContain('line1');
    expect(contents[3]).toContain('line4');

    // Verify no block has content from another block
    expect(contents[0]).not.toContain('numbered');
    expect(contents[1]).not.toContain('basic');
    expect(contents[1]).not.toContain('added');
  });

  test('handles focus lines without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const markdown = `
\`\`\`javascript focus{1,3}
const focused1 = 1;
const blurred = 2;
const focused3 = 3;
\`\`\`
`;

    const html = await processAndRender(markdown);
    await page.setContent(html);
    await page.waitForTimeout(100);

    const rangeErrors = consoleErrors.filter((msg) => msg.includes('Range creation failed'));
    expect(rangeErrors).toHaveLength(0);

    // Verify blurred lines are present
    const blurredLines = await page.locator('.line.blurred').count();
    expect(blurredLines).toBe(1);

    // Verify highlights work
    const highlightCount = await page.evaluate(() => CSS.highlights.size);
    expect(highlightCount).toBeGreaterThan(0);
  });

  test('handles global line numbers option', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const markdown = `
\`\`\`javascript
const x = 1;
const y = 2;
\`\`\`

\`\`\`typescript
const z = 3;
\`\`\`
`;

    const html = await processAndRender(markdown, { lineNumbers: true });
    await page.setContent(html);
    await page.waitForTimeout(200);

    const rangeErrors = consoleErrors.filter((msg) => msg.includes('Range creation failed'));
    expect(rangeErrors).toHaveLength(0);

    // Both blocks should have line numbers
    const lineNumbers = await page.locator('.line-number').count();
    expect(lineNumbers).toBe(3); // 2 lines in first block + 1 in second

    // Verify highlights work
    const highlightCount = await page.evaluate(() => CSS.highlights.size);
    expect(highlightCount).toBeGreaterThan(0);
  });
});
