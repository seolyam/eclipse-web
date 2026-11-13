import { z } from "zod";

/** The database's limit too (the look_comments migration). */
export const COMMENT_MAX = 500;

/**
 * A comment as the database stores it: trimmed, with plain line breaks, at most one
 * blank line in a row, and no invisible control characters.
 */
export const commentSchema = z
  .string()
  .transform((text) =>
    text
      .replace(/\r\n?/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[\u0001-\u0008\u000b-\u001f\u007f]/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^[ \n]+|[ \n]+$/g, ""),
  )
  .pipe(
    z
      .string()
      .min(1, "Write something first.")
      .max(COMMENT_MAX, `Keep it to ${COMMENT_MAX} characters.`),
  );
