"use client";

import { withdrawReport } from "@/app/report/actions";

/** Takes back a report that hasn't been reviewed yet, after a confirmation. */
export function WithdrawReportButton({ reportId }: { reportId: string }) {
  return (
    <form
      action={withdrawReport}
      onSubmit={(e) => {
        if (!window.confirm("Withdraw this report? An organizer will no longer see it.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="reportId" value={reportId} />
      <button type="submit" className="btn danger">
        Withdraw
      </button>
    </form>
  );
}
