/**
 * The liquid-chrome core: an icosahedron whose surface flows, lit only by the
 * studio environment (metalness 1, very low roughness).
 *
 * The reference page deformed ~100k vertices on the CPU every frame and
 * recomputed flat normals, which is far too slow for a phone. Here the same
 * noise runs in the vertex shader, and the normal is rebuilt from it by finite
 * differences, so the surface stays smooth even with a few thousand triangles.
 * `detail` is the only quality knob: ~28 on desktop, ~14 on phones.
 */
import { IcosahedronGeometry, Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

export const BLOB_RADIUS = 1.35

/** The reference's noise(), in GLSL. p is the undeformed position; t is time. */
const GLSL = /* glsl */ `
uniform float uTime;
float blobNoise(vec3 p, float t) {
  return sin(p.x * 1.7 + t) * cos(p.y * 1.9 - t * 0.8) * 0.5
       + sin(p.z * 2.3 + t * 1.3) * sin(p.x * 1.1 - t * 0.6) * 0.35
       + sin((p.x + p.y + p.z) * 3.1 + t * 1.7) * 0.15;
}
vec3 blobPos(vec3 p, float t) { return p * (1.0 + 0.085 * blobNoise(p, t)); }
`

const NORMAL = /* glsl */ `
vec3 n0 = normalize(position);
float r0 = length(position);
vec3 up = abs(n0.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
vec3 t1 = normalize(cross(n0, up));
vec3 t2 = cross(n0, t1);
vec3 q0 = blobPos(position, uTime);
vec3 q1 = blobPos(normalize(n0 + 0.015 * t1) * r0, uTime);
vec3 q2 = blobPos(normalize(n0 + 0.015 * t2) * r0, uTime);
objectNormal = normalize(cross(q1 - q0, q2 - q0));
if (dot(objectNormal, n0) < 0.0) objectNormal = -objectNormal;
`

export function createBlob({ detail = 28, physical = true } = {}) {
  let geometry = new IcosahedronGeometry(BLOB_RADIUS, detail)
  // The shader supplies normals, so drop the flat ones (and uvs) and share vertices.
  geometry.deleteAttribute('normal')
  geometry.deleteAttribute('uv')
  geometry = mergeVertices(geometry, 1e-4)

  const params = { color: 0xffffff, metalness: 1, roughness: 0.06, envMapIntensity: 1 }
  const material = physical ? new MeshPhysicalMaterial({ ...params, clearcoat: 1, clearcoatRoughness: 0.05 }) : new MeshStandardMaterial(params)
  const uniforms = { uTime: { value: 0 } }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `${GLSL}\nvoid main() {`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${NORMAL}`)
      .replace('#include <begin_vertex>', 'vec3 transformed = blobPos(position, uTime);')
  }
  // One program per tier; a custom key keeps it from being shared with plain chrome nodes.
  material.customProgramCacheKey = () => `blob-${physical ? 'physical' : 'standard'}`

  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false // the vertex shader moves the surface beyond the undeformed bounds
  return { mesh, uniforms, geometry, material, triangles: geometry.index.count / 3 }
}
