export default function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="rounded-full border-2 border-sp-faint border-t-sp-green animate-spin"
      style={{ width: size, height: size }}
    />
  );
}
