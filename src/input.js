// Keyboard plus a drag-anywhere virtual joystick. Both feed the same two axes:
// throttle (+1 ahead, -1 astern) and steer (+1 to starboard, -1 to port).
// A second finger (or the right mouse button) looks around instead: its drag
// is reported as lookX / lookY, in pixels since the last update.

const KEY_AXES = {
  KeyW: ['throttle', 1],
  ArrowUp: ['throttle', 1],
  KeyS: ['throttle', -1],
  ArrowDown: ['throttle', -1],
  KeyD: ['steer', 1],
  ArrowRight: ['steer', 1],
  KeyA: ['steer', -1],
  ArrowLeft: ['steer', -1],
};

const JOYSTICK_RADIUS = 56;

const clamp = (value) => Math.max(-1, Math.min(1, value));

export function createInput(surface, joystickElement) {
  const pressed = new Set();
  const drag = { id: null, originX: 0, originY: 0, throttle: 0, steer: 0 };
  const knob = joystickElement.querySelector('.knob');
  const look = { id: null, lastX: 0, lastY: 0, dx: 0, dy: 0 };
  const input = { throttle: 0, steer: 0, lookX: 0, lookY: 0, looking: false, used: false };

  window.addEventListener('keydown', (event) => {
    if (!(event.code in KEY_AXES)) return;
    event.preventDefault();
    pressed.add(event.code);
    input.used = true;
  });
  window.addEventListener('keyup', (event) => pressed.delete(event.code));
  window.addEventListener('blur', () => pressed.clear());

  surface.addEventListener('contextmenu', (event) => event.preventDefault());

  surface.addEventListener('pointerdown', (event) => {
    if (event.button === 2 || drag.id !== null) {
      if (look.id !== null) return;
      look.id = event.pointerId;
      look.lastX = event.clientX;
      look.lastY = event.clientY;
      surface.setPointerCapture(event.pointerId);
      return;
    }
    drag.id = event.pointerId;
    drag.originX = event.clientX;
    drag.originY = event.clientY;
    surface.setPointerCapture(event.pointerId);
    joystickElement.style.left = `${event.clientX}px`;
    joystickElement.style.top = `${event.clientY}px`;
    joystickElement.classList.add('active');
    input.used = true;
  });

  surface.addEventListener('pointermove', (event) => {
    if (event.pointerId === look.id) {
      look.dx += event.clientX - look.lastX;
      look.dy += event.clientY - look.lastY;
      look.lastX = event.clientX;
      look.lastY = event.clientY;
      return;
    }
    if (event.pointerId !== drag.id) return;
    drag.steer = clamp((event.clientX - drag.originX) / JOYSTICK_RADIUS);
    drag.throttle = clamp((drag.originY - event.clientY) / JOYSTICK_RADIUS);
    knob.style.transform = `translate(${drag.steer * JOYSTICK_RADIUS}px, ${-drag.throttle * JOYSTICK_RADIUS}px)`;
  });

  const release = (event) => {
    if (event.pointerId === look.id) look.id = null;
    if (event.pointerId !== drag.id) return;
    drag.id = null;
    drag.throttle = 0;
    drag.steer = 0;
    knob.style.transform = '';
    joystickElement.classList.remove('active');
  };
  surface.addEventListener('pointerup', release);
  surface.addEventListener('pointercancel', release);

  function update() {
    let throttle = drag.throttle;
    let steer = drag.steer;
    for (const code of pressed) {
      const [axis, value] = KEY_AXES[code];
      if (axis === 'throttle') throttle += value;
      else steer += value;
    }
    input.throttle = clamp(throttle);
    input.steer = clamp(steer);
    input.lookX = look.dx;
    input.lookY = look.dy;
    input.looking = look.id !== null;
    look.dx = 0;
    look.dy = 0;
    return input;
  }

  return { update };
}
