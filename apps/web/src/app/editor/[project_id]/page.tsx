"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { MediaPanel } from "@/components/editor/media-panel";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { Timeline } from "@/components/editor/timeline";
import { PreviewPanel } from "@/components/editor/preview-panel";
import { EditorHeader } from "@/components/editor/editor-header";
import { usePanelStore } from "@/stores/panel-store";
import { useProjectStore } from "@/stores/project-store";
import { EditorProvider } from "@/components/providers/editor-provider";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { Onboarding } from "@/components/editor/onboarding";

export default function Editor() {
  const {
    toolsPanel,
    previewPanel,
    mainContent,
    timeline,
    setToolsPanel,
    setPreviewPanel,
    setMainContent,
    setTimeline,
    propertiesPanel,
    setPropertiesPanel,
    activePreset,
    resetCounter,
  } = usePanelStore();

  const {
    activeProject,
    loadProject,
    createNewProject,
    isInvalidProjectId,
    markProjectIdAsInvalid,
  } = useProjectStore();
  const params = useParams();
  const router = useRouter();
  const projectId = params.project_id as string;
  const handledProjectIds = useRef<Set<string>>(new Set());
  const isInitializingRef = useRef<boolean>(false);

  usePlaybackControls();

  useEffect(() => {
    let isCancelled = false;

    const initProject = async () => {
      if (!projectId) {
        return;
      }

      // Prevent duplicate initialization
      if (isInitializingRef.current) {
        return;
      }

      // Check if project is already loaded
      if (activeProject?.id === projectId) {
        return;
      }

      // Check global invalid tracking first (most important for preventing duplicates)
      if (isInvalidProjectId(projectId)) {
        return;
      }

      // Check if we've already handled this project ID locally
      if (handledProjectIds.current.has(projectId)) {
        return;
      }

      // Mark as initializing to prevent race conditions
      isInitializingRef.current = true;
      handledProjectIds.current.add(projectId);

      try {
        await loadProject(projectId);

        // Check if component was unmounted during async operation
        if (isCancelled) {
          return;
        }

        // Project loaded successfully
        isInitializingRef.current = false;
      } catch (error) {
        // Check if component was unmounted during async operation
        if (isCancelled) {
          return;
        }

        // More specific error handling - only create new project for actual "not found" errors
        const isProjectNotFound =
          error instanceof Error &&
          (error.message.includes("not found") ||
            error.message.includes("does not exist") ||
            error.message.includes("Project not found"));

        if (isProjectNotFound) {
          // Mark this project ID as invalid globally BEFORE creating project
          markProjectIdAsInvalid(projectId);

          try {
            const newProjectId = await createNewProject("Untitled Project");

            // Check again if component was unmounted
            if (isCancelled) {
              return;
            }

            router.replace(`/editor/${newProjectId}`);
          } catch (createError) {
            console.error("Failed to create new project:", createError);
          }
        } else {
          // For other errors (storage issues, corruption, etc.), don't create new project
          console.error(
            "Project loading failed with recoverable error:",
            error
          );
          // Remove from handled set so user can retry
          handledProjectIds.current.delete(projectId);
        }

        isInitializingRef.current = false;
      }
    };

    initProject();

    // Cleanup function to cancel async operations
    return () => {
      isCancelled = true;
      isInitializingRef.current = false;
    };
  }, [
    projectId,
    loadProject,
    createNewProject,
    router,
    isInvalidProjectId,
    markProjectIdAsInvalid,
  ]);

  return (
    <EditorProvider>
      <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
        <EditorHeader />
        <div className="flex-1 min-h-0 min-w-0">
          {activePreset === "media" ? (
            <ResizablePanelGroup
              key={`media-${activePreset}-${resetCounter}`}
              direction="horizontal"
              className="h-full w-full gap-[0.18rem] px-3 pb-3"
            >
              <ResizablePanel
                defaultSize={toolsPanel}
                minSize={15}
                maxSize={40}
                onResize={setToolsPanel}
                className="min-w-0 rounded-sm"
              >
                <MediaPanel />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize={100 - toolsPanel}
                minSize={60}
                className="min-w-0 min-h-0"
              >
                <ResizablePanelGroup
                  direction="vertical"
                  className="h-full w-full gap-[0.18rem]"
                >
                  <ResizablePanel
                    defaultSize={mainContent}
                    minSize={30}
                    maxSize={85}
                    onResize={setMainContent}
                    className="min-h-0"
                  >
                    <ResizablePanelGroup
                      direction="horizontal"
                      className="h-full w-full gap-[0.19rem]"
                    >
                      <ResizablePanel
                        defaultSize={previewPanel}
                        minSize={30}
                        onResize={setPreviewPanel}
                        className="min-w-0 min-h-0 flex-1"
                      >
                        <PreviewPanel />
                      </ResizablePanel>

                      <ResizableHandle withHandle />

                      <ResizablePanel
                        defaultSize={propertiesPanel}
                        minSize={15}
                        maxSize={40}
                        onResize={setPropertiesPanel}
                        className="min-w-0"
                      >
                        <PropertiesPanel />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel
                    defaultSize={timeline}
                    minSize={15}
                    maxSize={70}
                    onResize={setTimeline}
                    className="min-h-0"
                  >
                    <Timeline />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : activePreset === "inspector" ? (
            <ResizablePanelGroup
              key={`inspector-${activePreset}-${resetCounter}`}
              direction="horizontal"
              className="h-full w-full gap-[0.18rem] px-3 pb-3"
            >
              <ResizablePanel
                defaultSize={100 - propertiesPanel}
                minSize={30}
                onResize={(size) => setPropertiesPanel(100 - size)}
                className="min-w-0 min-h-0"
              >
                <ResizablePanelGroup
                  direction="vertical"
                  className="h-full w-full gap-[0.18rem]"
                >
                  <ResizablePanel
                    defaultSize={mainContent}
                    minSize={30}
                    maxSize={85}
                    onResize={setMainContent}
                    className="min-h-0"
                  >
                    <ResizablePanelGroup
                      direction="horizontal"
                      className="h-full w-full gap-[0.19rem]"
                    >
                      <ResizablePanel
                        defaultSize={toolsPanel}
                        minSize={15}
                        maxSize={40}
                        onResize={setToolsPanel}
                        className="min-w-0 rounded-sm"
                      >
                        <MediaPanel />
                      </ResizablePanel>

                      <ResizableHandle withHandle />

                      <ResizablePanel
                        defaultSize={previewPanel}
                        minSize={30}
                        onResize={setPreviewPanel}
                        className="min-w-0 min-h-0 flex-1"
                      >
                        <PreviewPanel />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel
                    defaultSize={timeline}
                    minSize={15}
                    maxSize={70}
                    onResize={setTimeline}
                    className="min-h-0"
                  >
                    <Timeline />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize={propertiesPanel}
                minSize={15}
                maxSize={40}
                onResize={setPropertiesPanel}
                className="min-w-0 min-h-0"
              >
                <PropertiesPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : activePreset === "vertical-preview" ? (
            <ResizablePanelGroup
              key={`vertical-preview-${activePreset}-${resetCounter}`}
              direction="horizontal"
              className="h-full w-full gap-[0.18rem] px-3 pb-3"
            >
              <ResizablePanel
                defaultSize={100 - previewPanel}
                minSize={30}
                onResize={(size) => setPreviewPanel(100 - size)}
                className="min-w-0 min-h-0"
              >
                <ResizablePanelGroup
                  direction="vertical"
                  className="h-full w-full gap-[0.18rem]"
                >
                  <ResizablePanel
                    defaultSize={mainContent}
                    minSize={30}
                    maxSize={85}
                    onResize={setMainContent}
                    className="min-h-0"
                  >
                    <ResizablePanelGroup
                      direction="horizontal"
                      className="h-full w-full gap-[0.19rem]"
                    >
                      <ResizablePanel
                        defaultSize={toolsPanel}
                        minSize={15}
                        maxSize={40}
                        onResize={setToolsPanel}
                        className="min-w-0 rounded-sm"
                      >
                        <MediaPanel />
                      </ResizablePanel>

                      <ResizableHandle withHandle />

                      <ResizablePanel
                        defaultSize={propertiesPanel}
                        minSize={15}
                        maxSize={40}
                        onResize={setPropertiesPanel}
                        className="min-w-0"
                      >
                        <PropertiesPanel />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel
                    defaultSize={timeline}
                    minSize={15}
                    maxSize={70}
                    onResize={setTimeline}
                    className="min-h-0"
                  >
                    <Timeline />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                defaultSize={previewPanel}
                minSize={30}
                onResize={setPreviewPanel}
                className="min-w-0 min-h-0"
              >
                <PreviewPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <ResizablePanelGroup
              key={`default-${activePreset}-${resetCounter}`}
              direction="vertical"
              className="h-full w-full gap-[0.18rem]"
            >
              <ResizablePanel
                defaultSize={mainContent}
                minSize={30}
                maxSize={85}
                onResize={setMainContent}
                className="min-h-0"
              >
                {/* Main content area */}
                <ResizablePanelGroup
                  direction="horizontal"
                  className="h-full w-full gap-[0.19rem] px-3"
                >
                  {/* Tools Panel */}
                  <ResizablePanel
                    defaultSize={toolsPanel}
                    minSize={15}
                    maxSize={40}
                    onResize={setToolsPanel}
                    className="min-w-0 rounded-sm"
                  >
                    <MediaPanel />
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  {/* Preview Area */}
                  <ResizablePanel
                    defaultSize={previewPanel}
                    minSize={30}
                    onResize={setPreviewPanel}
                    className="min-w-0 min-h-0 flex-1"
                  >
                    <PreviewPanel />
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel
                    defaultSize={propertiesPanel}
                    minSize={15}
                    maxSize={40}
                    onResize={setPropertiesPanel}
                    className="min-w-0 rounded-sm"
                  >
                    <PropertiesPanel />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Timeline */}
              <ResizablePanel
                defaultSize={timeline}
                minSize={15}
                maxSize={70}
                onResize={setTimeline}
                className="min-h-0 px-3 pb-3"
              >
                <Timeline />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
        <Onboarding />
      </div>
    </EditorProvider>
  );
}
