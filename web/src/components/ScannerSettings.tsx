import { useState } from "react";
import { Check, Eye, EyeOff, Lock, ScanBarcode, TriangleAlert } from "lucide-react";
import { Button, Card, Chip, Field, inputClass } from "../components/ui";
import { colorOf } from "../lib/format";
import { useScanConfig, useScanSettings } from "../lib/hooks";
import type { ScanSettingName } from "../types";

/** Woher ein Wert kommt – „env“ heißt: per Umgebungsvariable vorgegeben und
 *  hier bewusst nicht änderbar, sonst trüge man etwas ein, das nie greift. */
function Source({ name, config }: { name: ScanSettingName; config: { sources: Record<string, string> } }) {
  const source = config.sources[name];
  if (source === "env") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
        <Lock size={10} /> aus der .env
      </span>
    );
  }
  if (source === "gespeichert") return <Chip label="gespeichert" color="emerald" dot={false} />;
  return <span className="text-[11px] text-faint">Standard</span>;
}

export function ScannerSettings() {
  const { data: config } = useScanConfig();
  const { save, saving } = useScanSettings();

  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!config) return null;

  const isLocked = (name: ScanSettingName) => config.locked.includes(name);

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveSecrets = async () => {
    const body: Record<string, string> = {};
    if (apiKey.trim()) body.anthropic_api_key = apiKey.trim();
    if (token.trim()) body.scan_token = token.trim();
    if (!Object.keys(body).length) return;
    await save(body);
    setApiKey("");
    setToken("");
    flash();
  };

  return (
    <Card padded={false}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div
          className="chip grid size-9 shrink-0 place-items-center rounded-lg"
          style={{ ["--chip" as string]: colorOf("violet") }}
        >
          <ScanBarcode size={17} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold">Scanner &amp; KI</h2>
          <p className="text-[12px] text-muted">
            Was mit einem unbekannten Barcode passiert – und womit die Scanner-Station sich
            ausweist.
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t border-line px-4 py-4">
        {/* --- Geheimnisse ---------------------------------------------- */}
        <div className="space-y-3">
          <Field
            label="Anthropic API-Key"
            hint={
              isLocked("anthropic_api_key")
                ? "Kommt aus der Umgebung – hier nicht änderbar."
                : config.api_key_set
                  ? `Hinterlegt (${config.api_key_hint}). Ein neuer Wert ersetzt ihn; leeres Feld ändert nichts.`
                  : "Ohne Key läuft der Scan-Eingang ohne Vorbelegung weiter."
            }
          >
            <div className="flex gap-2">
              <input
                type={showSecrets ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                disabled={isLocked("anthropic_api_key")}
                autoComplete="off"
                placeholder={config.api_key_set ? `sk-ant-${config.api_key_hint}` : "sk-ant-…"}
                className={`${inputClass} font-mono disabled:opacity-50`}
              />
              <button
                type="button"
                onClick={() => setShowSecrets((state) => !state)}
                title={showSecrets ? "Verbergen" : "Anzeigen"}
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition hover:bg-raised"
              >
                {showSecrets ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          <div className="-mt-1">
            <Source name="anthropic_api_key" config={config} />
          </div>

          <Field
            label="Scan-Token"
            hint={
              isLocked("scan_token")
                ? "Kommt aus der Umgebung – hier nicht änderbar."
                : config.token_required
                  ? `Gesetzt (${config.scan_token_hint}). Die Station schickt ihn als „Authorization: Bearer …“.`
                  : "Leer = /api/scan-events ist offen wie der Rest der App."
            }
          >
            <input
              type={showSecrets ? "text" : "password"}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              disabled={isLocked("scan_token")}
              autoComplete="off"
              placeholder={config.token_required ? `…${config.scan_token_hint}` : "kein Token"}
              className={`${inputClass} font-mono disabled:opacity-50`}
            />
          </Field>
          <div className="-mt-1 flex items-center justify-between gap-2">
            <Source name="scan_token" config={config} />
            <Button
              variant="primary"
              onClick={saveSecrets}
              disabled={saving || (!apiKey.trim() && !token.trim())}
            >
              {saved ? <Check size={14} /> : null}
              {saved ? "Gespeichert" : "Speichern"}
            </Button>
          </div>
        </div>

        {/* --- Schalter ------------------------------------------------- */}
        <div className="space-y-2 border-t border-line pt-4">
          <label className="flex items-center gap-2.5 text-[13px]">
            <input
              type="checkbox"
              checked={config.lookup_enabled}
              disabled={isLocked("product_lookup")}
              onChange={(event) => save({ product_lookup: event.target.checked }).then(flash)}
              className="size-3.5 accent-[var(--brand)]"
            />
            <span className="flex-1">
              Unbekannte Codes in den offenen Produktdatenbanken nachschlagen
            </span>
            <Source name="product_lookup" config={config} />
          </label>

          <label className="flex items-center gap-2.5 text-[13px]">
            <input
              type="checkbox"
              checked={config.ai_enabled}
              disabled={isLocked("ai_resolver") || !config.api_key_set}
              onChange={(event) => save({ ai_resolver: event.target.checked }).then(flash)}
              className="size-3.5 accent-[var(--brand)]"
            />
            <span className="flex-1">
              Zuordnung von Claude vorschlagen lassen
              {!config.api_key_set && <span className="text-faint"> – braucht einen Key</span>}
            </span>
            <Source name="ai_resolver" config={config} />
          </label>
        </div>

        {/* --- Modell und Schwelle -------------------------------------- */}
        <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <Field label="Modell" hint="Kleinere Modelle antworten schneller.">
            <select
              value={config.ai_model ?? "claude-opus-5"}
              disabled={isLocked("ai_model")}
              onChange={(event) => save({ ai_model: event.target.value }).then(flash)}
              className={`${inputClass} disabled:opacity-50`}
            >
              <option value="claude-opus-5">Claude Opus 5</option>
              <option value="claude-sonnet-5">Claude Sonnet 5</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
            </select>
          </Field>

          <Field
            label={`Ohne Rückfrage buchen ab ${Math.round(config.auto_assign * 100)} %`}
            hint="Darunter wartet der Vorschlag vorbelegt im Scan-Eingang."
          >
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={config.auto_assign}
              disabled={isLocked("ai_auto_assign")}
              onChange={(event) =>
                save({ ai_auto_assign: Number(event.target.value) }).then(flash)
              }
              className="h-9 w-full accent-[var(--brand)] disabled:opacity-50"
            />
          </Field>
        </div>

        <p className="flex items-start gap-2 border-t border-line pt-3 text-[12px] text-muted">
          <TriangleAlert size={13} className="mt-0.5 shrink-0 text-amber-500" />
          <span>
            Homestead hat keine Anmeldung: wer die Adresse erreicht, kann den Key hier
            ersetzen und auf deine Kosten Anfragen auslösen. Der Key selbst wird nie wieder
            ausgegeben – aber halte die App im LAN oder hinter einem Reverse Proxy mit
            Authentifizierung.
          </span>
        </p>
      </div>
    </Card>
  );
}
