"use client";

import createGlobe from "cobe";
import { useEffect, useRef } from "react";

import type { LiveVisitorMarker } from "@/lib/analytics-live-types";

type Props = {
  visitors: LiveVisitorMarker[];
};

/** Subtle markers — aligned with legend dot on the globe card */
const MARKER_SIZE = 0.055;
const MARKER_COLOR: [number, number, number] = [0.48, 0.62, 0.54];

function visitorMarkers(visitors: LiveVisitorMarker[]) {
  return visitors.map((v) => ({
    location: [v.lat, v.lng] as [number, number],
    size: MARKER_SIZE,
  }));
}

function globeSize(container: HTMLElement): number {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const size = Math.min(w, h, 640);
  return Math.max(Math.round(size), 220);
}

export default function AdminLiveGlobe({ visitors }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visitorsRef = useRef(visitors);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);

  useEffect(() => {
    visitorsRef.current = visitors;
    globeRef.current?.update({
      markers: visitorMarkers(visitorsRef.current),
    });
  }, [visitors]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) {
      return;
    }

    let width = globeSize(wrap);
    let phi = 0;
    let raf = 0;

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.22,
      dark: 0,
      diffuse: 1.15,
      mapSamples: 20000,
      mapBrightness: 6,
      baseColor: [0.82, 0.86, 0.92],
      markerColor: MARKER_COLOR,
      glowColor: [0.9, 0.93, 0.98],
      markers: visitorMarkers(visitorsRef.current),
    });
    globeRef.current = globe;

    const tick = () => {
      phi += 0.004;
      globe.update({
        width: width * 2,
        height: width * 2,
        phi,
        markers: visitorMarkers(visitorsRef.current),
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      width = globeSize(wrap);
    });
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      globe.destroy();
      globeRef.current = null;
    };
  }, []);

  return (
    <div ref={wrapRef} className="admin-live-globe-wrap">
      <canvas ref={canvasRef} className="admin-live-globe-canvas" />
      <div className="admin-live-globe-legend">
        <span className="admin-live-globe-legend-item">
          <span className="admin-live-globe-dot admin-live-globe-dot--visitor" />
          Live visitor
        </span>
      </div>
    </div>
  );
}
