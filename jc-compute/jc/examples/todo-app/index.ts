import { JCCompute } from '../../src';
import { todoReducer, TodoPayload, TodoState } from './reducer';

export function createTodoApp(): JCCompute<TodoState, TodoPayload> {
  return new JCCompute({
    initialState: { todos: [] },
    reducer: todoReducer
  });
}
