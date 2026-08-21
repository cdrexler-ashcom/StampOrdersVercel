import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";

/**
 * Makes a whole table row tappable as a drill-down link (feature 3), for both mouse and touch,
 * with hover + keyboard support.
 *
 * Spread the returned props onto a `<tr>`:
 *
 *   const rowLink = useRowLink();
 *   <tr key={o.id} {...rowLink(`/orders/${o.id}`)}> … </tr>
 *
 * A click/Enter/Space anywhere on the row navigates — EXCEPT when it originates on an interactive
 * element inside the row (a link, button, input, select, textarea, label, or anything marked
 * `data-no-rownav`), so per-row action buttons and links keep working. The row is exposed as a
 * link to assistive tech (role="link", tabbable).
 */
const INTERACTIVE = "a,button,input,select,textarea,label,[role='button'],[data-no-rownav]";

export function useRowLink() {
  const router = useRouter();

  return (href: string) => ({
    role: "link" as const,
    tabIndex: 0,
    "aria-label": "Open",
    className:
      "cursor-pointer transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-500",
    onClick: (event: MouseEvent<HTMLTableRowElement>) => {
      if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
      router.push(href);
    },
    onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
      event.preventDefault();
      router.push(href);
    },
  });
}
