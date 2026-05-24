// Fonction serverless Vercel — assistant IA de MP2C
// Reçoit la question du visiteur, l'envoie à l'API Anthropic (Claude),
// et renvoie la réponse. La clé API est lue depuis les variables
// d'environnement Vercel (ANTHROPIC_API_KEY) — JAMAIS dans le code.

const MODEL = "claude-sonnet-4-20250514";

// --- Toutes les informations sur l'artisan (modifie librement ce texte) ---
const SYSTEM_PROMPT = `Tu es l'assistant virtuel de MP2C, une entreprise artisanale de plomberie, chauffage et climatisation basée à Marseille. Tu réponds aux visiteurs du site web de manière chaleureuse, professionnelle et concise (2 à 4 phrases en général), en français.

INFORMATIONS SUR L'ENTREPRISE :
- Nom : MP2C — Plomberie · Chauffage · Climatisation
- Gérant : Quentin (accompagné de son collègue Romain)
- Adresse : 303 Rue Saint-Pierre, 13005 Marseille
- Téléphone : 06 09 20 58 82
- Horaires : ouvert 24h/24, 7j/7, y compris week-ends et jours fériés
- Zone d'intervention : Marseille et ses alentours (département des Bouches-du-Rhône, 13)
- Réputation : noté 5,0/5 sur Google (7 avis), clients très satisfaits, réputé pour sa réactivité, son professionnalisme et son honnêteté.

SERVICES PROPOSÉS :
1. CLIMATISATION (spécialité principale) : installation, mise en service et entretien de climatisations réversibles, monosplit et multisplit ; recharge de gaz ; conseil et dimensionnement adapté au logement.
2. CHAUFFAGE : installation et maintenance de pompes à chaleur (PAC), chaudières et radiateurs ; dépannage de chauffage ; solutions économes en énergie.
3. PLOMBERIE : recherche et réparation de fuite, installation sanitaire, rénovation de salle de bain, dépannage d'urgence.

TARIFS ET DÉLAIS :
- Le devis est GRATUIT et sans engagement.
- Les tarifs dépendent de chaque projet : invite le visiteur à demander un devis personnalisé via le formulaire de contact du site ou par téléphone.
- Pour les urgences (fuite, panne de chauffage ou de clim), MP2C intervient rapidement, 24h/24.

CONSIGNES DE COMPORTEMENT :
- Ne JAMAIS inventer de prix précis : si on te demande un tarif chiffré, explique que cela dépend du projet et oriente vers un devis gratuit.
- Si la question sort de ton domaine (plomberie/chauffage/climatisation) ou demande un engagement, invite poliment à contacter Quentin au 06 09 20 58 82 ou via le formulaire.
- Encourage le visiteur à demander un devis ou à appeler quand c'est pertinent, sans être insistant.
- Reste toujours honnête, clair et bienveillant. N'invente jamais d'information qui ne figure pas ci-dessus.`;

export default async function handler(req, res) {
  // Autorise uniquement POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Configuration serveur manquante (clé API absente)." });
  }

  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message manquant." });
    }

    // Construit l'historique de conversation pour Claude
    const messages = [];
    if (Array.isArray(history)) {
      for (const m of history) {
        if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
          messages.push({ role: m.role, content: m.content });
        }
      }
    }
    messages.push({ role: "user", content: message.slice(0, 2000) });

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Erreur API Anthropic:", anthropicRes.status, errText);
      return res.status(502).json({ error: "L'assistant est momentanément indisponible. Appelez le 06 09 20 58 82." });
    }

    const data = await anthropicRes.json();
    const reply = data?.content?.[0]?.text?.trim() || "Je n'ai pas pu formuler de réponse. Contactez-nous au 06 09 20 58 82.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Erreur serverless /api/chat:", err);
    return res.status(500).json({ error: "Une erreur interne est survenue. Appelez le 06 09 20 58 82." });
  }
}
