"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Check, Download, FileSpreadsheet, Upload, X } from "lucide-react";

export type CsvField = {
  key: string;
  label: string;
  required?: boolean;
};

type Props = {
  entityLabel: string;
  fields: CsvField[];
  records: Record<string, unknown>[];
  onImport: (rows: Record<string, string>[]) => Promise<unknown>;
  onClose: () => void;
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvCell(value: unknown) {
  const text = value == null ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const content = [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

export function CsvImportExportModal({ entityLabel, fields, records, onImport, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedExportFields, setSelectedExportFields] = useState(fields.map((field) => field.key));
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const mappedRows = useMemo(() => rows.map((row) => Object.fromEntries(Object.entries(mapping)
    .filter(([, target]) => target)
    .map(([source, target]) => [target, row[headers.indexOf(source)] ?? ""]))), [headers, mapping, rows]);

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    const parsed = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
    if (parsed.length < 2) { setError("Choose a CSV with a header row and at least one record."); return; }
    const nextHeaders = parsed[0].map((header, index) => header || `Column ${index + 1}`);
    setHeaders(nextHeaders); setRows(parsed.slice(1));
    const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    setMapping(Object.fromEntries(nextHeaders.map((header) => {
      const matched = fields.find((field) => normalized(field.key) === normalized(header) || normalized(field.label) === normalized(header));
      return [header, matched?.key ?? ""];
    })));
  };

  const runImport = async () => {
    const missing = fields.filter((field) => field.required && !Object.values(mapping).includes(field.key));
    if (missing.length) { setError(`Map ${missing.map((field) => field.label).join(" and ")} before importing.`); return; }
    const duplicateTargets = Object.values(mapping).filter(Boolean).filter((target, index, values) => values.indexOf(target) !== index);
    if (duplicateTargets.length) { setError("Map each CRM field to only one CSV column."); return; }
    const incompleteRow = mappedRows.findIndex((row) => fields.some((field) => field.required && !row[field.key]?.trim()));
    if (incompleteRow >= 0) { setError(`Row ${incompleteRow + 2} is missing a required value.`); return; }
    if (!mappedRows.length) return;
    setImporting(true); setError("");
    try { await onImport(mappedRows); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The import could not be completed. No rows were added."); }
    finally { setImporting(false); }
  };

  const exportFields = fields.filter((field) => selectedExportFields.includes(field.key));
  const toggleExportField = (key: string) => setSelectedExportFields((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);

  return <div className="fixed inset-0 z-50 flex items-end bg-[#1F1612]/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="csv-tools-title">
    <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-[#1F1612]/15 bg-[#FDFBF2] shadow-2xl sm:rounded-3xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#1F1612]/10 bg-[#FDFBF2]/95 px-5 py-5 backdrop-blur sm:px-7">
        <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#B74A26]">Data tools</p><h2 id="csv-tools-title" className="mt-1 font-serif text-2xl font-bold italic text-[#1F1612]">Import or export {entityLabel}</h2><p className="mt-1 text-sm text-[#1F1612]/60">Upload a CSV, choose where each column goes, then import only what you mapped.</p></div>
        <button onClick={onClose} aria-label="Close CSV tools" className="rounded-lg p-2 text-[#1F1612]/55 hover:bg-[#1F1612]/5 hover:text-[#1F1612]"><X className="h-5 w-5" /></button>
      </div>
      <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#1F1612]/12 bg-white/70 p-5">
          <div className="flex items-center gap-2"><span className="rounded-lg bg-[#B74A26]/10 p-2 text-[#B74A26]"><Upload className="h-4 w-4" /></span><h3 className="font-serif text-lg font-bold italic">Import CSV</h3></div>
          <input ref={inputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={chooseFile} />
          <button onClick={() => inputRef.current?.click()} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#B74A26]/40 bg-[#B74A26]/5 px-4 text-xs font-mono font-bold uppercase tracking-wider text-[#9E3D1F] hover:bg-[#B74A26]/10"><FileSpreadsheet className="h-4 w-4" />{headers.length ? "Choose a different file" : "Choose CSV file"}</button>
          {headers.length > 0 && <div className="mt-5 space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-[#1F1612]">Map {headers.length} columns</p><span className="text-xs text-[#1F1612]/50">{rows.length} records</span></div>
            {headers.map((header) => <label key={header} className="grid grid-cols-2 items-center gap-3 text-sm"><span className="truncate text-[#1F1612]/65" title={header}>{header}</span><select value={mapping[header] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))} className="min-h-10 rounded-lg border border-[#1F1612]/15 bg-white px-2 text-sm text-[#1F1612] outline-none focus:ring-2 focus:ring-[#B74A26]/30"><option value="">Do not import</option>{fields.map((field) => <option key={field.key} value={field.key}>{field.label}{field.required ? " (required)" : ""}</option>)}</select></label>)}
            <p className="rounded-lg bg-[#1F1612]/5 px-3 py-2 text-xs leading-5 text-[#1F1612]/60">Required: {fields.filter((field) => field.required).map((field) => field.label).join(", ")}. Unmapped columns are ignored.</p>
            {error && <p role="alert" className="text-sm text-[#9E3D1F]">{error}</p>}
            <button disabled={importing} onClick={runImport} className="min-h-11 w-full rounded-xl bg-[#B74A26] px-4 text-xs font-mono font-bold uppercase tracking-wider text-white hover:bg-[#9E3D1F] disabled:cursor-not-allowed disabled:opacity-60">{importing ? "Importing…" : `Import ${rows.length} ${entityLabel.toLowerCase()}`}</button>
          </div>}
        </section>
        <section className="rounded-2xl border border-[#1F1612]/12 bg-white/70 p-5"><div className="flex items-center gap-2"><span className="rounded-lg bg-[#7A8452]/15 p-2 text-[#536035]"><Download className="h-4 w-4" /></span><h3 className="font-serif text-lg font-bold italic">Export CSV</h3></div><p className="mt-3 text-sm leading-6 text-[#1F1612]/60">Choose the fields your spreadsheet needs, then export the {records.length} current records.</p><div className="mt-4 grid grid-cols-2 gap-2">{fields.map((field) => <label key={field.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#1F1612]/10 px-3 py-2 text-sm text-[#1F1612]/75 hover:bg-[#1F1612]/5"><input type="checkbox" checked={selectedExportFields.includes(field.key)} onChange={() => toggleExportField(field.key)} className="accent-[#B74A26]" />{field.label}</label>)}</div><button disabled={exportFields.length === 0} onClick={() => downloadCsv(`soro-crm-${entityLabel.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, exportFields.map((field) => field.label), records.map((record) => exportFields.map((field) => record[field.key])))} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#7A8452]/35 bg-white px-4 text-xs font-mono font-bold uppercase tracking-wider text-[#536035] hover:bg-[#7A8452]/10 disabled:opacity-60"><Check className="h-4 w-4" />Export selected columns</button></section>
      </div>
    </div>
  </div>;
}
