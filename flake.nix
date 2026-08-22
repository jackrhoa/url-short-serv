{
  description = "thejac.kr URL shortener CLI";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs = { self, nixpkgs }:
    let
      systems = [ "aarch64-darwin" "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      overlays.default = final: prev: {
        short = final.stdenvNoCC.mkDerivation {
          pname = "short";
          version = "0.0.0";
          src = self;

          nativeBuildInputs = [ final.makeWrapper ];
          dontBuild = true;

          installPhase = ''
            runHook preInstall

            mkdir -p $out/lib/short
            cp -r cli shared $out/lib/short/
            rm -rf $out/lib/short/cli/tests

            makeWrapper ${final.nodejs_24}/bin/node $out/bin/short \
              --add-flags $out/lib/short/cli/index.ts

            runHook postInstall
          '';

          meta = {
            description = "CLI for adding short links to thejac.kr";
            mainProgram = "short";
            platforms = systems;
          };
        };
      };

      packages = forAllSystems (pkgs:
        let short = (self.overlays.default pkgs pkgs).short;
        in { inherit short; default = short; });
    };
}
