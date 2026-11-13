import { z } from "zod";

/** The database's limit too (the look_comments migration). */
export const COMMENT_MAX = 500;

/**
 * Text as the database stores a comment or a description: trimmed, with plain line
 * breaks, at most one blank line in a row, and no invisible control characters.
 */
export const cleanText = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[\u0001-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \n]+|[ \n]+$/g, "");

export const commentSchema = z
  .string()
  .transform(cleanText)
  .pipe(
    z
      .string()
      .min(1, "Write something first.")
      .max(COMMENT_MAX, `Keep it to ${COMMENT_MAX} characters.`),
  );

/** The database's limit for a look's description too (the look_description migration). */
export const DESCRIPTION_MAX = 500;

/** Optional: blank is no description at all. */
export const descriptionSchema = z
  .string()
  .optional()
  .transform((text) => cleanText(text ?? ""))
  .pipe(z.string().max(DESCRIPTION_MAX, `Keep the description to ${DESCRIPTION_MAX} characters.`))
  .transform((text) => text || undefined);
