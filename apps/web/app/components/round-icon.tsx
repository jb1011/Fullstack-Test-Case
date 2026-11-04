import { Box } from "@chakra-ui/react";
import { useState } from "react";

export function RoundIcon({
  src,
  name,
  size,
  ring = false,
}: {
  src: string | null;
  name: string;
  size: number;
  ring?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const letter = name.trim().slice(0, 1).toUpperCase() || "?";
  const showImage = Boolean(src) && !failed;

  return (
    <Box
      boxSize={String(size) + "px"}
      rounded="full"
      overflow="hidden"
      bg="soft"
      color="muted"
      borderWidth={ring ? "2px" : "0"}
      borderColor="surface"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      fontSize={size <= 16 ? "8px" : "11px"}
      fontWeight="600"
      lineHeight="1"
    >
      {showImage && src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => {
            setFailed(true);
          }}
        />
      ) : (
        letter
      )}
    </Box>
  );
}
