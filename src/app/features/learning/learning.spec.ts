import { lessonBlocks } from './learning.api';

describe('lessonBlocks', () => {
  it('splits paragraphs and bullet lists', () => {
    expect(lessonBlocks('Intro line\ncontinues.\n\nList:\n- one\n- two\n\nEnd.')).toEqual([
      { type: 'p', text: 'Intro line continues.' },
      { type: 'p', text: 'List:' },
      { type: 'ul', items: ['one', 'two'] },
      { type: 'p', text: 'End.' },
    ]);
  });
});
