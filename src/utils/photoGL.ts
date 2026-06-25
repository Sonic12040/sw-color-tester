/**
 * WebGL recolor renderer (Room Visualizer v2) — the fast, live path for the
 * upload-your-photo studio. Draws the photo, recolors the masked wall region
 * (luminance-preserving, mirroring `photoMask.recolorPixel`), and blends a
 * lighting tint — all on the GPU so dragging tolerance / switching colors is
 * instant. Browser-only; the page falls back to the pure CPU compositor
 * (`compositeRgba`) when WebGL is unavailable.
 */

import type { LightParams, Rgb } from "./photoMask.js";

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2((a_pos.x + 1.0) / 2.0, (1.0 - a_pos.y) / 2.0);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_photo;
uniform sampler2D u_mask;
uniform vec3 u_target;    // 0..1
uniform float u_refLum;   // 0..1
uniform float u_strength; // 0..1
uniform vec3 u_light;     // overlay 0..1
uniform float u_lightAmt; // 0..1
uniform int u_lightMode;  // 0 none, 1 soft-light, 2 screen
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float softLight(float b, float o) {
  if (o <= 0.5) return b - (1.0 - 2.0 * o) * b * (1.0 - b);
  float d = b <= 0.25 ? ((16.0 * b - 12.0) * b + 4.0) * b : sqrt(b);
  return b + (2.0 * o - 1.0) * (d - b);
}
void main() {
  vec3 photo = texture2D(u_photo, v_uv).rgb;
  float m = texture2D(u_mask, v_uv).r;
  float scale = u_refLum > 0.0 ? luma(photo) / u_refLum : 1.0;
  vec3 recolored = clamp(u_target * scale, 0.0, 1.0);
  vec3 col = mix(photo, recolored, m * u_strength);
  if (u_lightMode == 2) {
    col = mix(col, 1.0 - (1.0 - col) * (1.0 - u_light), u_lightAmt);
  } else if (u_lightMode == 1) {
    vec3 sl = vec3(softLight(col.r, u_light.r), softLight(col.g, u_light.g), softLight(col.b, u_light.b));
    col = mix(col, sl, u_lightAmt);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export interface RenderParams {
  target: Rgb; // 0–255
  refLum: number; // 0–255
  strength: number; // 0–1
  light: LightParams;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("createShader failed");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader compile failed: ${log}`);
  }
  return sh;
}

function makeTexture(gl: WebGLRenderingContext): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) throw new Error("createTexture failed");
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // NPOT-safe: clamp + linear, no mipmaps.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

/** A WebGL recolor renderer bound to a canvas. Throws if WebGL is unavailable. */
export class PhotoRenderer {
  #gl: WebGLRenderingContext;
  #program: WebGLProgram;
  #photoTex: WebGLTexture;
  #maskTex: WebGLTexture;
  #uniforms: Record<string, WebGLUniformLocation | null>;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = (canvas.getContext("webgl", {
      preserveDrawingBuffer: true, // so toBlob/toDataURL can read it back
    }) ||
      canvas.getContext("experimental-webgl", {
        preserveDrawingBuffer: true,
      })) as WebGLRenderingContext | null;
    if (!gl) throw new Error("WebGL unavailable");
    this.#gl = gl;

    const program = gl.createProgram();
    if (!program) throw new Error("createProgram failed");
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    this.#program = program;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.#photoTex = makeTexture(gl);
    this.#maskTex = makeTexture(gl);
    this.#uniforms = Object.fromEntries(
      [
        "u_photo",
        "u_mask",
        "u_target",
        "u_refLum",
        "u_strength",
        "u_light",
        "u_lightAmt",
        "u_lightMode",
      ].map((name) => [name, gl.getUniformLocation(program, name)]),
    );
  }

  /** Upload the source photo and size the canvas/viewport to match. */
  setPhoto(source: TexImageSource, width: number, height: number): void {
    const gl = this.#gl;
    this.canvas.width = width;
    this.canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#photoTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  /** Upload the coverage mask (single-channel) as a LUMINANCE texture. */
  setMask(mask: Uint8Array, width: number, height: number): void {
    const gl = this.#gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#maskTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      width,
      height,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      mask,
    );
  }

  /** Draw the composite with the current photo + mask and the given params. */
  render(params: RenderParams): void {
    const gl = this.#gl;
    const u = this.#uniforms;
    gl.useProgram(this.#program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.#photoTex);
    gl.uniform1i(u.u_photo, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.#maskTex);
    gl.uniform1i(u.u_mask, 1);
    gl.uniform3f(
      u.u_target,
      params.target.r / 255,
      params.target.g / 255,
      params.target.b / 255,
    );
    gl.uniform1f(u.u_refLum, params.refLum / 255);
    gl.uniform1f(u.u_strength, params.strength);
    const light = params.light;
    const mode =
      !light.overlay || light.opacity <= 0 || light.blend === "normal"
        ? 0
        : light.blend === "screen"
          ? 2
          : 1;
    gl.uniform1i(u.u_lightMode, mode);
    gl.uniform1f(u.u_lightAmt, light.opacity);
    gl.uniform3f(
      u.u_light,
      (light.overlay?.r ?? 255) / 255,
      (light.overlay?.g ?? 255) / 255,
      (light.overlay?.b ?? 255) / 255,
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose(): void {
    const gl = this.#gl;
    gl.deleteTexture(this.#photoTex);
    gl.deleteTexture(this.#maskTex);
    gl.deleteProgram(this.#program);
  }
}

/** Whether the browser can give us a WebGL context (used to pick GPU vs CPU). */
export function isWebGLAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}
