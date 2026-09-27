'use client';

import {
  LOB_LETTER_PAGE,
  LOB_POSTCARD_ARTBOARD,
  postcardBackAddressZone,
  type LobPostcardSize,
} from '@/lib/mail/lob';

type LetterPreviewProps = {
  kind: 'letter';
  /** Lob-ready letter HTML (srcDoc) */
  html: string;
  className?: string;
};

type PostcardPreviewProps = {
  kind: 'postcard';
  size: LobPostcardSize;
  side: 'front' | 'back';
  /** Image URL or Lob-ready HTML */
  src?: string | null;
  html?: string | null;
  className?: string;
};

export type MailPrintPreviewProps = LetterPreviewProps | PostcardPreviewProps;

/** Print-scaled preview with Lob safe-zone overlays. */
export function MailPrintPreview(props: MailPrintPreviewProps) {
  if (props.kind === 'letter') {
    const L = LOB_LETTER_PAGE;
    const aspect = L.widthIn / L.heightIn;
    const aw = L.addressWindow;
    return (
      <div className={props.className}>
        <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1">
          Letter preview · red = Lob address window (keep clear)
        </p>
        <div
          className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded border border-slate-200 bg-white shadow-sm"
          style={{ aspectRatio: `${aspect}` }}
        >
          <iframe
            title="Letter print preview"
            sandbox=""
            srcDoc={props.html}
            className="absolute inset-0 h-full w-full border-0 bg-white"
          />
          <div
            className="pointer-events-none absolute border-2 border-red-500/80 bg-red-500/15"
            style={{
              left: `${(aw.leftIn / L.widthIn) * 100}%`,
              top: `${(aw.topIn / L.heightIn) * 100}%`,
              width: `${(aw.widthIn / L.widthIn) * 100}%`,
              height: `${(aw.heightIn / L.heightIn) * 100}%`,
            }}
            title="Lob address / barcode window"
          />
        </div>
      </div>
    );
  }

  const art = LOB_POSTCARD_ARTBOARD[props.size];
  const aspect = art.widthIn / art.heightIn;
  const zone = postcardBackAddressZone(props.size);
  const isImage = Boolean(props.src && !props.html);
  const isPdf = Boolean(props.src && /\.pdf(\?|$)/i.test(props.src));

  return (
    <div className={props.className}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1">
        {props.side === 'front' ? 'Front' : 'Back'} · {art.label}
        {props.side === 'back' ? ' · red = address zone' : ''}
      </p>
      <div
        className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded border border-slate-200 bg-slate-100 shadow-sm"
        style={{ aspectRatio: `${aspect}` }}
      >
        {props.html ? (
          <iframe
            title={`${props.side} postcard preview`}
            sandbox=""
            srcDoc={props.html}
            className="absolute inset-0 h-full w-full border-0 bg-white"
          />
        ) : isPdf && props.src ? (
          <a
            href={props.src}
            target="_blank"
            rel="noreferrer"
            className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-emerald-800 underline"
          >
            Open {props.side} PDF
          </a>
        ) : isImage && props.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.src}
            alt={`${props.side} design`}
            className="absolute inset-0 h-full w-full object-contain bg-white"
          />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">No preview</p>
        )}
        {props.side === 'back' && (
          <div
            className="pointer-events-none absolute border-2 border-red-500/80 bg-red-500/20"
            style={{
              right: `${(zone.rightIn / art.widthIn) * 100}%`,
              bottom: `${(zone.bottomIn / art.heightIn) * 100}%`,
              width: `${(zone.widthIn / art.widthIn) * 100}%`,
              height: `${(zone.heightIn / art.heightIn) * 100}%`,
            }}
            title="Lob ink-free address / postage zone"
          />
        )}
        {/* bleed hint */}
        <div className="pointer-events-none absolute inset-[2%] rounded-sm border border-dashed border-amber-400/50" />
      </div>
    </div>
  );
}
