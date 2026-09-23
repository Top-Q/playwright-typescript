/**
 * cli-args — one guard against one specific, repeatable shell failure.
 *
 * On Windows `npm` resolves to `npm.ps1`, a PowerShell *script*, so PowerShell
 * binds its arguments with the parameter binder rather than forwarding them as
 * it would for a native command. The binder treats `--` as end-of-parameters
 * and every `--flag` as the name of a parameter `npm.ps1` does not declare, so
 * it swallows all of them and passes on only their values:
 *
 *     npm run pipeline:preflight -- --spec TC-MEM-009-01
 *     -> tsx .../preflight.ts TC-MEM-009-01
 *
 * `parseArgs` is strict, so the script then dies on a stray positional with an
 * `ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL` stack trace that mentions neither npm,
 * nor PowerShell, nor what to type instead — a failure that has cost a run.
 * This turns it into the one sentence the caller needs, before parsing.
 *
 * The real fix is to invoke `npm.cmd`, which is a batch file and therefore a
 * genuine native command; this is the backstop for a command line copied from
 * older notes. Boolean flags (`--json`, `--kill`, `--list`) leave nothing behind
 * when they are eaten, so no script can detect their loss — which is why the
 * rule belongs in the docs and this is only a net.
 *
 * Zero runtime dependencies beyond Node builtins.
 */

/**
 * Exits 1 with an explanation when the argument vector carries values but no
 * flags at all — the signature of the npm.ps1 binder having eaten them.
 *
 * Call it before `parseArgs`, in any script for which a bare positional is not
 * a legal argument. `--help` and friends start with `-`, so they never trip it,
 * and neither does an empty argv.
 *
 * @param command - The npm alias callers use, e.g. `pipeline:preflight`.
 */
export function requireFlagsSurvived(command: string): void {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.some((arg) => arg.startsWith('-'))) return;

  console.error(
    `${command}: received only "${args.join(' ')}" — the --flags never arrived.\n` +
      `\nOn PowerShell, \`npm\` resolves to npm.ps1, a PowerShell script, whose parameter` +
      `\nbinder swallows \`--\` and every \`--flag\` before npm sees them, leaving their` +
      `\nvalues behind as positionals. Use npm.cmd, which is a real native command:` +
      `\n\n    npm.cmd run ${command} -- <the same flags>` +
      `\n\n(or quote every token: npm run ${command} '--' '--flag' 'value')` +
      `\n\nRun \`npm.cmd run ${command} -- --help\` for the accepted options.`,
  );
  process.exit(1);
}
