import type { CSSProperties } from "react";
import { CitationChip } from "./CitationChip";
import { SourcePanel } from "./SourcePanel";
import { type SourceAuthority } from "./answer-types";
import styles from "./answer.module.css";

/**
 * The "Authorities used" chip row. When `inlineSource` is set, the active
 * authority's source panel renders inline below the chips (landing + mobile);
 * on desktop workspace the source lives in a separate sticky rail instead.
 */
export function AuthoritiesUsed({
  authorities,
  order,
  activeId,
  onOpen,
  onClose,
  head,
  inlineSource = false,
  style,
}: {
  authorities: Record<string, SourceAuthority>;
  order: ReadonlyArray<string>;
  activeId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
  head: string;
  inlineSource?: boolean;
  style?: CSSProperties;
}) {
  const active = activeId ? authorities[activeId] : undefined;
  return (
    <div className={styles.authRow} style={style}>
      <div className={styles.authHead}>{head}</div>
      <div className={styles.authChips}>
        {order.map((id) => {
          const a = authorities[id];
          if (!a) return null;
          return <CitationChip key={id} authority={a} active={activeId === id} onClick={() => onOpen(id)} />;
        })}
      </div>
      {inlineSource && active ? (
        <div className={styles.authSource}>
          <SourcePanel variant="inline" authority={active} onClose={onClose} />
        </div>
      ) : null}
    </div>
  );
}
