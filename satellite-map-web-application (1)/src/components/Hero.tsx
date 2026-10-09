interface Props {
  hidden: boolean;
}

export default function Hero({ hidden }: Props) {
  return (
    <div
      className={
        "max-w-[420px] overflow-hidden transition-all duration-700 ease-out md:order-1 md:overflow-visible " +
        (hidden
          ? "pointer-events-none max-h-0 -translate-x-6 opacity-0 md:max-h-none"
          : "max-h-[260px] translate-x-0 opacity-100 md:max-h-none")
      }
    >
      <div className="mb-2.5 flex items-center gap-3 text-[11px] font-bold tracking-[0.21em] text-sun uppercase md:mb-5 md:tracking-[0.22em]">
        <span className="h-px w-6 bg-sun" />
        Atlasia keşif haritası
      </div>
      <h1 className="font-display text-[clamp(38px,10.4vw,48px)] leading-[0.99] font-bold tracking-[-0.045em] drop-shadow-[0_2px_18px_rgba(2,21,18,0.9)] md:text-[60px] md:leading-[0.98] md:tracking-[-0.03em]">
        <span className="block text-mint">Dünyayı</span>
        <span className="block text-sun">merakınla</span>
        <span className="block text-white">keşfet.</span>
      </h1>
      <p className="mt-2.5 max-w-[335px] text-[13px] leading-[1.45] text-mint/85 md:mt-4 md:text-[14px] md:leading-relaxed md:text-mint/75">
        Yolunu harita çizsin, gittiğin yerin hikâyesini gezginler anlatsın.
      </p>
    </div>
  );
}
