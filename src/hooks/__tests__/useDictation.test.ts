import { describe, expect, it } from 'vitest';
import { appendDictatedText } from '../useDictation';

describe('appendDictatedText', () => {
  it('returns spoken text when existing notes are empty', () => {
    expect(appendDictatedText('', '  Enjoyed discussing Psalm 37:29.  ')).toBe(
      'Enjoyed discussing Psalm 37:29.'
    );
  });

  it('inserts a single space when existing notes end with a character', () => {
    expect(appendDictatedText('Met on Saturday.', 'Asked about prayer.')).toBe(
      'Met on Saturday. Asked about prayer.'
    );
  });

  it('does not add extra spaces after trailing whitespace or newline', () => {
    expect(appendDictatedText('Notes:\n', 'Bring brochure next week.')).toBe(
      'Notes:\nBring brochure next week.'
    );
  });

  it('ignores empty dictated chunks', () => {
    expect(appendDictatedText('Existing text', '   ')).toBe('Existing text');
  });
});
