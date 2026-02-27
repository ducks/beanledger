{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_22
    nodePackages.pnpm
    postgresql_16
    docker
    docker-compose
  ];

  shellHook = ''
    echo "BeanLedger development environment"
    echo "Node version: $(node --version)"
    echo "pnpm version: $(pnpm --version)"
    echo ""
    echo "Quick start:"
    echo "  docker compose up -d    # Start PostgreSQL"
    echo "  pnpm install            # Install dependencies"
    echo "  pnpm dev                # Start dev server"
  '';
}
