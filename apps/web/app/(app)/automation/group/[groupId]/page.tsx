import { ViewGroup } from "@/app/(app)/automation/group/ViewGroup";
import { Container } from "@/components/Container";

// Not in use anymore. Could delete this.
export default async function GroupPage(props: {
  params: Promise<{ groupId: string }>;
}) {
  const params = await props.params;
  return (
    <div className="mt-4">
      <Container>
        <ViewGroup groupId={params.groupId} />
      </Container>
    </div>
  );
}
