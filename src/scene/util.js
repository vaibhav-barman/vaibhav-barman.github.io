/** Deterministic PRNG so the scene looks the same on every load. */
export function rng(seed = 1) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let x = s
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** Frame-rate independent exponential smoothing factor. */
export const damp = (rate, dt) => 1 - Math.exp(-rate * dt)

/**
 * GLSL shared by the node and link shaders: gentle drift plus a push away
 * from the mouse, computed in screen space so the cursor affects whatever
 * is under it regardless of depth. Both shaders use the same function, so
 * links stay attached to their nodes.
 */
export const DISPLACE_GLSL = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;      // mouse in NDC (-1..1)
uniform float uMouseOn;   // 0..1, fades in when the mouse moves
uniform float uAspect;
uniform float uRadius;    // NDC radius of influence
uniform float uPush;

vec4 displaced(vec3 p, float seed, out float glow) {
  p += vec3(
    sin(uTime * 0.31 + seed * 6.283),
    cos(uTime * 0.27 + seed * 11.0),
    sin(uTime * 0.23 + seed * 3.7)
  ) * 0.16;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 diff = (ndc - uMouse) * vec2(uAspect, 1.0);
  float f = exp(-dot(diff, diff) / (uRadius * uRadius)) * uMouseOn;
  glow = f;
  mv.xy += normalize(diff + 1e-5) * f * uPush * (-mv.z) * 0.12;
  return mv;
}
`
