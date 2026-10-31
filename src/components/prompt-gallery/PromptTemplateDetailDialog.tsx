'use client';

import { useEffect, type ReactNode } from 'react';
import {
  PromptDetailPanel,
  type PromptDetailItem,
} from '~/components/prompt-gallery/PromptDetailPanel';

export type { PromptDetailItem };

export type PromptTemplateDetailDialogProps = {
  open: boolean;
  item: PromptDetailItem | null;
  locale: string;
  onClose: () => void;
  footerExtra?: ReactNode;
  showGenerate?: boolean;
};

export function PromptTemplateDetailDialog({
  open,
  item,
  locale,
  onClose,
  footerExtra,
  showGenerate = true,
}: PromptTemplateDetailDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="op-template-detail-title"
    >
      <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <PromptDetailPanel
          item={item}
          locale={locale}
          variant="dialog"
          showGenerate={showGenerate}
          footerExtra={footerExtra}
          headerAction={
            <button
              type="button"
              className="rounded-lg bg-white/90 px-3 py-1 text-sm font-semibold text-stone-800"
              onClick={onClose}
            >
              ✕
            </button>
          }
        />
      </div>
    </div>
  );
}

export { templateRecordToDetailItem } from '~/lib/prompts/prompt-detail-item';
