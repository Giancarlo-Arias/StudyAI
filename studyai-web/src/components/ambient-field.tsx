import contours from "@/assets/visuals/ambient-contours.svg";

export function AmbientField({ variant = "workspace" }: { variant?: "workspace" | "auth" }) {
  const mask = { maskImage: `url(${contours.src})`, WebkitMaskImage: `url(${contours.src})` };
  return (
    <div className={"ambient-field ambient-field--" + variant} aria-hidden="true">
      <div className="ambient-field-wash" />
      <div className="ambient-field-flow" style={mask} />
      <div className="ambient-field-flow ambient-field-flow--far" style={mask} />
    </div>
  );
}
