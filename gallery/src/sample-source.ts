/** Read a marked range of the actual running example, rather than a second
 * handwritten sample that can drift away from the rendered control. */
export function extractSampleSource(source: string, name: string): string {
  const start = `@sample:${name}:start`;
  const end = `@sample:${name}:end`;
  const lines = source.split(/\r?\n/);
  const first = lines.findIndex((line) => line.includes(start));
  const last = lines.findIndex(
    (line, index) => index > first && line.includes(end),
  );
  if (first < 0 || last < 0) throw new Error(`Missing source range: ${name}`);
  const selected = lines.slice(first + 1, last);
  const indentation = Math.min(
    ...selected
      .filter((line) => line.trim())
      .map((line) => line.match(/^\s*/)![0].length),
  );
  return selected
    .map((line) => line.slice(indentation))
    .join("\n")
    .trim();
}
