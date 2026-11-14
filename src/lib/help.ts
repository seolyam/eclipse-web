// The fixes players ask for most, one list for the guide page and the bot's /help.
// Every answer comes from Kira's own posts (the install steps, announcements and the
// 1.0.1 changelog) or the overlay's settings, never from guesswork. Text between
// backticks is a file, a setting line or a command: Discord shows it as code, and
// so does the guide.

export interface HelpEntry {
  id: string;
  question: string;
  answer: string;
}

export const HELP: readonly HelpEntry[] = [
  {
    id: "f2",
    question: "F2 does nothing",
    answer:
      "Eclipse opens once you are in the world, not at the login or character screen. Check that `dinput8.dll` sits right next to `Wow.exe`, not in a folder of its own. If you changed the key in Eclipse's settings, press that one.",
  },
  {
    id: "crash",
    question: "The game crashes while Eclipse loads, or closes as you enter the world",
    answer:
      "Get the latest Eclipse, which fixed most of these. If it still happens, add `SET dbCompress \"0\"` to `WTF/Config.wtf` in your game folder.",
  },
  {
    id: "missing",
    question: "The HD font or some Incarnations are missing",
    answer:
      "Those need the `Eclipse` folder from Eclipse.zip, next to `Wow.exe` as well. `dinput8.dll` runs on its own, but with fewer features.",
  },
  {
    id: "names",
    question: "Pieces show file names instead of their real names",
    answer:
      "Real names arrive from the server a moment after a piece first shows. Turn on Settings > Wardrobe > Item caching to load them ahead of time. To find one piece, use `/item` in the Eclipse Discord: it gives the id that the wardrobe's search finds it by.",
  },
];

/** Splits an answer into plain text and the parts written between backticks. */
export function helpParts(text: string): { text: string; code: boolean }[] {
  return text.split("`").map((part, i) => ({ text: part, code: i % 2 === 1 })).filter((p) => p.text);
}
