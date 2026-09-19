import { defineRailway, github, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const data = volume("data");

  // Kept as "kid-matrix" (its existing name) to update-in-place rather than
  // orphan the already-created service from the first failed deploy attempt.
  const backend = service("kid-matrix", {
    source: github("vishnu4044/kid-matrix", { rootDirectory: "backend" }),
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    volumeMounts: { "/data": data },
    variables: {
      FLASK_ENV: "production",
      DATABASE_URL: "sqlite:////data/kid_matrix.db",
      UPLOAD_DIR: "/data/uploads",
      // Secrets: never written here. `preserve()` means "leave whatever is
      // already set on Railway alone" — the real values are set once via
      // `railway variable set`, not committed to source.
      SECRET_KEY: preserve(),
      JWT_SECRET_KEY: preserve(),
      OPENAI_API_KEY: preserve(),
      CORS_ORIGINS: preserve(),
    },
  });

  const frontend = service("frontend", {
    source: github("vishnu4044/kid-matrix", { rootDirectory: "frontend" }),
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    variables: {
      // Build-time only (Vite bakes this into the static bundle) — set for
      // real via `railway variable set` once the backend's domain exists.
      VITE_API_BASE_URL: preserve(),
    },
  });

  return project("fulfilling-healing", {
    resources: [backend, frontend],
  });
});
