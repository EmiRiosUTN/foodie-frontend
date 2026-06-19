import { ChatModulePage } from "../../../../../components/chat/chat-module-page";

export default async function Page({ params }: { params: Promise<{ moduleKey: string }> }) {
  const { moduleKey } = await params;
  return <ChatModulePage moduleKey={moduleKey} />;
}
