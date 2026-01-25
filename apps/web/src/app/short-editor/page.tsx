"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Slider } from "@/components/ui/slider";
import { Loader } from "@/components/ui/loader";
import { Upload, Play, Wand2, Scissors, Volume2, Sparkles, Download } from "lucide-react";

interface UploadedClip {
  id: string;
  name: string;
  durationSeconds?: number;
}

interface ScriptSegment {
  id: string;
  text: string;
}

const ShortEditorPage = () => {
  const [uploadedClips, setUploadedClips] = useState<UploadedClip[]>([]);
  const [scriptText, setScriptText] = useState("");
  const [scriptSegments, setScriptSegments] = useState<ScriptSegment[]>([]);
  const [isAutoEditing, setIsAutoEditing] = useState(false);
  const [tightness, setTightness] = useState(50);
  const [removeSilence, setRemoveSilence] = useState(true);
  const [removeFillers, setRemoveFillers] = useState(true);
  const [enhanceAudio, setEnhanceAudio] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: File[]) => {
    const videoFiles = files.filter((file) => file.type.startsWith("video/"));
    const nextClips = videoFiles.slice(0, 5).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
    }));
    setUploadedClips(nextClips);
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;
      handleFiles(Array.from(files));
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files).filter((file) =>
        file.type.startsWith("video/")
      );
      handleFiles(files);
    },
    [handleFiles]
  );

  const handleAutoEdit = useCallback(async () => {
    setIsAutoEditing(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    setScriptText(
      "Welcome back. Today we are breaking down the key steps to ship faster. Let's start with planning, then move into execution, and wrap with a recap."
    );

    setScriptSegments([
      { id: crypto.randomUUID(), text: "Welcome back." },
      {
        id: crypto.randomUUID(),
        text: "Today we are breaking down the key steps to ship faster.",
      },
      {
        id: crypto.randomUUID(),
        text: "Let's start with planning, then move into execution, and wrap with a recap.",
      },
    ]);

    setIsAutoEditing(false);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-screen-4xl mx-auto w-full px-6 py-10">
        <motion.section
          className="flex flex-col gap-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="size-6 text-primary" />
            <h1 className="text-2xl font-semibold">Short Editor</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload → Auto-Edit → Fine-Tune → Export. Talk like a pro, edit like Notes.
          </p>
        </motion.section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Upload Clips</h2>
                    <p className="text-sm text-muted-foreground">
                      Drag 3–5 talking-head clips (MP4/MOV).
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="size-4" />
                    Add clips
                  </Button>
                </div>

                <div
                  className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-6 py-10 text-center"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                >
                  <p className="text-sm font-medium">Drop video clips here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We stitch them into a clean, cohesive first cut.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />

                {uploadedClips.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    {uploadedClips.map((clip) => (
                      <div
                        key={clip.id}
                        className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
                      >
                        <span className="text-sm font-medium">{clip.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {clip.durationSeconds ? `${clip.durationSeconds}s` : "Ready"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Auto-Edit</h2>
                    <p className="text-sm text-muted-foreground">
                      Generate a cohesive first cut and merged transcript.
                    </p>
                  </div>
                  <Button
                    onClick={handleAutoEdit}
                    disabled={isAutoEditing || uploadedClips.length === 0}
                    className="gap-2"
                  >
                    {isAutoEditing ? <Loader /> : <Wand2 className="size-4" />}
                    Auto-Edit
                  </Button>
                </div>

                <div className="mt-4 grid gap-4">
                  <div>
                    <Label className="text-sm">Tightness</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <Slider
                        value={[tightness]}
                        onValueChange={(values) => setTightness(values[0])}
                        min={0}
                        max={100}
                        step={5}
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {tightness}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Scissors className="size-4 text-muted-foreground" />
                        <span className="text-sm">Trim silence</span>
                      </div>
                      <Switch checked={removeSilence} onCheckedChange={setRemoveSilence} />
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Play className="size-4 text-muted-foreground" />
                        <span className="text-sm">Remove fillers</span>
                      </div>
                      <Switch checked={removeFillers} onCheckedChange={setRemoveFillers} />
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Volume2 className="size-4 text-muted-foreground" />
                        <span className="text-sm">Enhance audio</span>
                      </div>
                      <Switch checked={enhanceAudio} onCheckedChange={setEnhanceAudio} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Script</h2>
                    <p className="text-sm text-muted-foreground">
                      Edit the text. The video will follow.
                    </p>
                  </div>
                  <Button variant="outline">Apply edits</Button>
                </div>

                <div className="mt-4 grid gap-4">
                  <Textarea
                    value={scriptText}
                    onChange={(event) => setScriptText(event.target.value)}
                    placeholder="Auto-generated transcript will appear here."
                    className="min-h-32"
                  />

                  {scriptSegments.length > 0 && (
                    <div className="grid gap-2">
                      {scriptSegments.map((segment) => (
                        <div
                          key={segment.id}
                          className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
                        >
                          {segment.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Preview</h2>
                    <p className="text-sm text-muted-foreground">
                      Social-ready 9:16 output.
                    </p>
                  </div>
                  <Button variant="outline" className="gap-2">
                    <Play className="size-4" />
                    Preview
                  </Button>
                </div>

                <div className="mt-4">
                  <AspectRatio ratio={9 / 16}>
                    <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-muted/40">
                      <p className="text-sm text-muted-foreground">Preview</p>
                    </div>
                  </AspectRatio>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Export</h2>
                    <p className="text-sm text-muted-foreground">
                      Ready to share to TikTok, Reels, or Shorts.
                    </p>
                  </div>
                  <Button className="gap-2">
                    <Download className="size-4" />
                    Export 9:16
                  </Button>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                    1080 × 1920 • 30 FPS • MP4
                  </div>
                  <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                    Captions enabled • Loudness leveling on
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortEditorPage;
