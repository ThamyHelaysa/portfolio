/**
 * Parsed shape of one terminal input line.
 */
export type ParsedCommand = {
  raw: string;                              // normalized original input
  cmd: string;                              // lowercased command word
  flags: Record<string, string | boolean>;  // --flag or --flag value
  positionals: string[];                    // remaining bare tokens
};

/**
 * Parses a raw terminal input line into command, flags, and positionals.
 *
 * @param input - The raw text submitted to the terminal.
 * @returns The normalized parsed command.
 */
export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim().replace(/\s+/g, " ");
  const tokens = raw.length ? raw.split(" ") : [];

  const cmd = (tokens.shift() ?? "").toLowerCase();

  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (t.startsWith("--")) {
      const name = t.slice(2).toLowerCase();

      // --flag value (if next token exists and isn't another flag)
      if (tokens[i + 1] && !tokens[i + 1].startsWith("--")) {
        flags[name] = tokens[i + 1];
        i++;
      } else {
        // --flag (boolean)
        flags[name] = true;
      }
    } else {
      positionals.push(t);
    }
  }

  return { raw, cmd, flags, positionals };
}
