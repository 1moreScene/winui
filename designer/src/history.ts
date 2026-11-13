import { useReducer } from 'react';
import type { DesignDocument } from './model';

interface History { past: DesignDocument[]; present: DesignDocument; future: DesignDocument[] }
type Action = { type: 'commit'; document: DesignDocument } | { type: 'undo' | 'redo' };
function reducer(state: History, action: Action): History {
  if (action.type === 'commit') {
    if (JSON.stringify(state.present) === JSON.stringify(action.document)) return state;
    return { past: [...state.past.slice(-79), state.present], present: action.document, future: [] };
  }
  if (action.type === 'undo' && state.past.length) return {
    past: state.past.slice(0, -1), present: state.past.at(-1)!, future: [state.present, ...state.future],
  };
  if (action.type === 'redo' && state.future.length) return {
    past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1),
  };
  return state;
}
export function useDocumentHistory(document: DesignDocument) {
  const [state, dispatch] = useReducer(reducer, { past: [], present: document, future: [] });
  return { document: state.present, canUndo: !!state.past.length, canRedo: !!state.future.length,
    commit: (document: DesignDocument) => dispatch({ type: 'commit', document }),
    undo: () => dispatch({ type: 'undo' }), redo: () => dispatch({ type: 'redo' }),
  };
}
