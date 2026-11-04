import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import createEmotionServer from "@emotion/server/create-instance";
import { CacheProvider } from "@emotion/react";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createEmotionCache } from "../emotion";
import Home from "./home";

const shell = () => {
  const cache = createEmotionCache();
  const tree = (
    <CacheProvider value={cache}>
      <ChakraProvider value={defaultSystem}>
        <Home />
      </ChakraProvider>
    </CacheProvider>
  );
  return { cache, tree };
};

describe("Home", () => {
  it("renders the page title", () => {
    render(shell().tree);
    expect(screen.getByRole("heading", { level: 1, name: "Opportunities" })).toBeTruthy();
  });

  it("includes Chakra styles in the server HTML", () => {
    const { cache, tree } = shell();
    const html = renderToString(tree);
    const styles = createEmotionServer(cache).extractCriticalToChunks(html);

    expect(html).toContain("Opportunities");
    expect(styles.styles.length).toBeGreaterThan(0);
  });
});
