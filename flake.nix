{
  description = "menuviz.app — zero-install AR menu PWA dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        # Wraps shell.nix so the flake and the legacy `nix-shell` path stay identical.
        devShells.default = import ./shell.nix { inherit pkgs; };

        formatter = pkgs.treefmt;
      }
    );
}
