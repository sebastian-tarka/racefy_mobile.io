import { splitCommentaryMentions } from '../mentions';

describe('splitCommentaryMentions', () => {
  const mentions = [{ id: 3, username: 'sebastian_tarka', name: 'Sebastian' }];

  it('marks only listed participants, ignoring case', () => {
    expect(splitCommentaryMentions('@Sebastian_Tarka goes, @someone watches.', mentions)).toEqual([
      { text: '@Sebastian_Tarka', username: 'sebastian_tarka' },
      { text: ' goes, ' },
      { text: '@someone' },
      { text: ' watches.' },
    ]);
  });

  it('returns the whole text when nobody is mentioned', () => {
    expect(splitCommentaryMentions('No handles here', [])).toEqual([{ text: 'No handles here' }]);
    expect(splitCommentaryMentions('@a b', undefined)).toEqual([{ text: '@a b' }]);
    expect(splitCommentaryMentions(null, mentions)).toEqual([]);
  });
});
