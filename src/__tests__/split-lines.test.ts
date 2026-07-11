jest.mock('../lib/supabase', () => ({ supabase: {} }));

import { splitIntoLines } from '../components/ReflectionResponses';

describe('splitIntoLines', () => {
  it('splits on sentence boundaries', () => {
    const lines = splitIntoLines('God met me here. I did not expect that! Will we remember this?');
    expect(lines).toEqual(['God met me here.', 'I did not expect that!', 'Will we remember this?']);
  });

  it('splits on newlines too', () => {
    const lines = splitIntoLines('First thought here\nSecond thought here');
    expect(lines).toEqual(['First thought here', 'Second thought here']);
  });

  it('drops fragments that are too short to keep', () => {
    const lines = splitIntoLines('Amen. This part stayed with me all day.');
    expect(lines).toEqual(['This part stayed with me all day.']);
  });

  it('handles a single unpunctuated reflection', () => {
    const lines = splitIntoLines('we felt carried through the whole week');
    expect(lines).toEqual(['we felt carried through the whole week']);
  });
});
