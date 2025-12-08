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

/**
 * Renders a vertically scrollable content area with standard padding.
 *
 * @param children - Content to render inside the scrollable area.
 * @param className - Additional CSS classes applied to the inner content container.
 * @returns The scrollable content element containing the provided `children`.
 */
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

/**
 * Render a full-height panel that displays either a simple scrollable content area or a tabs-based layout.
 *
 * @param children - Content to render inside the panel or inside the active tab's content area
 * @param defaultTab - The tab value selected initially when uncontrolled
 * @param value - Controlled current tab value; when provided, panel uses controlled tab state
 * @param onValueChange - Callback invoked with the new tab value when the active tab changes
 * @param tabs - Array of tab descriptors (value, label, optional icon, and content) to render a tabbed interface; if omitted or empty, `children` is rendered instead
 * @param className - Additional CSS class names applied to the outer container and passed to inner content wrappers
 * @param ref - Ref forwarded to the outer container div
 * @returns A React element containing either the scrollable content area or the tabbed layout with each tab's content
 */
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