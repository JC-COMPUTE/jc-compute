import { EventFactory } from '../../src';
import { createTodoApp } from './index';

describe('todo example', () => {
  it('adds and toggles todos', () => {
    const app = createTodoApp();

    const added = EventFactory.createEvent('todo.add', { id: 't1', text: 'Write docs' });
    app.emit(added);
    app.emit(EventFactory.createChildEvent(added.id, 'todo.toggle', { id: 't1' }));

    expect(app.getState().todos).toEqual([
      { id: 't1', text: 'Write docs', completed: true }
    ]);
  });
});
