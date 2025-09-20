// Regelbasierte DSGVO-Redaktion (ohne KI)
export function redactSensitive(input: string): string {
  if (!input) return input;
  
  const parts = input.split(/```[\s\S]*?```/g);
  const fences = input.match(/```[\s\S]*?```/g) || [];
  
  const redactPlain = (s: string) => {
    let out = s;
    
    // E-Mail
    out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]");

    // Telefon (sehr grob, vermeidet false positives nicht vollständig)
    out = out.replace(/\+?\d{1,3}[ -]?\(?\d+\)?[ -]?\d{3,}[ -]?\d{2,}/g, "[PHONE]");

    // IBAN
    out = out.replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, "[IBAN]");

    // API-Keys / Secrets (grobe Heuristik)
    out = out.replace(
      /\b(?:(?:sk|key|secret|token|tok)[\-_:=\s]*)([A-Za-z0-9_\-]{16,})\b/gi,
      "[SECRET]"
    );

    // Dateipfade (Windows/Unix)
    out = out.replace(/[A-Za-z]:\\[^\s"']+|\/(?:[^/\s"']+\/)+[^/\s"']+/g, "[PATH]");

    // Namen (nur sehr vorsichtig, kapitalisierte Wortketten 2–4 Wörter)
    out = out.replace(
      /\b([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+){1,3})\b/g,
      (m) => {
        // Filtere offensichtliche Satzanfänge (Heuristik)
        if (/^(The|Das|Der|Die|This|That|Ein|Eine|La|Le|El|De|To|In|On|At)$/.test(m))
          return m;
        return "[NAME]";
      }
    );

    return out;
  };
  
  // redact outside code blocks only
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    out += redactPlain(parts[i]);
    if (fences[i]) out += fences[i]; // keep code unchanged
  }
  return out;
}