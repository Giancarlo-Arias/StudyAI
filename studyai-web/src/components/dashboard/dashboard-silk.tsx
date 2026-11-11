"use client";

import { useEffect, useRef } from "react";

const vertexSource = `
attribute vec2 position;
varying mediump vec2 uv;
void main() {
  uv = position * .5 + .5;
  gl_Position = vec4(position, 0., 1.);
}
`;

const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying mediump vec2 uv;
uniform float aspect;
uniform float time;
uniform float dark;

void main() {
  vec2 p = (uv - .5) * vec2(aspect, 1.);
  float a = p.x * 1.35 + time * .22;
  float b = p.y * 1.8 - time * .17;
  float phase = p.x * 3.6 + p.y * 5. + .8 * sin(a) + .48 * sin(b) + time * .12;
  float slope = .68 * cos(phase) + .306 * cos(phase * 1.7);
  vec2 gradient = slope * vec2(3.6 + 1.08 * cos(a), 5. + .864 * cos(b));
  vec3 normal = normalize(vec3(-gradient * .22, 1.));
  vec3 light = normalize(vec3(-.45, .65, 1.));
  float diffuse = max(dot(normal, light), 0.);
  float reflection = pow(max(reflect(-light, normal).z, 0.), 28.);
  float crease = pow(.5 + .5 * sin(phase + .3), 8.);

  vec3 violet = mix(vec3(.68, .61, .86), vec3(.43, .35, .67), dark);
  vec3 blue = mix(vec3(.56, .66, .83), vec3(.27, .42, .62), dark);
  vec3 shadow = mix(vec3(.48, .48, .67), vec3(.06, .09, .21), dark);
  vec3 tint = mix(violet, blue, .5 + .5 * sin(p.x * .65 + p.y * .4 + time * .05));
  vec3 color = mix(shadow, tint, smoothstep(.18, .98, diffuse));
  color += reflection * vec3(.3, .28, .4) + crease * .055;

  float edge = smoothstep(.08, .65, length((uv - vec2(.52, .46)) * vec2(1.4, 1.)));
  float alpha = (.075 + edge * .24) * (.65 + diffuse * .35) + reflection * .055;
  float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))) - .5;
  gl_FragColor = vec4(clamp(color + grain / 255., 0., 1.), clamp(alpha + grain / 255., 0., 1.));
}
`;

type SilkRenderer = {
  draw: (time: number) => void;
  resize: () => void;
  setDark: (dark: boolean) => void;
  dispose: () => void;
};

function createRenderer(canvas: HTMLCanvasElement): SilkRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.detachShader(program, vertex);
  gl.detachShader(program, fragment);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  const buffer = gl.createBuffer();
  const position = gl.getAttribLocation(program, "position");
  if (!buffer || position < 0) {
    if (buffer) gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const timeLocation = gl.getUniformLocation(program, "time");
  const aspectLocation = gl.getUniformLocation(program, "aspect");
  const darkLocation = gl.getUniformLocation(program, "dark");

  return {
    draw(time) {
      gl.uniform1f(timeLocation, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    resize() {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const scale = Math.min(1, 1280 / Math.max(width, height));
      const nextWidth = Math.max(1, Math.round(width * scale));
      const nextHeight = Math.max(1, Math.round(height * scale));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      gl.viewport(0, 0, nextWidth, nextHeight);
      gl.uniform1f(aspectLocation, width / height);
    },
    setDark(isDark) {
      gl.uniform1f(darkLocation, isDark ? 1 : 0);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

export function DashboardSilk() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const highContrast = window.matchMedia("(prefers-contrast: more)");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    let renderer: SilkRenderer | null = null;
    let frame = 0;
    let clock = 8;
    let previousTime = 0;
    let lastDraw = 0;
    let contextLost = false;
    let resizeNeeded = false;
    let unavailable = false;

    const stop = () => {
      cancelAnimationFrame(frame);
      previousTime = 0;
      lastDraw = 0;
    };
    const release = () => {
      renderer?.dispose();
      renderer = null;
      root.removeAttribute("data-ready");
      canvas.width = 1;
      canvas.height = 1;
    };
    const tick = (now: number) => {
      if (!renderer) return;
      if (previousTime) clock += Math.min(now - previousTime, 100) / 1000;
      previousTime = now;
      if (now - lastDraw >= 1000 / 30) {
        if (resizeNeeded) {
          renderer.resize();
          resizeNeeded = false;
        }
        renderer.draw(clock);
        lastDraw = now - ((now - lastDraw) % (1000 / 30));
      }
      frame = requestAnimationFrame(tick);
    };
    const synchronize = () => {
      stop();
      if (reducedTransparency.matches || highContrast.matches) {
        release();
        return;
      }
      if (contextLost || unavailable || document.visibilityState === "hidden") return;
      renderer ??= createRenderer(canvas);
      if (!renderer) {
        unavailable = true;
        return;
      }
      const selected = document.documentElement.dataset.theme;
      renderer.resize();
      resizeNeeded = false;
      renderer.setDark(selected === "dark" || (selected !== "light" && systemDark.matches));
      renderer.draw(clock);
      root.dataset.ready = "true";
      if (!reducedMotion.matches) frame = requestAnimationFrame(tick);
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      stop();
      release();
    };
    const onContextRestored = () => {
      contextLost = false;
      unavailable = false;
      synchronize();
    };
    const resizeObserver = new ResizeObserver(() => {
      resizeNeeded = true;
      if (renderer && reducedMotion.matches && document.visibilityState !== "hidden") {
        renderer.resize();
        renderer.draw(clock);
        resizeNeeded = false;
      }
    });
    const themeObserver = new MutationObserver(synchronize);
    const preferences = [reducedMotion, reducedTransparency, highContrast, systemDark];
    preferences.forEach((preference) => preference.addEventListener("change", synchronize));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    resizeObserver.observe(root);
    document.addEventListener("visibilitychange", synchronize);
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    synchronize();

    return () => {
      stop();
      release();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      preferences.forEach((preference) => preference.removeEventListener("change", synchronize));
      document.removeEventListener("visibilitychange", synchronize);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, []);

  return (
    <div ref={rootRef} className="workspace-silk" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
