{
  pkgs ? import <nixpkgs> { },
}:

# Single source of truth for the dev environment.
# `flake.nix` wraps this so `nix develop` and `nix-shell` give the same shell.
pkgs.mkShell {
  name = "menuviz-dev";

  packages = with pkgs; [
    # The project's package manager and runtime. The app uses bun strictly;
    # nodejs is here only so tools that shell out to a `node` binary work.
    bun
    nodejs_24

    # Formatting / hooks. prettier itself comes from node_modules (a bun dep)
    # and is added to PATH below, so treefmt drives a single pinned version.
    treefmt
    nixfmt
    lefthook

    git
  ];

  shellHook = ''
    # Prefer project-local binaries (prettier, eslint, wrangler, ...).
    export PATH="$PWD/node_modules/.bin:$PATH"
    export NEXT_TELEMETRY_DISABLED=1

    # Install git hooks on entry; harmless to re-run.
    if command -v lefthook >/dev/null 2>&1; then
      lefthook install >/dev/null 2>&1 || true
    fi

    echo "menuviz dev shell — bun $(bun --version), node $(node --version)"
  '';
}
