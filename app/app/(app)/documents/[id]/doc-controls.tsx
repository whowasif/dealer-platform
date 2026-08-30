"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  verifyDocumentAction,
  deleteDocumentAction,
  type ActionState,
} from "../actions";

// -----------------------------------------------------------------------------
// HQ-only controls on the document detail page: verify and delete. Both are
// server actions that re-check authorization; these are convenience UI only.
// -----------------------------------------------------------------------------

const initialState: ActionState = {};

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
    >
      {pending ? "Verifying…" : "Mark verified"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm("Delete this document and its file? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export function DocControls({
  documentId,
  verified,
}: {
  documentId: string;
  verified: boolean;
}) {
  const [verifyState, verifyAction] = useFormState(
    verifyDocumentAction,
    initialState
  );
  const [deleteState, deleteAction] = useFormState(
    deleteDocumentAction,
    initialState
  );
  const router = useRouter();

  // After a successful delete, return to the library.
  useEffect(() => {
    if (deleteState.success) {
      router.push("/documents");
    }
  }, [deleteState.success, router]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {!verified ? (
          <form action={verifyAction}>
            <input type="hidden" name="document_id" value={documentId} />
            <VerifyButton />
          </form>
        ) : null}
        <form action={deleteAction}>
          <input type="hidden" name="document_id" value={documentId} />
          <DeleteButton />
        </form>
      </div>

      {verifyState.error ? (
        <p role="alert" className="text-sm text-red-700">
          {verifyState.error}
        </p>
      ) : null}
      {verifyState.success ? (
        <p className="text-sm text-green-700">{verifyState.success}</p>
      ) : null}
      {deleteState.error ? (
        <p role="alert" className="text-sm text-red-700">
          {deleteState.error}
        </p>
      ) : null}
    </div>
  );
}
