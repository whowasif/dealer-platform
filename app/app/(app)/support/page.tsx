import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isHQ } from "@/lib/rbac";
import { listHQParticipants, listSupportMessages } from "@/lib/project-workflow";
import { SupportWorkspace } from "./support-workspace";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const actor = await getSessionUser();
  if (!actor) redirect("/login");
  const [messages, hqPeople] = await Promise.all([listSupportMessages(actor), listHQParticipants()]);
  return <div className="mx-auto max-w-4xl space-y-6"><div><h1 className="text-2xl font-bold text-slate-900">Technical support</h1><p className="mt-1 text-sm text-slate-500">Use this channel for system bugs, access problems, and other technical issues.</p></div><SupportWorkspace actorIsHQ={isHQ(actor)} messages={messages} hqPeople={hqPeople} /></div>;
}