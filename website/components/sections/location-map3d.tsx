"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion } from "framer-motion";
import { CONTACT } from "@/lib/content";

// Office coordinates (Dhaka) — exact location.
const OFFICE = { lat: 23.7506992269615, lon: 90.38395287173906 };
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

export function LocationMap3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current || !MAPTILER_KEY) return;

    const map = new maplibregl.Map({
      container,
      style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${MAPTILER_KEY}`,
      center: [OFFICE.lon, OFFICE.lat],
      zoom: 16.5,
      pitch: 60,
      bearing: -20,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    map.on("error", (e) => {
      // Surface auth / tile errors instead of failing silently.
      console.error("MapLibre error:", e?.error ?? e);
      setErrorMsg(e?.error?.message ?? "Map failed to load.");
    });

    map.on("load", () => {
      // Ensure the map matches the container size after layout settles.
      map.resize();

      // 3D building extrusions from the vector source.
      const style = map.getStyle();
      const layers = style?.layers ?? [];
      let firstSymbolId: string | undefined;
      for (const layer of layers) {
        if (layer.type === "symbol") {
          firstSymbolId = layer.id;
          break;
        }
      }

      // Only add if the expected source-layer exists in this style.
      const hasOpenMapTiles = !!style?.sources?.["openmaptiles"];
      if (hasOpenMapTiles && !map.getLayer("3d-buildings")) {
        map.addLayer(
          {
            id: "3d-buildings",
            source: "openmaptiles",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 13,
            paint: {
              // Buildings tinted with the site background (cream) — lighter as
              // they get taller for subtle depth.
              "fill-extrusion-color": [
                "interpolate",
                ["linear"],
                ["get", "render_height"],
                0,
                "#EFE9DC",
                50,
                "#F4EFE4",
                150,
                "#FAF7F0",
              ],
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                13,
                0,
                15.5,
                ["coalesce", ["get", "render_height"], 10],
              ],
              "fill-extrusion-base": [
                "coalesce",
                ["get", "render_min_height"],
                0,
              ],
              "fill-extrusion-opacity": 0.85,
            },
          },
          firstSymbolId
        );
      }

      // Office marker.
      const el = document.createElement("div");
      el.className = "mis-map-pin";
      new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([OFFICE.lon, OFFICE.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 24, closeButton: false }).setHTML(
            `<strong>MIS Solution HQ</strong><br/><span style="font-size:12px;color:#555">${CONTACT.address}</span>`
          )
        )
        .addTo(map);
    });

    // Resize once more after the browser has painted, in case the container
    // grew after the map was created (common inside flex/rounded wrappers).
    const raf = requestAnimationFrame(() => map.resize());

    return () => {
      cancelAnimationFrame(raf);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <section
      id="location"
      className="relative overflow-hidden bg-cream py-16 text-ink sm:py-28"
    >
      <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Text — left column */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl"
        >
          <p className="eyebrow text-brand-500">Find us</p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-4xl">
            One office. Nationwide reach.
          </h2>
          <p className="mt-3 text-sm text-ink/60 sm:mt-4 sm:text-base">
            Our headquarters sits in the heart of Dhaka, powering an ICT
            network that spans every upazila in Bangladesh.
          </p>
        </motion.div>

        {/* 3D map stage — right column */}
        <div className="relative h-[440px] w-full overflow-hidden rounded-3xl border border-ink/10 sm:h-[560px]">
          <div
            ref={containerRef}
            className="absolute inset-0"
            style={{ width: "100%", height: "100%" }}
          />

          {(!MAPTILER_KEY || errorMsg) && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/5 px-6 text-center text-sm text-white/60">
              {!MAPTILER_KEY
                ? "Map unavailable — missing NEXT_PUBLIC_MAPTILER_KEY."
                : `Map error: ${errorMsg}`}
            </div>
          )}

          {/* Address chip */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 w-[min(90%,26rem)] -translate-x-1/2">
            <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/50 p-4 text-center backdrop-blur-md">
              <p className="text-sm font-medium text-white">MIS Solution HQ</p>
              <p className="mt-1 text-xs text-white/60">{CONTACT.address}</p>
              <a
                href={CONTACT.mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-white"
              >
                Open in Google Maps
                <span aria-hidden>↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
