import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface PanelBaseViewProps {
  children?: React.ReactNode;
  defaultTab?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  tabs?: {
    value: string;
    label: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
  }[];
  className?: string;
  ref?: React.RefObject<HTMLDivElement>;
}

function ViewContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ScrollArea className="flex-1">
      <div className={cn("p-5", className)}>{children}</div>
    </ScrollArea>
  );
}

export function PanelBaseView({
  children,
  defaultTab,
  value,
  onValueChange,
  tabs,
  className = "",
  ref,
}: PanelBaseViewProps) {
  return (
    <div className={cn("h-full flex flex-col", className)} ref={ref}>
      {!tabs || tabs.length === 0 ? (
        <ViewContent className={className}>{children}</ViewContent>
      ) : (
        <Tabs
          defaultValue={defaultTab}
          value={value}
          onValueChange={onValueChange}
          className="flex flex-col h-full"
        >
          <div className="sticky top-0 z-10 bg-panel">
            <div className="px-3 pt-3.5 pb-0">
              <TabsList>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.icon ? (
                      <span className="inline-flex items-center mr-1">
                        {tab.icon}
                      </span>
                    ) : null}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <Separator className="mt-3.5" />
          </div>
          {tabs.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="mt-0 flex-1 flex flex-col min-h-0"
            >
              <ViewContent className={className}>{tab.content}</ViewContent>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
