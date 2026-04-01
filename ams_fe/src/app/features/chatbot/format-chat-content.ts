import { DatePipe } from '@angular/common';

/** ISO-like timestamps embedded in plain text from the chat API */
const ISO_IN_TEXT =
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2}(?::\d{2})?)?/g;

/**
 * Replaces ISO-8601 substrings in `text` with a short date/time string.
 * Never throws: on any failure returns the original `text` (raw API content).
 */
export function formatIsoTimestampsInText(text: string, datePipe: DatePipe): string {
  try {
    if (!text) return text;
    return text.replace(ISO_IN_TEXT, (match) => {
      try {
        const d = new Date(match);
        if (Number.isNaN(d.getTime())) return match;
        const formatted = datePipe.transform(d, "dd/MM/yyyy 'lúc' HH:mm");
        return formatted ?? match;
      } catch {
        return match;
      }
    });
  } catch {
    return text;
  }
}
