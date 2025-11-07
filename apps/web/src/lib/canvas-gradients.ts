function splitBackgroundLayers(input: string): string[] {
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] as string;
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if (ch === "," && depth === 0) {
      layers.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }
  layers.push(input.slice(start).trim());
  return layers;
}

function parseColorStop(stop: string): { color: string; position?: number } {
  const s = stop.trim();

  // Handle functional colors like rgba(), rgb(), hsla(), hsl()
  const colorFunctions = ["rgba(", "rgb(", "hsla(", "hsl("];
  let color = "";
  let remaining = "";

  for (const fn of colorFunctions) {
    if (s.startsWith(fn)) {
      let depth = 0;
      for (let i = 0; i < s.length; i += 1) {
        const ch = s[i] as string;
        if (ch === "(") depth += 1;
        else if (ch === ")") {
          depth -= 1;
          if (depth === 0) {
            color = s.slice(0, i + 1);
            remaining = s.slice(i + 1).trim();
            break;
          }
        }
      }
      break;
    }
  }

  if (!color) {
    const parts = s.split(/\s+/);
    color = parts[0] as string;
    remaining = parts.slice(1).join(" ");
  }

  // Convert transparent to transparent white for better blending
  if (color === "transparent") {
    color = "rgba(255, 255, 255, 0)";
  }

  // Parse position if present
  let position: number | undefined;
  if (remaining) {
    const posMatch = remaining.match(/(\d+(?:\.\d+)?)%/);
    if (posMatch) {
      position = parseFloat(posMatch[1] as string) / 100;
    }
  }

  return { color, position };
}

function parseLinearGradient(layer: string, width: number, height: number) {
  const inside = layer.slice(layer.indexOf("(") + 1, layer.lastIndexOf(")"));
  const parts = splitBackgroundLayers(inside);
  const dir = (parts.shift() || "").trim();

  let x0 = 0,
    y0 = 0,
    x1 = width,
    y1 = 0; // default: to right

  if (dir.endsWith("deg")) {
    const deg = parseFloat(dir);
    const rad = (deg * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.hypot(width, height) / 2;
    x0 = cx - Math.cos(rad) * r;
    y0 = cy - Math.sin(rad) * r;
    x1 = cx + Math.cos(rad) * r;
    y1 = cy + Math.sin(rad) * r;
  } else if (dir.startsWith("to ")) {
    const d = dir.slice(3).trim();
    if (d === "right") {
      x0 = 0;
      y0 = 0;
      x1 = width;
      y1 = 0;
    } else if (d === "left") {
      x0 = width;
      y0 = 0;
      x1 = 0;
      y1 = 0;
    } else if (d === "bottom") {
      x0 = 0;
      y0 = 0;
      x1 = 0;
      y1 = height;
    } else if (d === "top") {
      x0 = 0;
      y0 = height;
      x1 = 0;
      y1 = 0;
    }
  } else {
    // No direction specified, treat as first color
    parts.unshift(dir);
  }

  return { x0, y0, x1, y1, colors: parts };
}

function parseRadialGradient(layer: string, width: number, height: number) {
  const inside = layer.slice(layer.indexOf("(") + 1, layer.lastIndexOf(")"));
  const parts = splitBackgroundLayers(inside);
  const first = (parts.shift() || "").trim();

  let cx = width / 2;
  let cy = height / 2;

  if (first.startsWith("circle at")) {
    const pos = first.replace("circle at", "").trim();
    const coords = pos.split(/\s+/);

    for (let i = 0; i < coords.length; i += 1) {
      const coord = coords[i] as string;
      if (coord.endsWith("%")) {
        const val = parseFloat(coord) / 100;
        if (i === 0) cx = val * width;
        else if (i === 1) cy = val * height;
      } else if (coord === "left") cx = 0;
      else if (coord === "right") cx = width;
      else if (coord === "top") cy = 0;
      else if (coord === "bottom") cy = height;
      else if (coord === "center") {
        if (i === 0) cx = width / 2;
        else if (i === 1) cy = height / 2;
      }
    }
  } else {
    parts.unshift(first);
  }

  // Use farthest-corner for radius
  const r = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(width - cx, cy),
    Math.hypot(cx, height - cy),
    Math.hypot(width - cx, height - cy)
  );

  return { cx, cy, r, colors: parts };
}

export function drawCssBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  css: string
): void {
  const layers = splitBackgroundLayers(css).filter(Boolean);

  // Draw layers from last to first (CSS background order)
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i] as string;

    if (layer.startsWith("linear-gradient(")) {
      const { x0, y0, x1, y1, colors } = parseLinearGradient(
        layer,
        width,
        height
      );
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      const colorStops = colors.map((c) => parseColorStop(c as string));

      // Handle positions properly
      for (let j = 0; j < colorStops.length; j += 1) {
        const stop = colorStops[j] as { color: string; position?: number };
        const pos = stop.position ?? j / Math.max(1, colorStops.length - 1);
        grad.addColorStop(Math.max(0, Math.min(1, pos)), stop.color);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (layer.startsWith("radial-gradient(")) {
      const { cx, cy, r, colors } = parseRadialGradient(layer, width, height);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const colorStops = colors.map((c) => parseColorStop(c as string));

      // Handle positions properly
      for (let j = 0; j < colorStops.length; j += 1) {
        const stop = colorStops[j] as { color: string; position?: number };
        const pos = stop.position ?? j / Math.max(1, colorStops.length - 1);
        grad.addColorStop(Math.max(0, Math.min(1, pos)), stop.color);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (
      layer.startsWith("#") ||
      layer.startsWith("rgb") ||
      layer.startsWith("hsl") ||
      layer === "transparent" ||
      layer === "white" ||
      layer === "black"
    ) {
      if (layer !== "transparent") {
        ctx.fillStyle = layer;
        ctx.fillRect(0, 0, width, height);
      }
    }
  }
}
