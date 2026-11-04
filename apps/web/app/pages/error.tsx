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

const opportunityMessage = (error: unknown) => {
  if (isRouteErrorResponse(error) && typeof error.data === "string" && error.data)
    return error.data;
  if (isRouteErrorResponse(error) && error.status === 404)
    return "This opportunity does not exist.";
  return "The opportunity could not be loaded.";
};

export function OpportunityErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const missing = isRouteErrorResponse(error) && error.status === 404;

  return (
    <Stack gap="4" padding="6">
      <Heading as="h1" size="xl">
        {missing ? "Opportunity not found" : "Something went wrong"}
      </Heading>
      <Text>{opportunityMessage(error)}</Text>
      <Stack direction="row" gap="3">
        {missing ? null : (
          <Button
            onClick={() => {
              void revalidate();
            }}
          >
            Try again
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            void navigate("/");
          }}
        >
          Opportunities
        </Button>
      </Stack>
    </Stack>
  );
}
