import { Button, Heading, Stack, Text } from "@chakra-ui/react";
import { isRouteErrorResponse, useNavigate, useRevalidator, useRouteError } from "react-router";

const messageOf = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    if (typeof error.data === "string" && error.data) return error.data;
    if (error.status === 404) return "This page does not exist.";
  }
  return "The list could not be loaded.";
};

export function ListErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();

  return (
    <Stack gap="4" padding="6">
      <Heading as="h1" size="xl">
        Something went wrong
      </Heading>
      <Text>{messageOf(error)}</Text>
      <Stack direction="row" gap="3">
        <Button
          onClick={() => {
            void revalidate();
          }}
        >
          Try again
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            void navigate("/");
          }}
        >
          Default list
        </Button>
      </Stack>
    </Stack>
  );
}
