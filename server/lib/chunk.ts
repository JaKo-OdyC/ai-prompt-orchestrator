export type Chunk = { id: string; start: number; end: number; text: string };

export function chunkCode(input: string, maxLen = 2000): Chunk[] {
  if (!input) return [];
  
  const lines = input.split("\n");
  const chunks: Chunk[] = [];
  let buf: string[] = [];
  let start = 0;
  
  const flush = () => {
    if (!buf.length) return;
    const text = buf.join("\n");
    const id = `c${chunks.length + 1}`;
    const end = start + text.length;
    chunks.push({ id, start, end, text });
    start = end + 1;
    buf = [];
  };
  
  const boundary = /^(export\s+)?(class|interface|function|async function|def\s+|class\s+|\w+\s*=\s*function|\s*#[#]*)\b/i;
  
  for (const line of lines) {
    if (boundary.test(line) && buf.join("\n").length > 0) flush();
    buf.push(line);
    if (buf.join("\n").length >= maxLen) flush();
  }
  flush();
  
  return chunks;
}