import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { remarkHighlightApi } from '../src/index';

describe('Meta String Parsing', () => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkHighlightApi, {
      theme: 'dark-plus',
    })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true });

  describe('Line highlighting', () => {
    it('parses simple line numbers {1,3}', async () => {
      const markdown = `\`\`\`javascript {1,3}
line 1
line 2
line 3
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Line 1 should be highlighted
      expect(html).toContain('highlighted');
      expect(html).toMatch(/L0.*highlighted/s);
      expect(html).toMatch(/L2.*highlighted/s);
    });

    it('parses line ranges {1-3}', async () => {
      const markdown = `\`\`\`javascript {1-3}
line 1
line 2
line 3
line 4
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('highlighted');
      expect(html).toMatch(/L0.*highlighted/s);
      expect(html).toMatch(/L1.*highlighted/s);
      expect(html).toMatch(/L2.*highlighted/s);
    });

    it('parses mixed line numbers and ranges {1,3-5,7}', async () => {
      const markdown = `\`\`\`javascript {1,3-5,7}
line 1
line 2
line 3
line 4
line 5
line 6
line 7
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('highlighted');
      expect(html).toMatch(/L0.*highlighted/s); // line 1
      expect(html).toMatch(/L2.*highlighted/s); // line 3
      expect(html).toMatch(/L3.*highlighted/s); // line 4
      expect(html).toMatch(/L4.*highlighted/s); // line 5
      expect(html).toMatch(/L6.*highlighted/s); // line 7
    });
  });

  describe('Line numbers', () => {
    it('parses showLineNumbers flag', async () => {
      const markdown = `\`\`\`javascript showLineNumbers
const x = 1;
const y = 2;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('line-number');
      expect(html).toContain('>1</span>');
      expect(html).toContain('>2</span>');
    });

    it('parses lineNumbers flag', async () => {
      const markdown = `\`\`\`javascript lineNumbers
const x = 1;
const y = 2;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('line-number');
      expect(html).toContain('>1</span>');
      expect(html).toContain('>2</span>');
    });

    it('parses custom start number showLineNumbers:10', async () => {
      const markdown = `\`\`\`javascript showLineNumbers:10
const x = 1;
const y = 2;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('line-number');
      expect(html).toContain('>10</span>');
      expect(html).toContain('>11</span>');
    });

    it('parses custom start number lineNumbers:5', async () => {
      const markdown = `\`\`\`javascript lineNumbers:5
const x = 1;
const y = 2;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('line-number');
      expect(html).toContain('>5</span>');
      expect(html).toContain('>6</span>');
    });
  });

  describe('Diff indicators', () => {
    it('parses added lines +1,3', async () => {
      const markdown = `\`\`\`javascript +1,3
line 1
line 2
line 3
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('diff');
      expect(html).toContain('add');
      expect(html).toMatch(/L0.*diff.*add/s);
      expect(html).toMatch(/L2.*diff.*add/s);
    });

    it('parses removed lines -2,4', async () => {
      const markdown = `\`\`\`javascript -2,4
line 1
line 2
line 3
line 4
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('diff');
      expect(html).toContain('remove');
      expect(html).toMatch(/L1.*diff.*remove/s);
      expect(html).toMatch(/L3.*diff.*remove/s);
    });

    it('parses combined diff +1,2 -3,4', async () => {
      const markdown = `\`\`\`javascript +1,2 -3,4
line 1
line 2
line 3
line 4
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('diff');
      expect(html).toContain('add');
      expect(html).toContain('remove');
      expect(html).toMatch(/L0.*diff.*add/s);
      expect(html).toMatch(/L1.*diff.*add/s);
      expect(html).toMatch(/L2.*diff.*remove/s);
      expect(html).toMatch(/L3.*diff.*remove/s);
    });
  });

  describe('Focus lines', () => {
    it('parses focus{2,3}', async () => {
      const markdown = `\`\`\`javascript focus{2,3}
line 1
line 2
line 3
line 4
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Non-focused lines should be blurred
      expect(html).toMatch(/L0.*class="line blurred"/); // line 1
      expect(html).toMatch(/L3.*class="line blurred"/); // line 4
      // Lines 2 and 3 should not have blurred class
      expect(html).toMatch(/L1.*class="line(?! blurred)/);
      expect(html).toMatch(/L2.*class="line(?! blurred)/);
    });

    it('parses focus with ranges focus{1-2,4}', async () => {
      const markdown = `\`\`\`javascript focus{1-2,4}
line 1
line 2
line 3
line 4
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Line 3 should be blurred (not in focus)
      expect(html).toMatch(/L2.*class="line blurred"/);
      // Lines 1, 2, 4 should not have blurred class
      expect(html).toMatch(/L0.*class="line(?! blurred)/);
      expect(html).toMatch(/L1.*class="line(?! blurred)/);
      expect(html).toMatch(/L3.*class="line(?! blurred)/);
    });
  });

  describe('Combined features', () => {
    it('combines line numbers and highlighting {1,3} showLineNumbers', async () => {
      const markdown = `\`\`\`javascript {1,3} showLineNumbers
const a = 1;
const b = 2;
const c = 3;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('line-number');
      expect(html).toContain('highlighted');
      expect(html).toContain('>1</span>');
      expect(html).toContain('>2</span>');
      expect(html).toContain('>3</span>');
    });

    it('combines highlighting and diff {1-2} +1 -2', async () => {
      const markdown = `\`\`\`javascript {1-2} +1 -2
line 1
line 2
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('highlighted');
      expect(html).toContain('diff');
      expect(html).toContain('add');
      expect(html).toContain('remove');
    });

    it('combines all features {2} showLineNumbers:10 +2 focus{2}', async () => {
      const markdown = `\`\`\`javascript {2} showLineNumbers:10 +2 focus{2}
line 1
line 2
line 3
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).toContain('line-number');
      expect(html).toContain('>10</span>');
      expect(html).toContain('highlighted');
      expect(html).toContain('diff');
      expect(html).toContain('add');
      expect(html).toContain('blurred'); // lines 1 and 3 should be blurred
    });
  });

  describe('Meta string edge cases', () => {
    it('handles no meta string', async () => {
      const markdown = `\`\`\`javascript
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).not.toContain('line-number');
      expect(html).not.toContain('highlighted');
      expect(html).not.toContain('diff');
      expect(html).not.toContain('blurred');
    });

    it('handles empty meta string', async () => {
      const markdown = `\`\`\`javascript
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      expect(html).not.toContain('line-number');
      expect(html).not.toContain('highlighted');
    });

    it('handles unrelated meta string content', async () => {
      const markdown = `\`\`\`javascript title="example.js"
const x = 1;
\`\`\``;

      const result = await processor.process(markdown);
      const html = String(result);

      // Should not break, just ignore unrecognized meta
      expect(html).toBeDefined();
    });

    it('global lineNumbers option is overridden by meta string', async () => {
      const processorWithLineNumbers = unified()
        .use(remarkParse)
        .use(remarkHighlightApi, {
          theme: 'dark-plus',
          lineNumbers: { start: 100 }, // Global default
        })
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeStringify, { allowDangerousHtml: true });

      const markdown = `\`\`\`javascript lineNumbers:5
const x = 1;
const y = 2;
\`\`\``;

      const result = await processorWithLineNumbers.process(markdown);
      const html = String(result);

      // Should use meta string value (5), not global (100)
      expect(html).toContain('>5</span>');
      expect(html).toContain('>6</span>');
      expect(html).not.toContain('>100</span>');
    });
  });
});
