import { createFileRoute } from "@tanstack/react-router";
import { ProfileBuilder } from "@/components/ProfileBuilder";
export const Route = createFileRoute("/builder-check")({
  component: () => <ProfileBuilder onDone={() => {}} />,
});
