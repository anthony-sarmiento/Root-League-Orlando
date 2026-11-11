import type { FormState } from "@/app/admin/actions";

export function FormMessages({ state }: { state: FormState }) {
  return (
    <>
      {state.errors && state.errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-xl bg-berry/10 px-3 py-2 text-sm font-semibold text-berry">
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {state.ok && (
        <p role="status" className="rounded-xl bg-leaf/30 px-3 py-2 text-sm font-semibold text-moss-deep">
          {state.ok}
        </p>
      )}
    </>
  );
}
