import React, { useRef, useState } from "react";

/**
 * Converts selected files to data URLs and calls onUpload({fileName, fileType, dataUrl}).
 * The original file is never modified — only read.
 */
export default function ProofUploader({ onUpload, label = "Attach proof", disabled }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files) => {
    setBusy(true);
    for (const file of Array.from(files)) {
      if (file.size > 2 * 1024 * 1024) {
        alert(`"${file.name}" is larger than 2MB. Store large files externally and reference them in notes.`);
        continue;
      }
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      onUpload({ fileName: file.name, fileType: file.type, dataUrl });
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button type="button" className="btn secondary" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Reading…" : `📎 ${label}`}
      </button>
    </>
  );
}
