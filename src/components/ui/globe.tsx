"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";

export function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 1000,
      height: 1000,
      phi: 0,
      theta: 0.3,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [1, 1, 1],
      markerColor: [41 / 255, 141 / 255, 198 / 255],
      glowColor: [1, 1, 1],
      markers: [
        // UK
        { location: [55.3781, -3.4360], size: 0.1 },
        // US
        { location: [37.0902, -95.7129], size: 0.05 },
        // Australia
        { location: [-25.2744, 133.7751], size: 0.05 },
      ],
      // @ts-expect-error cobe types don't include onRender but it's valid
      onRender: (state: Record<string, any>) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.
        state.phi = phi;
        phi += 0.005;
      }
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: 500, aspectRatio: 1, margin: "auto", position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", contain: "layout paint size", opacity: 1, transition: "opacity 1s ease" }}
      />
    </div>
  );
}
