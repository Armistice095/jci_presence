
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Les routes API seront traitées ici
    if (url.pathname.startsWith("/api/")) {
      return new Response(
        JSON.stringify({ error: "Route API introuvable" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    // Servir normalement l'application Svelte
    return env.ASSETS.fetch(request);
  }
};
