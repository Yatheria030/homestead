import { useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Download,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { Button, Card, Chip, EmptyState, Modal, inputClass } from "./ui";
import { api } from "../lib/api";
import { useBackupActions, useBackups } from "../lib/hooks";
import type { BackupInfo } from "../types";

const KIND_COLOR: Record<string, string> = {
  manual: "indigo",
  auto: "slate",
  pre: "amber",
  import: "violet",
};

const size = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const when = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );

export function Backups() {
  const { data: backups = [], isLoading } = useBackups();
  const actions = useBackupActions();
  const fileInput = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState<BackupInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const doRestore = () => {
    if (!confirming) return;
    const name = confirming.name;
    setConfirming(null);
    actions.restore.mutate(name, {
      onSuccess: (result) =>
        setMessage(
          `„${name}“ wurde zurückgespielt. Der vorherige Stand liegt als „${result.safety_snapshot}“ bereit.`,
        ),
      onError: (error) => setMessage(`Fehlgeschlagen: ${String(error)}`),
    });
  };

  return (
    <>
      <Card padded={false}>
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div>
            <h2 className="text-[14px] font-semibold">Backups &amp; Snapshots</h2>
            <p className="text-[12px] text-muted">
              Ein Snapshot ist eine vollständige Kopie der Datenbank. Automatisch täglich,
              zusätzlich jederzeit von Hand – und vor jedem Zurückspielen legt die App
              sicherheitshalber noch einen an.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Notiz (optional)"
              className={`${inputClass} w-44`}
            />
            <Button
              variant="primary"
              onClick={() => {
                actions.create.mutate(note || undefined);
                setNote("");
              }}
              disabled={actions.create.isPending}
            >
              <Archive size={14} /> Snapshot
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".db,.sqlite,.sqlite3,application/x-sqlite3"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file)
                  actions.upload.mutate(file, {
                    onError: (error) => setMessage(`Upload abgelehnt: ${String(error)}`),
                  });
                event.target.value = "";
              }}
            />
            <Button onClick={() => fileInput.current?.click()} disabled={actions.upload.isPending}>
              <Upload size={14} /> Datei einspielen
            </Button>
          </div>
        </div>

        {message && (
          <div className="mx-4 mb-3 rounded-lg border border-line bg-raised px-3 py-2 text-[12px]">
            {message}{" "}
            <button onClick={() => setMessage(null)} className="ml-1 text-brand hover:underline">
              ok
            </button>
          </div>
        )}

        <div className="border-t border-line">
          {isLoading && <EmptyState title="Lädt…" />}
          {!isLoading && backups.length === 0 && (
            <EmptyState
              title="Noch keine Snapshots"
              hint="Der erste automatische läuft beim Start, oder leg jetzt einen von Hand an."
            />
          )}
          {backups.map((item) => (
            <div
              key={item.name}
              className="group flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-soft px-4 py-2.5 last:border-0 hover:bg-raised"
            >
              <Chip label={item.kind_label} color={KIND_COLOR[item.kind] ?? "slate"} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">{when(item.created_at)}</div>
                <div className="truncate text-[12px] text-muted">
                  {item.note ?? item.name} · {size(item.size)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={api.backupDownloadUrl(item.name)}
                  download
                  title="Herunterladen"
                  className="grid size-7 place-items-center rounded-md text-faint transition hover:bg-line-soft hover:text-ink"
                >
                  <Download size={14} />
                </a>
                <button
                  onClick={() => setConfirming(item)}
                  title="Diesen Stand wiederherstellen"
                  className="grid size-7 place-items-center rounded-md text-faint transition hover:bg-amber-500/10 hover:text-amber-600"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => actions.remove.mutate(item.name)}
                  title="Snapshot löschen"
                  className="grid size-7 place-items-center rounded-md text-faint opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={confirming !== null}
        title="Stand wiederherstellen?"
        onClose={() => setConfirming(null)}
        footer={
          <>
            <Button onClick={() => setConfirming(null)}>Abbrechen</Button>
            <Button variant="primary" onClick={doRestore}>
              <RotateCcw size={14} /> Zurückspielen
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="text-[13px] text-muted">
            <p>
              Der aktuelle Datenbestand wird durch den Snapshot vom{" "}
              <span className="font-medium text-ink">
                {confirming && when(confirming.created_at)}
              </span>{" "}
              ersetzt. Alles, was seitdem eingetragen wurde, ist danach weg.
            </p>
            <p className="mt-2">
              Vorher legt die App automatisch einen Snapshot des jetzigen Stands an – du
              kannst also zurück.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
