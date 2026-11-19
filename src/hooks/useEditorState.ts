import { useReducer } from 'react';
import { INITIAL_ADJUSTMENTS, type AdjustmentKey, type AdjustmentValues } from '../types';

interface HistoryState {
  adjustments: AdjustmentValues;
  past: AdjustmentValues[];
  future: AdjustmentValues[];
  editStart: AdjustmentValues | null;
}

type HistoryAction =
  | { type: 'begin' }
  | { type: 'change'; key: AdjustmentKey; value: number }
  | { type: 'commit' }
  | { type: 'apply'; adjustments: AdjustmentValues }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset' };

const initialState: HistoryState = {
  adjustments: INITIAL_ADJUSTMENTS,
  past: [],
  future: [],
  editStart: null,
};

function sameAdjustments(a: AdjustmentValues, b: AdjustmentValues) {
  return Object.keys(a).every((key) => a[key as AdjustmentKey] === b[key as AdjustmentKey]);
}

function remember(state: HistoryState, previous: AdjustmentValues): HistoryState {
  return {
    ...state,
    past: [...state.past, previous].slice(-40),
    future: [],
    editStart: null,
  };
}

function committed(state: HistoryState) {
  if (!state.editStart || sameAdjustments(state.editStart, state.adjustments)) {
    return { ...state, editStart: null };
  }
  return remember(state, state.editStart);
}

function reducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'begin':
      return state.editStart ? state : { ...state, editStart: state.adjustments };
    case 'change':
      return {
        ...state,
        editStart: state.editStart ?? state.adjustments,
        adjustments: { ...state.adjustments, [action.key]: action.value },
      };
    case 'commit':
      return committed(state);
    case 'apply': {
      const ready = committed(state);
      if (sameAdjustments(ready.adjustments, action.adjustments)) return ready;
      return {
        ...ready,
        adjustments: action.adjustments,
        past: [...ready.past, ready.adjustments].slice(-40),
        future: [],
        editStart: null,
      };
    }
    case 'undo': {
      const ready = committed(state);
      if (ready.past.length === 0) return ready;
      const previous = ready.past[ready.past.length - 1];
      return {
        ...ready,
        adjustments: previous,
        past: ready.past.slice(0, -1),
        future: [ready.adjustments, ...ready.future].slice(0, 40),
        editStart: null,
      };
    }
    case 'redo': {
      const ready = committed(state);
      if (ready.future.length === 0) return ready;
      const next = ready.future[0];
      return {
        ...ready,
        adjustments: next,
        past: [...ready.past, ready.adjustments].slice(-40),
        future: ready.future.slice(1),
        editStart: null,
      };
    }
    case 'reset': {
      const ready = committed(state);
      if (sameAdjustments(ready.adjustments, INITIAL_ADJUSTMENTS)) return ready;
      return {
        ...ready,
        adjustments: INITIAL_ADJUSTMENTS,
        past: [...ready.past, ready.adjustments].slice(-40),
        future: [],
        editStart: null,
      };
    }
  }
}

export function useEditorState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return {
    adjustments: state.adjustments,
    canUndo: state.past.length > 0 || Boolean(state.editStart),
    canRedo: state.future.length > 0,
    beginAdjustment: () => dispatch({ type: 'begin' }),
    changeAdjustment: (key: AdjustmentKey, value: number) => dispatch({ type: 'change', key, value }),
    commitAdjustment: () => dispatch({ type: 'commit' }),
    applyAdjustments: (adjustments: AdjustmentValues) => dispatch({ type: 'apply', adjustments }),
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    reset: () => dispatch({ type: 'reset' }),
  };
}
