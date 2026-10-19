import type { Metadata } from "next";
import { TaskList } from "@/components/app/ops/task-list";
import { requireSession } from "@/server/auth/session";
import { getTasks } from "@/server/services/queries";

export const metadata: Metadata = { title: "Aufgaben" };

export default async function TasksPage() {
  const s = await requireSession();
  const tasks = await getTasks(s);
  return (
    <TaskList
      tasks={tasks}
      users={s.users.map((u) => ({ id: u.id, name: u.name }))}
      currentUserId={s.user.id}
      canManage={s.can("tasks.manage")}
    />
  );
}
