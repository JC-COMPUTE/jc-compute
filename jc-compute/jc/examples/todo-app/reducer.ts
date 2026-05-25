import { Reducer } from '../../src';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoState {
  todos: Todo[];
}

export type TodoPayload = {
  id: string;
  text?: string;
};

export const todoReducer: Reducer<TodoState, TodoPayload> = (state, event) => {
  switch (event.type) {
    case 'todo.add':
      return {
        todos: [
          ...state.todos,
          { id: event.payload.id, text: event.payload.text ?? '', completed: false }
        ]
      };
    case 'todo.toggle':
      return {
        todos: state.todos.map(todo =>
          todo.id === event.payload.id ? { ...todo, completed: !todo.completed } : todo
        )
      };
    case 'todo.remove':
      return {
        todos: state.todos.filter(todo => todo.id !== event.payload.id)
      };
    default:
      return state;
  }
};
