"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader } from "@/components/ui/loader";
import { formatTimeCode } from "@/lib/time";
import { searchSegmentsClient } from "@/lib/search/search-client";
import type { SegmentSearchResult } from "@/types/semantic-search";

const SearchPage = () => {
  const [queryText, setQueryText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SegmentSearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!queryText.trim()) {
      setErrorMessage("Enter a search query");
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);

    try {
      const response = await searchSegmentsClient({
        queryText: queryText.trim(),
        limit: 20,
      });
      setResults(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      setErrorMessage(message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-screen-4xl mx-auto w-full px-6 py-10">
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">Search Library</h1>
            <p className="text-sm text-muted-foreground">
              Query across indexed segments and jump to exact moments.
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search-query">Search query</Label>
                  <Input
                    id="search-query"
                    placeholder="e.g. clips where I mention crypto"
                    value={queryText}
                    onChange={(event) => setQueryText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSearch();
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching && <Loader className="mr-2" />}
                    Search
                  </Button>
                  {errorMessage && (
                    <span className="text-sm text-destructive">{errorMessage}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Results</h2>
                  <span className="text-sm text-muted-foreground">
                    {results.length} matches
                  </span>
                </div>
                <ScrollArea className="h-96">
                  <div className="flex flex-col gap-3">
                    {results.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No results yet.
                      </div>
                    ) : (
                      results.map((result) => (
                        <div
                          key={result.segmentId}
                          className="rounded-md border border-border bg-muted/40 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {formatTimeCode(result.startTimeSeconds, "HH:MM:SS")} -
                              {" "}
                              {formatTimeCode(result.endTimeSeconds, "HH:MM:SS")}
                            </span>
                            {result.similarityScore !== null && (
                              <span className="text-xs text-muted-foreground">
                                Score {result.similarityScore.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-foreground">
                            {result.transcriptText ||
                              result.visualSummary ||
                              "No transcript available"}
                          </div>
                          {result.visualSummary && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {result.visualSummary}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
