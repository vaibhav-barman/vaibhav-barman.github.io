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

/** Max number of text rectangles the network fades behind (see MASK_GLSL). */
export const MAX_MASKS = 6

/**
 * Vertex-shader GLSL shared by the node and link shaders:
 *  - displaced(): gentle drift plus a push away from the mouse, computed in
 *    screen space so the cursor affects whatever is under it regardless of
 *    depth. Both shaders use it, so links stay attached to their nodes.
 *  - burstGlow(): a ring of light that ripples out from the terminal each
 *    time a command runs.
 */
export const DISPLACE_GLSL = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;      // mouse in NDC (-1..1)
uniform float uMouseOn;   // 0..1, fades in when the mouse moves
uniform float uAspect;
uniform float uRadius;    // NDC radius of influence
uniform float uPush;
uniform float uBurst;     // seconds since the last terminal command (< 0: none)
uniform vec2 uBurstOrigin;

vec4 displaced(vec3 p, float seed, out float glow, out vec2 ndc) {
  p += vec3(
    sin(uTime * 0.31 + seed * 6.283),
    cos(uTime * 0.27 + seed * 11.0),
    sin(uTime * 0.23 + seed * 3.7)
  ) * 0.16;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;
  ndc = clip.xy / clip.w;
  vec2 diff = (ndc - uMouse) * vec2(uAspect, 1.0);
  float f = exp(-dot(diff, diff) / (uRadius * uRadius)) * uMouseOn;
  glow = f;
  mv.xy += normalize(diff + 1e-5) * f * uPush * (-mv.z) * 0.12;
  return mv;
}

float burstGlow(vec2 ndc) {
  if (uBurst < 0.0) return 0.0;
  float d = length((ndc - uBurstOrigin) * vec2(uAspect, 1.0));
  float front = uBurst * 1.6;
  float x = (d - front) / 0.18; // pow() is undefined for negative bases in GLSL
  return exp(-x * x) * exp(-uBurst * 1.0);
}
`

/**
 * Fragment-shader GLSL: dims the network behind page text (rectangles in
 * NDC, updated from the DOM every frame) so copy stays readable. Per pixel,
 * so a long link that crosses a heading is dimmed where it crosses.
 */
export const MASK_GLSL = /* glsl */ `
uniform vec4 uMask[${MAX_MASKS}]; // (minX, minY, maxX, maxY) in NDC
uniform int uMaskCount;
uniform vec2 uResolution;         // drawing-buffer size in px

float textMask() {
  vec2 ndc = gl_FragCoord.xy / uResolution * 2.0 - 1.0;
  float m = 1.0;
  for (int i = 0; i < ${MAX_MASKS}; i++) {
    if (i >= uMaskCount) break;
    vec4 r = uMask[i];
    vec2 d = max(r.xy - ndc, ndc - r.zw); // > 0 outside the rectangle
    float outside = max(d.x, d.y);
    m = min(m, mix(0.14, 1.0, smoothstep(-0.03, 0.1, outside)));
  }
  return m;
}
`
