import { createFileRoute } from "@tanstack/react-router";
import { ProfileBuilder } from "@/components/ProfileBuilder";
export const Route = createFileRoute("/__builder-check")({
  component: () => <ProfileBuilder onDone={() => {}} />,
});
