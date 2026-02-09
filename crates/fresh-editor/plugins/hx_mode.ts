/// <reference path="./lib/fresh.d.ts" />
const editor = getEditor();

/**
 * Helix Mode Plugin for Fresh Editor
 *
 * Implements Helix-style selection-based modal editing:
 * - Selection-first approach: you always see what you're operating on
 * - No visual mode: selections are always active and visible
 * - No operator-pending mode: commands work directly on selections
 * - Multiple cursors supported through native Fresh mechanisms
 *
 * Key differences from Vi mode:
 * - w/b/e extend selection by word (not just move cursor)
 * - x selects the entire line
 * - No need for visual mode - selections are always visible
 * - Goto mode (g) for navigation: gg (top), ge (end), gl (line end)
 * - View mode (z) for scrolling: zc (center), zt (top), zb (bottom)
 * - Space mode for file operations
 */

// Helix mode state
type HxMode = "normal" | "insert" | "goto" | "select" | "view" | "match" | "window" | "space" | "file-explorer";
type GotoSubmode = "none" | "char" | "line";
type SelectSubmode = "none";
type ViewSubmode = "none";
type MatchSubmode = "none";

interface HxState {
  mode: HxMode;
  submode: GotoSubmode | SelectSubmode | ViewSubmode | MatchSubmode;
  lastYankWasLinewise: boolean;
  count: number | null;
  register: string | null;
}

const state: HxState = {
  mode: "normal",
  submode: "none",
  lastYankWasLinewise: false,
  count: null,
  register: null,
};

// Track if plugin is enabled
let hxModeEnabled = false;

// Mode indicator for status bar
function getModeIndicator(mode: HxMode): string {
  const countPrefix = state.count !== null ? `${state.count} ` : "";
  
  if (state.submode !== "none") {
    return `-- ${mode.toUpperCase()} ${state.submode.toUpperCase()} --${countPrefix ? ` (${state.count})` : ""}`;
  }
  
  switch (mode) {
    case "normal":
      return `-- NORMAL --${countPrefix ? ` (${state.count})` : ""}`;
    case "insert":
      return `-- INSERT --`;
    case "goto":
      return `-- GOTO --`;
    case "select":
      return `-- SEL --`;
    case "view":
      return `-- VIEW --`;
    case "match":
      return `-- MATCH --`;
    case "window":
      return `-- WINDOW --`;
    case "space":
      return `-- SPACE --`;
    case "file-explorer":
      return `-- EXPLORER --`;
    default:
      return "";
  }
}

// Switch between modes
function switchMode(newMode: HxMode): void {
  const oldMode = state.mode;
  state.mode = newMode;
  
  // Clear submode when switching main modes (unless entering a mode with submodes)
  if (newMode !== "goto" && newMode !== "select" && newMode !== "view" && newMode !== "match") {
    state.submode = "none";
  }
  
  // Clear count when leaving modes that use counts
  if (newMode !== "goto") {
    state.count = null;
  }
  
  // Set the editor mode for keybinding resolution
  editor.setEditorMode(`hx-${newMode}`);
  editor.setStatus(getModeIndicator(newMode));
}

// Clear selection helper
function clearSelection(): void {
  // Collapse selection to cursor position
  const pos = editor.getCursorPosition();
  editor.executeAction("collapse_selection");
}

// Extend selection to include current char
function extendChar(): void {
  editor.executeAction("select_right");
}

// ============================================================================
// NORMAL MODE - Selection-based navigation and commands
// ============================================================================

// Movement commands that extend selection
globalThis.hx_move_left = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_left");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_left");
  }
};

globalThis.hx_move_right = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_right");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_right");
  }
};

globalThis.hx_move_up = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_up");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_up");
  }
};

globalThis.hx_move_down = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_down");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_down");
  }
};

// Word movement with selection extension
globalThis.hx_word_next = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_word_forward");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_word_forward");
  }
};

globalThis.hx_word_prev = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_word_backward");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_word_backward");
  }
};

// Line-based movement
globalThis.hx_line_start = function(): void {
  editor.executeAction("extend_selection_line_start");
};

globalThis.hx_line_end = function(): void {
  editor.executeAction("extend_selection_line_end");
};

globalThis.hx_select_line = function(): void {
  editor.executeAction("select_line");
  state.lastYankWasLinewise = true;
};

// Document navigation
globalThis.hx_doc_start = function(): void {
  editor.executeAction("extend_selection_to_start");
};

globalThis.hx_doc_end = function(): void {
  editor.executeAction("extend_selection_to_end");
};

globalThis.hx_page_up = function(): void {
  editor.executeAction("extend_selection_page_up");
};

globalThis.hx_page_down = function(): void {
  editor.executeAction("extend_selection_page_down");
};

globalThis.hx_half_page_up = function(): void {
  editor.executeAction("extend_selection_half_page_up");
};

globalThis.hx_half_page_down = function(): void {
  editor.executeAction("extend_selection_half_page_down");
};

// ============================================================================
// GOTO MODE - g-prefixed navigation commands
// ============================================================================

globalThis.hx_goto_mode = function(): void {
  switchMode("goto");
};

globalThis.hx_goto_top = function(): void {
  editor.executeAction("goto_start");
  clearSelection();
  switchMode("normal");
};

globalThis.hx_goto_bottom = function(): void {
  editor.executeAction("goto_end");
  clearSelection();
  switchMode("normal");
};

globalThis.hx_goto_line_start = function(): void {
  editor.executeAction("goto_line_start");
  clearSelection();
  switchMode("normal");
};

globalThis.hx_goto_line_end = function(): void {
  editor.executeAction("goto_line_end");
  clearSelection();
  switchMode("normal");
};

globalThis.hx_goto_line_nonblank = function(): void {
  editor.executeAction("goto_line_start_nonblank");
  clearSelection();
  switchMode("normal");
};

globalThis.hx_goto_first_nonblank = function(): void {
  editor.executeAction("goto_first_nonblank");
  clearSelection();
  switchMode("normal");
};

globalThis.hx_goto_last_nonblank = function(): void {
  editor.executeAction("goto_last_nonblank");
  clearSelection();
  switchMode("normal");
};

globalThis.hx_goto_line_number = function(): void {
  editor.showPrompt("Goto line:", "goto_line");
  switchMode("normal");
};

globalThis.hx_goto_next_buffer = function(): void {
  editor.executeAction("next_buffer");
  switchMode("normal");
};

globalThis.hx_goto_prev_buffer = function(): void {
  editor.executeAction("prev_buffer");
  switchMode("normal");
};

// ============================================================================
// MATCH MODE - m-prefixed matching commands
// ============================================================================

globalThis.hx_match_mode = function(): void {
  switchMode("match");
};

globalThis.hx_match_brackets = function(): void {
  editor.executeAction("extend_selection_to_matching_bracket");
  switchMode("normal");
};

// ============================================================================
// SELECT MODE - v-entered selection extension mode (like Helix)
// ============================================================================

globalThis.hx_select_mode = function(): void {
  switchMode("select");
};

// In select mode, movements extend the selection (same as normal mode behavior)
// but we stay in select mode until Escape is pressed

globalThis.hx_select_move_left = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_left");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_left");
  }
  // Stay in select mode
  editor.setStatus(getModeIndicator("select"));
};

globalThis.hx_select_move_right = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_right");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_right");
  }
  editor.setStatus(getModeIndicator("select"));
};

globalThis.hx_select_move_up = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_up");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_up");
  }
  editor.setStatus(getModeIndicator("select"));
};

globalThis.hx_select_move_down = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_down");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_down");
  }
  editor.setStatus(getModeIndicator("select"));
};

globalThis.hx_select_word_next = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_word_forward");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_word_forward");
  }
  editor.setStatus(getModeIndicator("select"));
};

globalThis.hx_select_word_prev = function(): void {
  if (state.count !== null) {
    for (let i = 0; i < state.count; i++) {
      editor.executeAction("extend_selection_word_backward");
    }
    state.count = null;
  } else {
    editor.executeAction("extend_selection_word_backward");
  }
  editor.setStatus(getModeIndicator("select"));
};

globalThis.hx_select_line = function(): void {
  editor.executeAction("extend_selection_to_line_bounds");
  state.lastYankWasLinewise = true;
  editor.setStatus(getModeIndicator("select"));
};

globalThis.hx_select_line_start = function(): void {
  editor.executeAction("extend_selection_line_start");
  editor.setStatus(getModeIndicator("select"));
};

globalThis.hx_select_line_end = function(): void {
  editor.executeAction("extend_selection_line_end");
  editor.setStatus(getModeIndicator("select"));
};

globalThis.hx_select_doc_start = function(): void {
  editor.executeAction("extend_selection_to_start");
  editor.setStatus(getModeIndicator("select"));
};

globalThis.hx_select_doc_end = function(): void {
  editor.executeAction("extend_selection_to_end");
  editor.setStatus(getModeIndicator("select"));
};

// ============================================================================
// VIEW MODE - z-prefixed scrolling commands
// ============================================================================

globalThis.hx_view_mode = function(): void {
  switchMode("view");
};

globalThis.hx_view_center = function(): void {
  editor.executeAction("center_cursor");
  switchMode("normal");
};

globalThis.hx_view_top = function(): void {
  editor.executeAction("cursor_to_top");
  switchMode("normal");
};

globalThis.hx_view_bottom = function(): void {
  editor.executeAction("cursor_to_bottom");
  switchMode("normal");
};

// ============================================================================
// WINDOW MODE - Ctrl-w window management
// ============================================================================

globalThis.hx_window_mode = function(): void {
  switchMode("window");
};

globalThis.hx_window_next = function(): void {
  editor.executeAction("next_split");
  switchMode("normal");
};

globalThis.hx_window_prev = function(): void {
  editor.executeAction("prev_split");
  switchMode("normal");
};

globalThis.hx_window_split_right = function(): void {
  editor.executeAction("split_right");
  switchMode("normal");
};

globalThis.hx_window_split_down = function(): void {
  editor.executeAction("split_down");
  switchMode("normal");
};

globalThis.hx_window_close = function(): void {
  editor.executeAction("close_split");
  switchMode("normal");
};

globalThis.hx_window_only = function(): void {
  editor.executeAction("close_other_splits");
  switchMode("normal");
};

// ============================================================================
// SPACE MODE - Space-prefixed file/workspace commands
// ============================================================================

globalThis.hx_space_mode = function(): void {
  switchMode("space");
};

globalThis.hx_space_save = function(): void {
  editor.executeAction("save");
  switchMode("normal");
};

globalThis.hx_space_save_all = function(): void {
  editor.executeAction("save_all");
  switchMode("normal");
};

globalThis.hx_space_quit = function(): void {
  editor.executeAction("quit");
  switchMode("normal");
};

globalThis.hx_space_quit_all = function(): void {
  editor.executeAction("quit_all");
  switchMode("normal");
};

globalThis.hx_space_file_explorer = function(): void {
  editor.executeAction("focus_file_explorer");
  switchMode("normal");
};

globalThis.hx_space_command_palette = function(): void {
  editor.executeAction("command_palette");
  switchMode("normal");
};

globalThis.hx_space_search_file = function(): void {
  editor.showPrompt("Search file:", "quick_open");
  switchMode("normal");
};

globalThis.hx_space_global_search = function(): void {
  editor.executeAction("search_in_files");
  switchMode("normal");
};

globalThis.hx_space_buffer_picker = function(): void {
  editor.executeAction("buffer_picker");
  switchMode("normal");
};

globalThis.hx_space_recent_files = function(): void {
  editor.executeAction("recent_files");
  switchMode("normal");
};

// ============================================================================
// EDITING COMMANDS - Operate on current selection
// ============================================================================

globalThis.hx_insert_before = function(): void {
  clearSelection();
  switchMode("insert");
};

globalThis.hx_insert_after = function(): void {
  clearSelection();
  editor.executeAction("move_right");
  switchMode("insert");
};

globalThis.hx_insert_line_start = function(): void {
  editor.executeAction("goto_line_start");
  clearSelection();
  switchMode("insert");
};

globalThis.hx_insert_line_end = function(): void {
  editor.executeAction("goto_line_end");
  clearSelection();
  switchMode("insert");
};

globalThis.hx_open_below = function(): void {
  editor.executeAction("goto_line_end");
  clearSelection();
  editor.executeAction("insert_newline");
  switchMode("insert");
};

globalThis.hx_open_above = function(): void {
  editor.executeAction("goto_line_start");
  clearSelection();
  editor.executeAction("insert_newline_above");
  switchMode("insert");
};

globalThis.hx_newline_below = function(): void {
  editor.executeAction("goto_line_end");
  editor.executeAction("insert_newline");
  // Stay in normal mode
};

globalThis.hx_newline_above = function(): void {
  editor.executeAction("goto_line_start");
  editor.executeAction("insert_newline_above");
  // Stay in normal mode
};

globalThis.hx_delete_selection = function(): void {
  editor.executeAction("delete");
  clearSelection();
};

globalThis.hx_change_selection = function(): void {
  editor.executeAction("delete");
  clearSelection();
  switchMode("insert");
};

globalThis.hx_yank_selection = function(): void {
  editor.executeAction("copy");
  // Keep selection but collapse to end
  clearSelection();
};

globalThis.hx_paste_after = function(): void {
  clearSelection();
  editor.executeAction("move_right");
  editor.executeAction("paste");
};

globalThis.hx_paste_before = function(): void {
  clearSelection();
  editor.executeAction("paste");
};

globalThis.hx_replace_with_char = function(): void {
  // Helix replace - replace selection with typed character
  editor.showPrompt("Replace with:", "replace_char");
};

globalThis.hx_replace_mode = function(): void {
  // Replace mode - overwrite characters
  editor.setOverwriteMode(true);
  switchMode("insert");
};

globalThis.hx_delete_char = function(): void {
  // Delete character under cursor (extend by 1 char first if collapsed)
  editor.executeAction("select_right");
  editor.executeAction("delete");
};

globalThis.hx_delete_word = function(): void {
  editor.executeAction("extend_selection_word_forward");
  editor.executeAction("delete");
  clearSelection();
};

globalThis.hx_change_word = function(): void {
  editor.executeAction("extend_selection_word_forward");
  editor.executeAction("delete");
  clearSelection();
  switchMode("insert");
};

globalThis.hx_delete_to_line_end = function(): void {
  editor.executeAction("extend_selection_to_line_end");
  editor.executeAction("delete");
  clearSelection();
};

globalThis.hx_change_to_line_end = function(): void {
  editor.executeAction("extend_selection_to_line_end");
  editor.executeAction("delete");
  clearSelection();
  switchMode("insert");
};

globalThis.hx_delete_line = function(): void {
  editor.executeAction("select_line");
  editor.executeAction("delete");
  state.lastYankWasLinewise = true;
};

globalThis.hx_change_line = function(): void {
  editor.executeAction("select_line");
  editor.executeAction("delete");
  switchMode("insert");
};

globalThis.hx_yank_line = function(): void {
  editor.executeAction("select_line");
  editor.executeAction("copy");
  clearSelection();
  state.lastYankWasLinewise = true;
};

globalThis.hx_join_lines = function(): void {
  editor.executeAction("join_lines");
};

globalThis.hx_indent = function(): void {
  editor.executeAction("indent");
};

globalThis.hx_unindent = function(): void {
  editor.executeAction("unindent");
};

globalThis.hx_switch_case = function(): void {
  editor.executeAction("switch_case");
};

globalThis.hx_lowercase = function(): void {
  editor.executeAction("make_lowercase");
};

globalThis.hx_uppercase = function(): void {
  editor.executeAction("make_uppercase");
};

// ============================================================================
// UNDO/REDO
// ============================================================================

globalThis.hx_undo = function(): void {
  editor.executeAction("undo");
};

globalThis.hx_redo = function(): void {
  editor.executeAction("redo");
};

globalThis.hx_repeat_last_insert = function(): void {
  editor.executeAction("repeat_last_insert");
};

// ============================================================================
// SEARCH
// ============================================================================

globalThis.hx_search_forward = function(): void {
  editor.showPrompt("Search:", "search_forward");
};

globalThis.hx_search_backward = function(): void {
  editor.showPrompt("Search:", "search_backward");
};

globalThis.hx_find_next = function(): void {
  editor.executeAction("find_next");
};

globalThis.hx_find_prev = function(): void {
  editor.executeAction("find_prev");
};

globalThis.hx_search_selection = function(): void {
  editor.executeAction("search_selection_forward");
};

globalThis.hx_search_selection_backward = function(): void {
  editor.executeAction("search_selection_backward");
};

// ============================================================================
// SELECTION MANIPULATION
// ============================================================================

globalThis.hx_flip_selection = function(): void {
  editor.executeAction("flip_selection");
};

globalThis.hx_select_all = function(): void {
  editor.executeAction("select_all");
};

globalThis.hx_collapse_selection = function(): void {
  clearSelection();
};

globalThis.hx_extend_line_below = function(): void {
  editor.executeAction("extend_selection_line_down");
};

globalThis.hx_extend_to_line_bounds = function(): void {
  editor.executeAction("extend_selection_to_line_bounds");
};

globalThis.hx_split_selection = function(): void {
  editor.executeAction("split_selection_on_newline");
};

globalThis.hx_add_cursor_above = function(): void {
  editor.executeAction("add_cursor_above");
};

globalThis.hx_add_cursor_below = function(): void {
  editor.executeAction("add_cursor_below");
};

// ============================================================================
// DIGIT HANDLING FOR COUNTS
// ============================================================================

function hxDigit(digit: number): void {
  if (state.count === null) {
    state.count = digit;
  } else {
    state.count = state.count * 10 + digit;
  }
  editor.setStatus(getModeIndicator(state.mode));
}

globalThis.hx_digit_0 = function(): void { hxDigit(0); };
globalThis.hx_digit_1 = function(): void { hxDigit(1); };
globalThis.hx_digit_2 = function(): void { hxDigit(2); };
globalThis.hx_digit_3 = function(): void { hxDigit(3); };
globalThis.hx_digit_4 = function(): void { hxDigit(4); };
globalThis.hx_digit_5 = function(): void { hxDigit(5); };
globalThis.hx_digit_6 = function(): void { hxDigit(6); };
globalThis.hx_digit_7 = function(): void { hxDigit(7); };
globalThis.hx_digit_8 = function(): void { hxDigit(8); };
globalThis.hx_digit_9 = function(): void { hxDigit(9); };

// ============================================================================
// COMMAND MODE
// ============================================================================

globalThis.hx_command_mode = function(): void {
  editor.showPrompt(":", "command");
};

// ============================================================================
// ESCAPE / RETURN TO NORMAL MODE
// ============================================================================

globalThis.hx_escape = function(): void {
  if (state.mode === "insert") {
    // When escaping from insert mode, collapse selection and move left
    const pos = editor.getCursorPosition();
    if (pos > 0) {
      editor.executeAction("move_left");
    }
    clearSelection();
    switchMode("normal");
  } else if (state.mode !== "normal") {
    // Return to normal mode from any other mode
    switchMode("normal");
  } else {
    // Already in normal mode - clear selection
    clearSelection();
  }
};

// ============================================================================
// FILE EXPLORER NAVIGATION
// ============================================================================

globalThis.hx_file_explorer_up = function(): void {
  editor.executeAction("file_explorer_up");
};

globalThis.hx_file_explorer_down = function(): void {
  editor.executeAction("file_explorer_down");
};

globalThis.hx_file_explorer_left = function(): void {
  // Collapse directory or move to parent
  editor.executeAction("file_explorer_collapse");
};

globalThis.hx_file_explorer_right = function(): void {
  // Expand directory or open file
  editor.executeAction("file_explorer_expand");
};

globalThis.hx_file_explorer_toggle = function(): void {
  editor.executeAction("file_explorer_toggle");
};

globalThis.hx_file_explorer_open = function(): void {
  editor.executeAction("file_explorer_open");
};

globalThis.hx_file_explorer_page_up = function(): void {
  editor.executeAction("file_explorer_page_up");
};

globalThis.hx_file_explorer_page_down = function(): void {
  editor.executeAction("file_explorer_page_down");
};

globalThis.hx_toggle_file_explorer_mode = function(): void {
  // Toggle between normal mode and file explorer mode
  if (state.mode === "normal") {
    switchMode("file-explorer");
  } else {
    switchMode("normal");
  }
};

globalThis.hx_exit_file_explorer_mode = function(): void {
  // Exit file explorer mode and return to normal mode, then focus editor
  switchMode("normal");
  editor.executeAction("focus_editor");
};

// ============================================================================
// TOGGLE HELIX MODE
// ============================================================================

globalThis.hx_mode_toggle = function(): void {
  hxModeEnabled = !hxModeEnabled;
  if (hxModeEnabled) {
    switchMode("normal");
    editor.setStatus(editor.t("status.enabled"));
  } else {
    editor.setEditorMode(null);
    state.mode = "normal";
    editor.setStatus(editor.t("status.disabled"));
  }
};

// Register the toggle command
editor.registerCommand(
  "%cmd.toggle_hx_mode",
  "%cmd.toggle_hx_mode_desc",
  "hx_mode_toggle",
  null,
);

// Register file explorer mode toggle command
editor.registerCommand(
  "%cmd.toggle_hx_file_explorer_mode",
  "%cmd.toggle_hx_file_explorer_mode_desc",
  "hx_toggle_file_explorer_mode",
  null,
);

// ============================================================================
// MODE DEFINITIONS
// ============================================================================

// Normal mode - selection-based navigation
editor.defineMode("hx-normal", null, [
  // Count prefix
  ["1", "hx_digit_1"],
  ["2", "hx_digit_2"],
  ["3", "hx_digit_3"],
  ["4", "hx_digit_4"],
  ["5", "hx_digit_5"],
  ["6", "hx_digit_6"],
  ["7", "hx_digit_7"],
  ["8", "hx_digit_8"],
  ["9", "hx_digit_9"],
  ["0", "hx_digit_0"],
  
  // Navigation (extend selection)
  ["h", "hx_move_left"],
  ["j", "hx_move_down"],
  ["k", "hx_move_up"],
  ["l", "hx_move_right"],
  ["w", "hx_word_next"],
  ["b", "hx_word_prev"],
  ["e", "hx_word_end"],
  ["W", "hx_word_next"],  // TODO: WORD vs word
  ["B", "hx_word_prev"],  // TODO: WORD vs word
  ["E", "hx_word_end"],   // TODO: WORD vs word
  ["x", "hx_select_line"],
  ["X", "hx_extend_line_below"],
  
  // Line movement
  ["^", "hx_line_start"],
  ["$", "hx_line_end"],
  ["G", "hx_doc_end"],
  ["C-f", "hx_page_down"],
  ["C-b", "hx_page_up"],
  ["C-d", "hx_half_page_down"],
  ["C-u", "hx_half_page_up"],
  
  // Mode switching
  ["i", "hx_insert_before"],
  ["a", "hx_insert_after"],
  ["I", "hx_insert_line_start"],
  ["A", "hx_insert_line_end"],
  ["o", "hx_open_below"],
  ["O", "hx_open_above"],
  
  // Editing commands
  ["d", "hx_delete_selection"],
  ["c", "hx_change_selection"],
  ["y", "hx_yank_selection"],
  ["p", "hx_paste_after"],
  ["P", "hx_paste_before"],
  ["r", "hx_replace_with_char"],
  ["R", "hx_replace_mode"],
  
  // Line operations
  ["D", "hx_delete_to_line_end"],
  ["C", "hx_change_to_line_end"],
  ["dd", "hx_delete_line"],
  ["cc", "hx_change_line"],
  ["yy", "hx_yank_line"],
  
  // Misc
  ["J", "hx_join_lines"],
  [">", "hx_indent"],
  ["<", "hx_unindent"],
  ["~", "hx_switch_case"],
  ["`", "hx_lowercase"],
  
  // Undo/redo
  ["u", "hx_undo"],
  ["U", "hx_redo"],
  [".", "hx_repeat_last_insert"],
  
  // Search
  ["/", "hx_search_forward"],
  ["?", "hx_search_backward"],
  ["n", "hx_find_next"],
  ["N", "hx_find_prev"],
  ["*", "hx_search_selection"],
  ["#", "hx_search_selection_backward"],
  
  // Selection manipulation
  [";", "hx_collapse_selection"],
  ["%", "hx_select_all"],
  ["s", "hx_split_selection"],
  ["C", "hx_flip_selection"],
  ["v", "hx_select_mode"],
  
  // Multi-cursor
  ["C-c", "hx_add_cursor_below"],
  ["A-p", "hx_add_cursor_above"],  // Changed from C-p to A-p
  
  // Submodes
  ["g", "hx_goto_mode"],
  ["m", "hx_match_mode"],
  ["z", "hx_view_mode"],
  ["e", "hx_toggle_file_explorer_mode"],
  ["Space", "hx_space_mode"],
  ["C-w", "hx_window_mode"],
  
  // Command mode
  [":", "hx_command_mode"],
  
  // Command palette - available in all modes
  ["C-p", "command_palette"],
  
  // Escape
  ["Escape", "hx_escape"],
  
  // Pass through to standard shortcuts
  ["C-q", "quit"],
], true); // read_only = true

// Insert mode
editor.defineMode("hx-insert", null, [
  ["Escape", "hx_escape"],
  // Pass through for all other keys (normal typing)
], false); // read_only = false

// Goto mode
editor.defineMode("hx-goto", "hx-normal", [
  ["g", "hx_goto_top"],
  ["e", "hx_goto_bottom"],
  ["h", "hx_goto_line_start"],
  ["l", "hx_goto_line_end"],
  ["s", "hx_goto_first_nonblank"],
  ["n", "hx_goto_next_buffer"],
  ["p", "hx_goto_prev_buffer"],
  [".", "hx_goto_last_nonblank"],
  
  // Line number goto
  ["g g", "hx_goto_top"],  // Already defined above but explicit
  
  // Pass escape to return to normal
  ["Escape", "hx_escape"],
  
  // Command palette
  ["C-p", "command_palette"],
], true);

// Match mode
editor.defineMode("hx-match", "hx-normal", [
  ["m", "hx_match_brackets"],
  ["s", "hx_match_brackets"],  // Alternative binding
  
  ["Escape", "hx_escape"],
  
  // Command palette
  ["C-p", "command_palette"],
], true);

// Select mode (v-entered) - movements extend selection
editor.defineMode("hx-select", "hx-normal", [
  // Count prefix
  ["1", "hx_digit_1"],
  ["2", "hx_digit_2"],
  ["3", "hx_digit_3"],
  ["4", "hx_digit_4"],
  ["5", "hx_digit_5"],
  ["6", "hx_digit_6"],
  ["7", "hx_digit_7"],
  ["8", "hx_digit_8"],
  ["9", "hx_digit_9"],
  ["0", "hx_digit_0"],
  
  // Navigation (extend selection and stay in select mode)
  ["h", "hx_select_move_left"],
  ["j", "hx_select_move_down"],
  ["k", "hx_select_move_up"],
  ["l", "hx_select_move_right"],
  ["w", "hx_select_word_next"],
  ["b", "hx_select_word_prev"],
  ["e", "hx_word_end"],
  ["x", "hx_select_line"],
  
  // Line movement
  ["^", "hx_select_line_start"],
  ["$", "hx_select_line_end"],
  ["G", "hx_select_doc_end"],
  
  // Mode switching
  ["i", "hx_insert_before"],
  ["a", "hx_insert_after"],
  ["I", "hx_insert_line_start"],
  ["A", "hx_insert_line_end"],
  ["o", "hx_open_below"],
  ["O", "hx_open_above"],
  
  // Editing commands
  ["d", "hx_delete_selection"],
  ["c", "hx_change_selection"],
  ["y", "hx_yank_selection"],
  ["p", "hx_paste_after"],
  ["P", "hx_paste_before"],
  ["r", "hx_replace_with_char"],
  
  // Undo/redo
  ["u", "hx_undo"],
  ["U", "hx_redo"],
  
  // Exit select mode
  ["Escape", "hx_escape"],
  ["v", "hx_escape"],  // v again exits select mode
  
  // Command palette
  ["C-p", "command_palette"],
], true);

// View mode (z-entered) - scrolling commands
editor.defineMode("hx-view", "hx-normal", [
  ["c", "hx_view_center"],
  ["t", "hx_view_top"],
  ["b", "hx_view_bottom"],
  ["z", "hx_view_center"],  // Alternative binding
  ["j", "hx_half_page_down"],
  ["k", "hx_half_page_up"],
  ["d", "hx_half_page_down"],
  ["u", "hx_half_page_up"],
  
  ["Escape", "hx_escape"],
  
  // Command palette
  ["C-p", "command_palette"],
], true);

// Window mode
editor.defineMode("hx-window", "hx-normal", [
  ["w", "hx_window_next"],
  ["W", "hx_window_prev"],
  ["v", "hx_window_split_right"],
  ["s", "hx_window_split_down"],
  ["q", "hx_window_close"],
  ["o", "hx_window_only"],
  ["c", "hx_window_close"],  // Alternative
  
  ["Escape", "hx_escape"],
  
  // Command palette
  ["C-p", "command_palette"],
], true);

// Space mode
editor.defineMode("hx-space", "hx-normal", [
  ["w", "hx_space_save"],
  ["W", "hx_space_save_all"],
  ["q", "hx_space_quit"],
  ["Q", "hx_space_quit_all"],
  ["e", "hx_space_file_explorer"],
  ["f", "hx_space_search_file"],
  ["/", "hx_space_global_search"],
  ["b", "hx_space_buffer_picker"],
  ["r", "hx_space_recent_files"],
  ["Space", "hx_space_command_palette"],
  
  ["Escape", "hx_escape"],
  
  // Command palette
  ["C-p", "command_palette"],
], true);

// File Explorer mode - navigation when file explorer is focused
editor.defineMode("hx-file-explorer", null, [
  // Navigation with hjkl
  ["h", "hx_file_explorer_left"],
  ["j", "hx_file_explorer_down"],
  ["k", "hx_file_explorer_up"],
  ["l", "hx_file_explorer_right"],
  
  // Arrow keys
  ["Left", "hx_file_explorer_left"],
  ["Down", "hx_file_explorer_down"],
  ["Up", "hx_file_explorer_up"],
  ["Right", "hx_file_explorer_right"],
  
  // Page navigation
  ["C-f", "hx_file_explorer_page_down"],
  ["C-b", "hx_file_explorer_page_up"],
  ["C-d", "hx_file_explorer_page_down"],
  ["C-u", "hx_file_explorer_page_up"],
  ["PageDown", "hx_file_explorer_page_down"],
  ["PageUp", "hx_file_explorer_page_up"],
  
  // Actions
  ["Enter", "hx_file_explorer_open"],
  ["Space", "hx_file_explorer_toggle"],
  ["e", "hx_exit_file_explorer_mode"],  // 'e' exits explorer mode like it enters
  ["Escape", "hx_exit_file_explorer_mode"],
  
  // Command palette
  ["C-p", "command_palette"],
], true);

// ============================================================================
// PLUGIN INITIALIZATION
// ============================================================================

// Plugin is loaded but not automatically enabled
// User must toggle it on via command palette
