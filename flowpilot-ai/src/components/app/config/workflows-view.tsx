"use client";

import { Lock } from "lucide-react";
import { useT } from "@/i18n/client";
import { workflowsDict } from "@/i18n/ui/config";
import { PageHeader } from "../../ui/card";
import { Callout } from "../../ui/feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { RulesTab } from "./rules-tab";
import { TemplatesTab } from "./templates-tab";
import type { WorkflowsPageData } from "./types";
import { WorkflowsTab } from "./workflow-builder";

export function WorkflowsView({
  data,
  canEditWorkflows,
  canEditRules,
  industry,
  isDemo,
  initialTab,
  initialWorkflowId,
}: {
  data: WorkflowsPageData;
  canEditWorkflows: boolean;
  canEditRules: boolean;
  industry: string;
  isDemo: boolean;
  initialTab: "workflows" | "rules" | "templates";
  initialWorkflowId: string | null;
}) {
  const t = useT(workflowsDict);
  return (
    <div>
      <PageHeader title={t.title} description={t.description} />
      {!canEditWorkflows && (
        <Callout tone="neutral" icon={<Lock className="size-4 text-slate-500" />} className="mb-4">
          {t.readOnly}
        </Callout>
      )}
      <Tabs defaultValue={initialTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="workflows" count={data.workflows.length}>
            {t.tabs.workflows}
          </TabsTrigger>
          <TabsTrigger value="rules" count={data.rules.length}>
            {t.tabs.rules}
          </TabsTrigger>
          <TabsTrigger value="templates">{t.tabs.templates}</TabsTrigger>
        </TabsList>
        <TabsContent value="workflows">
          <WorkflowsTab workflows={data.workflows} rules={data.rules} sampleDocs={data.sampleDocs} canEdit={canEditWorkflows} initialWorkflowId={initialWorkflowId} />
        </TabsContent>
        <TabsContent value="rules">
          <RulesTab rules={data.rules} canEdit={canEditRules} />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab industry={industry} isDemo={isDemo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
