"use client";

/** Soft fill light attached to the visible Sun. */
export function SunLight() {
  return (
    <pointLight distance={40} intensity={1.5} color="#fff0c8" decay={2} />
  );
}
