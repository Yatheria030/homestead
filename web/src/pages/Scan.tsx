import { useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode as BarcodeIcon,
  Check,
  ExternalLink,
  Inbox,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PACK_UNITS } from "../components/cells";
import { Button, Card, Chip, EmptyState, Field, Modal, inputClass } from "../components/ui";
import { dateLabel } from "../lib/format";
import {
  useBarcodes,
  useScanActions,
  useScanConfig,
  useScanInbox,
  useSupplies,
  useSupplyLists,
} from "../lib/hooks";
import type { ScanEvent, ScanResult, Supply } from "../types";

/** Was der Eingang vorschlägt, wenn er etwas vorschlägt. */
function suggestionOf(event: ScanEvent) {
  const ai = event.suggestion;
  const raw = event.product;
  return {
    name: ai?.name || raw?.name || "",
    brand: ai?.brand || raw?.brand || "",
    unitsPerPack: ai?.units_per_pack || 0,
    unit: ai?.unit || "",
    matchId: ai?.match_supply_id || 0,
    confidence: ai?.confidence ?? 0,
    listId: ai?.list_id || 0,
    reason: ai?.reason || "",
  };
}

export function Scan({ onMenu }: { onMenu: () => void }) {
  const { data: events = [], isLoading } = useScanInbox();
  const { data: config } = useScanConfig();
  const { data: supplies = [] } = useSupplies();
  const { data: lists = [] } = useSupplyLists();
  const { data: codes = [] } = useBarcodes();
  const actions = useScanActions();

  const [feedback, setFeedback] = useState<ScanResult | null>(null);
  const [creating, setCreating] = useState<ScanEvent | null>(null);
  const [showCodes, setShowCodes] = useState(false);

  const live = useMemo(
    () => supplies.filter((item) => !item.is_trashed && item.active),
    [supplies],
  );

  return (
    <>
      <PageHeader
        title="Scan-Eingang"
        subtitle="Gescannte Codes, die noch eine Entscheidung brauchen"
        onMenu={onMenu}
        actions={
          codes.length > 0 && (
            <Button onClick={() => setShowCodes((open) => !open)}>
              <BarcodeIcon size={14} />
              {codes.length} zugeordnet
            </Button>
          )
        }
      />

      <div className="space-y-4 p-4">
        <ScanBox
          onScan={async (ean) => setFeedback(await actions.scan(ean))}
          busy={actions.scanning}
          feedback={feedback}
        />

        {config && (
          <p className="text-[12px] text-faint">
            {config.lookup_enabled
              ? "Unbekannte Codes werden in den offenen Produktdatenbanken nachgeschlagen."
              : "Produktsuche ist abgeschaltet – unbekannte Codes kommen ohne Vorbelegung hier an."}{" "}
            {config.ai_enabled
              ? `Die Zuordnung schlägt ${config.ai_model} vor; ab ${Math.round(
                  config.auto_assign * 100,
                )} % Sicherheit wird ohne Rückfrage gebucht.`
              : "Der KI-Schritt ist aus (kein ANTHROPIC_API_KEY) – Zuordnung von Hand."}
          </p>
        )}

        {isLoading && (
          <Card>
            <EmptyState title="Lädt…" />
          </Card>
        )}

        {!isLoading && events.length === 0 && (
          <Card>
            <EmptyState
              title="Nichts offen"
              hint="Bekannte Codes werden direkt verbucht und landen gar nicht hier."
            />
          </Card>
        )}

        <div className="space-y-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              supplies={live}
              onAssign={(supplyId, packs) => actions.assign(event.id, supplyId, packs)}
              onCreate={() => setCreating(event)}
              onDismiss={() => actions.dismiss(event.id)}
            />
          ))}
        </div>

        {showCodes && (
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3">
              <BarcodeIcon size={15} className="text-faint" />
              <h2 className="text-[14px] font-semibold">Zugeordnete Codes</h2>
              <span className="text-[12px] text-faint">
                Diese EANs werden ohne Umweg verbucht
              </span>
            </div>
            <div className="border-t border-line">
              {codes.map((code) => (
                <div
                  key={code.ean}
                  className="flex items-center gap-3 border-b border-line-soft px-4 py-2 last:border-0"
                >
                  <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">
                    {code.ean}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                    {code.supply_name ?? "—"}
                  </span>
                  <span className="hidden truncate text-[12px] text-faint sm:block">
                    {code.label}
                  </span>
                  <Chip
                    label={code.source === "ai" ? "KI" : "manuell"}
                    color={code.source === "ai" ? "violet" : "slate"}
                    dot={false}
                  />
                  <Button variant="danger" onClick={() => actions.forget(code.ean)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {creating && (
        <CreateModal
          event={creating}
          lists={lists}
          onClose={() => setCreating(null)}
          onSave={(body) => {
            actions.create(creating.id, body);
            setCreating(null);
          }}
        />
      )}
    </>
  );
}

/** Eingabefeld für den Scanner. Ein Handscanner „tippt“ die Ziffern und drückt
 *  Enter – das Feld hält deshalb den Fokus, damit jeder Scan hier landet. */
function ScanBox({
  onScan,
  busy,
  feedback,
}: {
  onScan: (ean: string) => Promise<void>;
  busy: boolean;
  feedback: ScanResult | null;
}) {
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, [feedback]);

  const submit = async (event?: React.SyntheticEvent) => {
    event?.preventDefault();
    const ean = value.trim();
    if (!ean) return;
    setValue("");
    await onScan(ean);
  };

  /** Ein Handscanner tippt den Code und haengt Enter an. Darauf hier direkt zu
   *  hoeren ist verlaesslicher als das implizite Absenden des Formulars - das
   *  bleibt bei manchen Geraeten und Tastatur-Emulationen einfach aus. */
  const onKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") submit(event);
  };

  const tone =
    feedback?.status === "booked"
      ? "text-emerald-600 dark:text-emerald-400"
      : feedback?.status === "error"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted";

  return (
    <Card>
      <form onSubmit={submit}>
        <span className="mb-1 block text-[12px] font-medium text-muted">
          Code scannen oder eintippen
        </span>
        <div className="flex items-center gap-2">
          <input
            ref={input}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKey}
            inputMode="numeric"
            autoComplete="off"
            placeholder="4008400202167"
            className={`${inputClass} font-mono tabular-nums`}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !value.trim()}
            className="h-9 shrink-0"
          >
            <BarcodeIcon size={14} />
            Scannen
          </Button>
        </div>
        <span className="mt-1 block text-[11px] text-faint">
          Enter bucht den Scan – ein Handscanner tippt den Code und drückt selbst Enter.
        </span>
      </form>

      {feedback && (
        <p className={`mt-2 text-[13px] ${tone}`}>
          {feedback.status === "booked" && (
            <>
              <Check size={13} className="mr-1 inline" />
              {feedback.packs}× <strong>{feedback.supply_name}</strong> verbucht.
            </>
          )}
          {feedback.status === "pending" && (
            <>
              <Inbox size={13} className="mr-1 inline" />
              {feedback.ean} liegt im Eingang.{feedback.message ? ` ${feedback.message}` : ""}
            </>
          )}
          {feedback.status === "error" && <>{feedback.message}</>}
        </p>
      )}
    </Card>
  );
}

function EventCard({
  event,
  supplies,
  onAssign,
  onCreate,
  onDismiss,
}: {
  event: ScanEvent;
  supplies: Supply[];
  onAssign: (supplyId: number, packs: number) => void;
  onCreate: () => void;
  onDismiss: () => void;
}) {
  const guess = suggestionOf(event);
  const [supplyId, setSupplyId] = useState(guess.matchId);
  const [packs, setPacks] = useState(event.packs);

  const percent = Math.round(guess.confidence * 100);
  const title = [guess.brand, guess.name].filter(Boolean).join(" ") || "Unbekanntes Produkt";

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="font-mono text-[12px] tabular-nums text-muted">{event.ean}</span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{title}</span>
        <Chip label={`${packs}×`} color="indigo" dot={false} />
        <span className="text-[12px] text-faint">
          {dateLabel(event.scanned_at)}
          {event.device ? ` · ${event.device}` : ""}
        </span>
      </div>

      {(event.product || guess.unitsPerPack > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 py-2 text-[12px] text-muted">
          {guess.unitsPerPack > 0 && (
            <span>
              Inhalt {guess.unitsPerPack} {guess.unit}
            </span>
          )}
          {event.product?.quantity && <span>laut Datenbank „{event.product.quantity}“</span>}
          {event.product && (
            <a
              href={event.product.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-brand"
            >
              {event.product.database} <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}

      {guess.reason && (
        <div className="flex items-start gap-2 border-t border-line px-4 py-2">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-violet-500" />
          <p className="text-[12px] text-muted">
            {guess.reason}
            {guess.matchId > 0 && (
              <span className="ml-1 text-faint">({percent} % sicher)</span>
            )}
          </p>
        </div>
      )}

      {event.note && (
        <p className="border-t border-line px-4 py-2 text-[12px] text-amber-600 dark:text-amber-400">
          {event.note}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-raised px-4 py-2.5">
        {/* Breiten sitzen auf den Wrappern: eine zweite w-* Klasse am Input
            selbst verliert gegen das w-full aus inputClass. */}
        <div className="min-w-[12rem] flex-1">
          <select
            value={supplyId}
            onChange={(event) => setSupplyId(Number(event.target.value))}
            className={`${inputClass} h-8`}
          >
            <option value={0}>Artikel wählen…</option>
            {supplies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.supply_list ? ` · ${item.supply_list.name}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="w-20 shrink-0">
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={packs}
            onChange={(event) => setPacks(Number(event.target.value))}
            title="Packungen"
            className={`${inputClass} h-8 tabular-nums`}
          />
        </div>

        <Button
          variant="primary"
          disabled={!supplyId}
          onClick={() => onAssign(supplyId, packs)}
          title="Kauf verbuchen und die EAN künftig direkt erkennen"
        >
          <Check size={14} />
          Zuordnen
        </Button>
        <Button onClick={onCreate}>
          <Plus size={14} />
          Neu anlegen
        </Button>
        <Button variant="subtle" onClick={onDismiss} title="Verwerfen">
          <X size={14} />
        </Button>
      </div>
    </Card>
  );
}

function CreateModal({
  event,
  lists,
  onClose,
  onSave,
}: {
  event: ScanEvent;
  lists: { id: number; name: string }[];
  onClose: () => void;
  onSave: (body: Partial<Supply> & { packs?: number }) => void;
}) {
  const guess = suggestionOf(event);
  const [name, setName] = useState(guess.name);
  const [listId, setListId] = useState(guess.listId);
  const [unitsPerPack, setUnitsPerPack] = useState(guess.unitsPerPack || 0);
  const [unit, setUnit] = useState(guess.unit || "Stück");
  const [daysPerPack, setDaysPerPack] = useState(0);
  const [price, setPrice] = useState(0);
  const [vendor, setVendor] = useState("");
  const [packs, setPacks] = useState(event.packs);

  return (
    <Modal
      open
      title="Neuer Artikel aus dem Scan"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button
            variant="primary"
            disabled={!name.trim()}
            onClick={() =>
              onSave({
                name: name.trim(),
                list_id: listId || null,
                units_per_pack: unitsPerPack || null,
                unit: unit || null,
                days_per_pack: daysPerPack || null,
                price: price || null,
                vendor: vendor.trim() || null,
                packs,
              })
            }
          >
            Anlegen und buchen
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Liste">
            <select
              value={listId}
              onChange={(event) => setListId(Number(event.target.value))}
              className={inputClass}
            >
              <option value={0}>ohne Liste</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Anbieter">
            <input
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Inhalt">
            <input
              type="number"
              min={0}
              step="any"
              value={unitsPerPack || ""}
              onChange={(event) => setUnitsPerPack(Number(event.target.value))}
              className={`${inputClass} tabular-nums`}
            />
          </Field>
          <Field label="Einheit">
            <select
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              className={inputClass}
            >
              {(PACK_UNITS.includes(unit) || !unit ? PACK_UNITS : [unit, ...PACK_UNITS]).map(
                (option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Packungen">
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={packs}
              onChange={(event) => setPacks(Number(event.target.value))}
              className={`${inputClass} tabular-nums`}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Haltbarkeit (Tage)"
            hint="Nur die erste grobe Schätzung – ab dem zweiten Kauf misst Homestead selbst."
          >
            <input
              type="number"
              min={0}
              value={daysPerPack || ""}
              onChange={(event) => setDaysPerPack(Number(event.target.value))}
              className={`${inputClass} tabular-nums`}
            />
          </Field>
          <Field label="Preis je Packung">
            <input
              type="number"
              min={0}
              step="0.01"
              value={price || ""}
              onChange={(event) => setPrice(Number(event.target.value))}
              className={`${inputClass} tabular-nums`}
            />
          </Field>
        </div>

        <p className="text-[12px] text-faint">
          Der Code {event.ean} wird dem neuen Artikel zugeordnet – der nächste Scan bucht
          dann ohne Rückfrage.
        </p>
      </div>
    </Modal>
  );
}
