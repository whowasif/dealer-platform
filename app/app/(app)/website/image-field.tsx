"use client";

import { useState } from "react";
import { previewUrl } from "./preview-url";

// Shared image chooser for website cards. Lets the admin either upload a file
// (posted as `image_file`) or keep/paste an image reference (posted as
// `image_ref` — an existing "/uploads/.." path or an external http(s) URL).
// Shows a live preview of whichever is chosen.
export function ImageField({
  currentRef,
  label = "Photo",
}: {
  currentRef?: string;
  label?: string;
}) {
  const [ref, setRef] = useState(currentRef ?? "");
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const preview = filePreview ?? (ref.trim() ? previewUrl(ref) : null);

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex flex-wrap items-start gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className="h-20 w-28 shrink-0 rounded-md border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">
            No image
          </div>
        )}
        <div className="min-w-[200px] flex-1 space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">
              Upload a new photo
            </span>
            <input
              name="image_file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const url = URL.createObjectURL(f);
                  setFilePreview(url);
                } else {
                  setFilePreview(null);
                }
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">
              …or use an image URL / existing path
            </span>
            <input
              name="image_ref"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="/uploads/… or https://…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <p className="text-xs text-slate-400">
            Uploading a file replaces the URL. Max 6&nbsp;MB (JPG, PNG, WEBP,
            GIF, AVIF).
          </p>
        </div>
      </div>
    </div>
  );
}
