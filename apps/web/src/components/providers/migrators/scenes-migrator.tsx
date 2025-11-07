"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { storageService } from "@/lib/storage/storage-service";
import { TProject, Scene } from "@/types/project";
import { generateUUID } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { createMainScene } from "@/stores/project-store";

interface MigrationProgress {
  current: number;
  total: number;
  currentProjectName: string;
}

export function ScenesMigrator({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress>({
    current: 0,
    total: 0,
    currentProjectName: "",
  });

  const shouldCheckMigration =
    pathname.startsWith("/editor") || pathname.startsWith("/projects");

  useEffect(() => {
    if (!shouldCheckMigration) return;

    checkAndMigrateProjects();
  }, [shouldCheckMigration]);

  const checkAndMigrateProjects = async () => {
    try {
      const projects = await storageService.loadAllProjects();
      const legacyProjects = projects.filter(
        (project) => !project.scenes || project.scenes.length === 0
      );

      if (legacyProjects.length === 0) {
        // No migration needed
        return;
      }

      setIsMigrating(true);
      setProgress({
        current: 0,
        total: legacyProjects.length,
        currentProjectName: "",
      });

      // Migrate each legacy project
      for (let i = 0; i < legacyProjects.length; i++) {
        const project = legacyProjects[i];

        setProgress({
          current: i,
          total: legacyProjects.length,
          currentProjectName: project.name,
        });

        await migrateLegacyProject(project);
      }

      setProgress({
        current: legacyProjects.length,
        total: legacyProjects.length,
        currentProjectName: "Complete!",
      });

      setTimeout(() => {
        setIsMigrating(false);
      }, 1000);
    } catch (error) {
      console.error("Migration failed:", error);
      setIsMigrating(false);
    }
  };

  const migrateLegacyProject = async (project: TProject) => {
    try {
      const mainScene: Scene = {
        id: generateUUID(),
        name: "Main Scene",
        isMain: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const migratedProject: TProject = {
        ...project,
        scenes: [mainScene],
        currentSceneId: mainScene.id,
        updatedAt: new Date(),
      };

      // Load existing timeline data (legacy format)
      const legacyTimeline = await storageService.loadTimeline({
        projectId: project.id,
      });

      await storageService.saveProject({ project: migratedProject });

      // If timeline data, migrate it to the main scene
      if (legacyTimeline && legacyTimeline.length > 0) {
        await storageService.saveTimeline({
          projectId: project.id,
          tracks: legacyTimeline,
          sceneId: mainScene.id,
        });
      }

      // Clean up legacy timeline storage
      await storageService.deleteProjectTimeline({ projectId: project.id });
    } catch (error) {
      console.error(`Failed to migrate project ${project.name}:`, error);
      throw error;
    }
  };

  if (!shouldCheckMigration) {
    return children;
  }

  if (isMigrating) {
    const progressPercent =
      progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

    return (
      <Dialog open={true}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Updating Projects</DialogTitle>
            <DialogDescription>
              We're adding scene support to your projects. This will only take a
              moment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>
                  {progress.current} of {progress.total}
                </span>
              </div>
              <Progress value={progressPercent} className="w-full" />
            </div>

            {progress.currentProjectName && (
              <div className="text-sm text-muted-foreground">
                {progress.current < progress.total
                  ? `Updating: ${progress.currentProjectName}`
                  : progress.currentProjectName}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return children;
}
