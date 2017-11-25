{ pkgs ? import <nixpkgs> {} }: let
  inherit (builtins) elem filterSource map;
  inherit (pkgs) stdenv graphviz discount;
  files = [
    ../arch.dot
    ../README.md
  ];
in stdenv.mkDerivation {
  name = "es-doc";
  src = filterSource (p: t: elem p (map toString files)) ../.;
  buildInputs = [ graphviz discount ];
  dotproc = "dot";
  builder = ./buildoc.sh;
}
