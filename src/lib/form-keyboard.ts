/** Keyboard affects content bounds, never the captured artwork dimensions. */
export function formKeyboardBounds(frameHeight: number, visibleHeight: number, offsetTop = 0, scale = 1) {
  const keyboard = scale <= 1.05 && frameHeight - visibleHeight > 100;
  return { keyboard, top: keyboard ? Math.max(0, offsetTop) : 0, bottom: keyboard ? Math.max(0, frameHeight - visibleHeight - offsetTop) : 0 };
}