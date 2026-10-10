import { Box } from "@mantine/core";
import { HERO_ART_COLOR } from "../theme/surfaces";

/**
 * Ilustração decorativa do hero (círculos concêntricos, grade de pontos e uma sacola de compras),
 * desenhada em SVG com `currentColor`: acompanha o tema e some gradualmente em direção ao texto.
 * É puramente decorativa: `aria-hidden`, sem foco e sem capturar cliques; oculta em telas estreitas.
 */
export function HeroArt() {
  return (
    <Box
      aria-hidden
      visibleFrom="sm"
      pos="absolute"
      top={0}
      right={0}
      bottom={0}
      w="55%"
      c={HERO_ART_COLOR}
      style={{
        pointerEvents: "none",
        opacity: 0.75,
        maskImage: "linear-gradient(to left, black 30%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to left, black 30%, transparent 100%)",
      }}
    >
      <svg
        viewBox="0 0 440 260"
        width="100%"
        height="100%"
        preserveAspectRatio="xMaxYMid slice"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="340" cy="130" r="64" />
        <circle cx="340" cy="130" r="104" strokeDasharray="3 9" />
        <circle cx="340" cy="130" r="148" opacity="0.6" />
        <circle cx="340" cy="130" r="196" opacity="0.35" />
        {/* sacola */}
        <path d="M312 112h56l6 52a8 8 0 0 1-8 9h-52a8 8 0 0 1-8-9l6-52z" strokeWidth="3" />
        <path d="M326 112v-8a14 14 0 0 1 28 0v8" strokeWidth="3" />
        {/* grade de pontos */}
        <g fill="currentColor" stroke="none" opacity="0.7">
          {Array.from({ length: 5 }, (_, row) =>
            Array.from({ length: 6 }, (_, col) => (
              <circle key={`${row}-${col}`} cx={60 + col * 22} cy={40 + row * 22} r="2.2" />
            )),
          )}
        </g>
      </svg>
    </Box>
  );
}
