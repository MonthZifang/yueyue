import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './md';

describe('renderMarkdown', () => {
  it('renders headings and sanitizes script', () => {
    const html = renderMarkdown('# Hello\n\n<script>alert(1)</script>');
    expect(html).toContain('<h1');
    expect(html).toContain('Hello');
    expect(html).not.toContain('alert(1)');
  });
});
