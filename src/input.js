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

const TAP = { pixels: 10, milliseconds: 450 };
const STICK_LOOK_SPEED = 320; // a full push on the look stick, in drag pixels per second

// A fixed on-screen stick: reports where its knob is, from -1 to 1 on each axis.
function createStick(element, onPress) {
  const knob = element.querySelector('.knob');
  const state = { x: 0, y: 0, held: false };
  let pointer = null;

  const move = (event) => {
    const box = element.getBoundingClientRect();
    const reach = box.width / 2 - knob.offsetWidth / 4;
    let dx = (event.clientX - (box.left + box.width / 2)) / reach;
    let dy = (event.clientY - (box.top + box.height / 2)) / reach;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    state.x = dx;
    state.y = dy;
    knob.style.transform = `translate(${dx * reach}px, ${dy * reach}px)`;
  };
  const release = (event) => {
    if (event.pointerId !== pointer) return;
    pointer = null;
    state.x = 0;
    state.y = 0;
    state.held = false;
    knob.style.transform = '';
    element.classList.remove('held');
  };

  element.addEventListener('pointerdown', (event) => {
    if (pointer !== null) return;
    pointer = event.pointerId;
    element.setPointerCapture(event.pointerId);
    state.held = true;
    element.classList.add('held');
    onPress();
    move(event);
  });
  element.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointer) move(event);
  });
  element.addEventListener('pointerup', release);
  element.addEventListener('pointercancel', release);
  return state;
}

export function createInput(surface, joystickElement, { moveStick, lookStick, onTap } = {}) {
  const pressed = new Set();
  const drag = { id: null, originX: 0, originY: 0, throttle: 0, steer: 0 };
  const knob = joystickElement.querySelector('.knob');
  const look = { id: null, lastX: 0, lastY: 0, dx: 0, dy: 0 };
  const input = { throttle: 0, steer: 0, lookX: 0, lookY: 0, looking: false, lookStarted: false, used: false };
  let lookOnly = false; // while set, every drag looks around and none steers
  let lookStarted = false;

  window.addEventListener('keydown', (event) => {
    if (!(event.code in KEY_AXES)) return;
    event.preventDefault();
    pressed.add(event.code);
    input.used = true;
  });
  window.addEventListener('keyup', (event) => pressed.delete(event.code));
  window.addEventListener('blur', () => pressed.clear());

  surface.addEventListener('contextmenu', (event) => event.preventDefault());

  // A quick press that does not travel is a tap, whatever else it started.
  const presses = new Map();

  surface.addEventListener('pointerdown', (event) => {
    // Event timestamps say when the finger moved, even if a slow frame delayed the handler.
    presses.set(event.pointerId, { x: event.clientX, y: event.clientY, at: event.timeStamp });
    if (event.button === 2 || drag.id !== null || lookOnly) {
      if (look.id !== null) return;
      lookStarted = true;
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
    const press = presses.get(event.pointerId);
    presses.delete(event.pointerId);
    if (
      press &&
      event.type === 'pointerup' &&
      event.timeStamp - press.at < TAP.milliseconds &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) < TAP.pixels
    ) {
      onTap?.(event.clientX, event.clientY);
    }
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

  // The two fixed sticks of the touch layout: the left one sails, the right
  // one turns the camera for as long as it is held over.
  const sail = createStick(moveStick, () => {
    input.used = true;
  });
  const gaze = createStick(lookStick, () => {
    input.used = true;
    lookStarted = true;
  });

  function update(dt = 0) {
    let throttle = drag.throttle - sail.y;
    let steer = drag.steer + sail.x;
    for (const code of pressed) {
      const [axis, value] = KEY_AXES[code];
      if (axis === 'throttle') throttle += value;
      else steer += value;
    }
    input.throttle = clamp(throttle);
    input.steer = clamp(steer);
    // Pushing the look stick right turns the view right, and up raises it.
    input.lookX = look.dx - gaze.x * STICK_LOOK_SPEED * dt;
    input.lookY = look.dy - gaze.y * STICK_LOOK_SPEED * dt;
    input.looking = look.id !== null || gaze.held;
    input.lookStarted = lookStarted;
    lookStarted = false;
    look.dx = 0;
    look.dy = 0;
    return input;
  }

  // Hands every drag to the camera, letting go of the joystick if it is held.
  function setLookOnly(value) {
    if (value === lookOnly) return;
    lookOnly = value;
    if (!value || drag.id === null) return;
    drag.id = null;
    drag.throttle = 0;
    drag.steer = 0;
    knob.style.transform = '';
    joystickElement.classList.remove('active');
  }

  return { update, setLookOnly };
}
