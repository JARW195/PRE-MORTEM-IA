"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileArchive,
  FileImage,
  FileType2,
  FolderUp,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/premortem/format";

export interface UploadItem {
  id: string;
  file: File;
}

const ACCEPTED_HINT =
  "Texto, código, PDF, DOCX, XLSX, CSV, ZIP, imágenes. Hasta 40 archivos / 80 MB.";

function categoryIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (
    ["pdf"].includes(ext)
  )
    return <FileType2 className="size-4 text-red-400" />;
  if (["docx", "doc"].includes(ext))
    return <FileText className="size-4 text-sky-300" />;
  if (["xlsx", "xls", "csv", "ods"].includes(ext))
    return <FileSpreadsheet className="size-4 text-emerald-400" />;
  if (["zip"].includes(ext))
    return <FileArchive className="size-4 text-amber-400" />;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext))
    return <FileImage className="size-4 text-purple-300" />;
  if (
    [
      "js","mjs","cjs","ts","tsx","jsx","py","go","rs","java","c","cpp","rb",
      "php","sh","sql","tf","kt","swift","vue","svelte","html","css",
    ].includes(ext)
  )
    return <FileCode2 className="size-4 text-amber-300" />;
  return <FileText className="size-4 text-muted-foreground" />;
}

interface FileUploadProps {
  items: UploadItem[];
  onAdd: (items: UploadItem[]) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function FileUpload({
  items,
  onAdd,
  onRemove,
  onClear,
  disabled,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const handleFiles = React.useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const newItems: UploadItem[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        // webkitRelativePath for folder uploads; fall back to name
        const rel =
          (f as File & { webkitRelativePath?: string }).webkitRelativePath ||
          f.name;
        newItems.push({
          id: `${Date.now()}-${i}-${f.name}-${f.size}`,
          file: new File([f], rel, { type: f.type }),
        });
      }
      onAdd(newItems);
    },
    [onAdd]
  );

  const onDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles, disabled]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const totalBytes = items.reduce((a, x) => a + x.file.size, 0);

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragging
            ? "border-amber-500 bg-amber-500/10"
            : "border-border/60 bg-muted/20 hover:border-amber-500/50 hover:bg-muted/30",
          disabled && "cursor-not-allowed opacity-50"
        )}
        aria-label="Subir archivos del proyecto"
      >
        <Upload
          className={cn(
            "size-6 transition-colors",
            dragging ? "text-amber-400" : "text-muted-foreground"
          )}
        />
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            Arrastra archivos aquí o haz clic para seleccionar
          </p>
          <p className="text-xs text-muted-foreground">{ACCEPTED_HINT}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          disabled={disabled}
          onClick={() => folderInputRef.current?.click()}
        >
          <FolderUp className="size-3.5" />
          Subir carpeta
        </Button>
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-expect-error webkitdirectory is a non-standard but widely supported attribute
          webkitdirectory=""
          directory=""
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {items.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">
              {items.length} archivo{items.length === 1 ? "" : "s"} ·{" "}
              {formatSize(totalBytes)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto h-7 gap-1 text-xs text-muted-foreground hover:text-red-400"
              disabled={disabled}
              onClick={onClear}
            >
              <X className="size-3" />
              Quitar todos
            </Button>
          </>
        )}
      </div>

      <AnimatePresence initial={false}>
        {items.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="max-h-56 space-y-1 overflow-y-auto premortem-scroll pr-1"
          >
            {items.map((item) => {
              const name = item.file.name;
              return (
                <li
                  key={item.id}
                  className="group flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5"
                >
                  <span className="shrink-0">{categoryIcon(name)}</span>
                  <span
                    className="min-w-0 flex-1 truncate text-xs text-foreground/80"
                    title={name}
                  >
                    {name}
                  </span>
                  <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                    {formatSize(item.file.size)}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemove(item.id)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-red-400 disabled:opacity-30"
                    aria-label={`Quitar ${name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
