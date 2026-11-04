import geistSans from "../../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2?url";
import geistMono from "../../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2?url";

const face = (family: string, href: string) =>
  `@font-face{font-family:"${family}";src:url("${href}") format("woff2");font-weight:100 900;font-style:normal;font-display:swap;}`;

export const fontFaces = `${face("Geist", geistSans)}${face("Geist Mono", geistMono)}body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}`;

export const fontLinks = [
  {
    rel: "preload" as const,
    href: geistSans,
    as: "font" as const,
    type: "font/woff2",
    crossOrigin: "anonymous" as const,
  },
  {
    rel: "preload" as const,
    href: geistMono,
    as: "font" as const,
    type: "font/woff2",
    crossOrigin: "anonymous" as const,
  },
];
