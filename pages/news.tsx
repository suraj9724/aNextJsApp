import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AppSidebar from "../components/AppSidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, ExternalLink, Calendar, ThumbsUp, ThumbsDown, MessageSquare, Flag } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import Comments from "../components/Comments";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

interface NewsItem {
  _id: string;
  title: string;
  url: string;
  publishedAt: string;
  content: string;
  contentSnippet: string;
  guid: string;
  categories: string[];
  isoDate: string;
  feedInfo?: {
    Provider: string;
    subtype: string;
  };
  likes?: number;
  subtype: string;
  dislikes?: number;
}

const news = () => {
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [likedNewsIds, setLikedNewsIds] = useState<Set<string>>(new Set());
  const [dislikedNewsIds, setDislikedNewsIds] = useState<Set<string>>(new Set());
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { auth } = useAuth();
  const { toast } = useToast();
  const limit = 12; // Number of news items per page

  const [availableSubtypes, setAvailableSubtypes] = useState<string[]>([]);
  const [selectedSubtype, setSelectedSubtype] = useState<string>(""); // "" means all subtypes

  const fetchNews = async (page: number, subtype?: string, currentSearchTerm?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const termToUse = currentSearchTerm !== undefined ? currentSearchTerm : searchTerm;
      if (termToUse.trim() !== "") {
        params.append("search", termToUse.trim());
      }

      const subtypeToUse = subtype !== undefined ? subtype : selectedSubtype;
      if (subtypeToUse && subtypeToUse !== "all") { // Assuming "all" value for showing all
        params.append("subtype", subtypeToUse);
      }

      const response = await fetch(`http://localhost:3000/api/news?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch news");
      }

      const data = await response.json();

      let newsArray: NewsItem[] = [];

      if (Array.isArray(data.news)) {
        newsArray = data.news;
      } else if (Array.isArray(data)) {
        newsArray = data;
      } else {
        throw new Error("Invalid API response format");
      }

      // Sort news by date (newest first)
      const sortedNews = [...newsArray].sort((a: NewsItem, b: NewsItem) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      setNews(sortedNews);
      setCurrentPage(page);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch news",
        variant: "destructive",
      });
      setNews([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available subtypes (placeholder)
  const fetchSubtypes = async () => {
    // TODO: Implement actual API call to fetch distinct subtypes
    // For now, you could derive from existing news or have a predefined list
    // Example: const response = await fetch('/api/news/subtypes');
    // const data = await response.json();
    // setAvailableSubtypes(['all', ...data.subtypes]); 
    // For demonstration, let's use a placeholder list after first news fetch
    // Or, if you have a fixed list:
    setAvailableSubtypes(["all", "Tech", "Sports", "Business", "Entertainment"]); // Placeholder
  };

  useEffect(() => {
    fetchSubtypes(); // Fetch subtypes on component mount

    // Check for subtype in URL query params
    if (router.isReady) {
      const urlSubtype = router.query.subtype as string | undefined;
      if (urlSubtype) {
        setSelectedSubtype(urlSubtype);
        // Fetch news with the subtype from URL, clear search term if navigating from feeds
        fetchNews(1, urlSubtype, ""); // Passing empty string for searchTerm
      } else {
        fetchNews(1, selectedSubtype, searchTerm);
      }
    }
  }, [router.isReady, router.query.subtype]); // Add router dependencies

  useEffect(() => {
    // Re-fetch news when selectedSubtype or searchTerm changes, but not on initial load if subtype came from URL
    // The initial load is handled by the router.isReady effect
    if (router.isReady && !router.query.subtype) {
      fetchNews(1, selectedSubtype, searchTerm);
    } else if (router.isReady && router.query.subtype && selectedSubtype !== router.query.subtype) {
      // If URL subtype was present, but user changes dropdown, fetch with new dropdown value
      fetchNews(1, selectedSubtype, searchTerm);
    }
  }, [selectedSubtype, searchTerm, router.isReady]);

  const filteredNews = news; // Backend now handles filtering by subtype and search
  // The client-side filter below might be redundant if backend does all filtering
  // Consider removing if backend search/subtype filtering is comprehensive.
  // news.filter((item) => {
  //   const searchLower = searchTerm.toLowerCase();
  //   const subtypeMatch = !selectedSubtype || selectedSubtype === "all" || item.subtype === selectedSubtype;
  //   const searchMatch = (
  //     item.title.toLowerCase().includes(searchLower) ||
  //     item.contentSnippet?.toLowerCase().includes(searchLower) ||
  //     item.categories?.some((category) => category.toLowerCase().includes(searchLower)) ||
  //     item.feedInfo?.Provider.toLowerCase().includes(searchLower) ||
  //     item.subtype.toLowerCase().includes(searchLower)
  //   );
  //   return subtypeMatch && searchMatch;
  // });

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        const parsedDate = new Date(Date.parse(dateString));
        if (isNaN(parsedDate.getTime())) {
          return "Invalid date";
        }
        return new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(parsedDate);
      }
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (error) {
      return "Invalid date";
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchNews(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchNews(currentPage + 1);
    }
  };

  const handleLike = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/news/${id}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to like the news article");
      }
      const data = await response.json();
      setNews((prevNews) =>
        prevNews.map((item) =>
          item._id === id ? { ...item, likes: data.likes, dislikes: data.dislikes } : item
        )
      );
      setLikedNewsIds((prev) => new Set(prev).add(id));
      setDislikedNewsIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast({
        title: "Success",
        description: data.message || "Liked the news article",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to like the news article",
        variant: "destructive",
      });
    }
  };

  const handleDislike = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/news/${id}/dislike`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to dislike the news article");
      }
      const data = await response.json();
      setNews((prevNews) =>
        prevNews.map((item) =>
          item._id === id ? { ...item, likes: data.likes, dislikes: data.dislikes } : item
        )
      );
      setDislikedNewsIds((prev) => new Set(prev).add(id));
      setLikedNewsIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast({
        title: "Success",
        description: data.message || "Disliked the news article",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to dislike the news article",
        variant: "destructive",
      });
    }
  };

  const openCommentsDialog = (newsItem: NewsItem) => {
    setSelectedNews(newsItem);
    setIsDialogOpen(true);
  };

  const closeCommentsDialog = () => {
    setSelectedNews(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />

      <main className="md:pl-64 pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold">News</h1>
              <p className="text-muted-foreground">
                Browse the latest articles.
              </p>
            </div>
            {/* Subtype Filter Dropdown */}
            <div className="w-full md:w-auto md:min-w-[200px]">
              <Select
                value={selectedSubtype}
                onValueChange={(value) => {
                  setSelectedSubtype(value);
                  // Optionally, clear URL subtype query if user interacts with dropdown
                  // router.push('/news', undefined, { shallow: true }); 
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Subtype" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubtypes.map(subtype => (
                    <SelectItem key={subtype} value={subtype}>
                      {subtype === "all" || subtype === "" ? "All Subtypes" : subtype}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search news..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Loading news...</p>
              </div>
            </div>
          ) : news.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="py-12 text-center">
                <h2 className="text-xl font-medium text-muted-foreground">No news articles available</h2>
                <p className="mt-2 text-muted-foreground">Please check your connection or try again later</p>
              </div>
            </div>
          ) : (
            <>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNews.map((item) => (
                  <Card key={item._id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                    {item.subtype && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-[#ea384c] hover:bg-[#ea384c]/90 flex items-center gap-1 text-white">
                          {item.subtype}
                        </Badge>
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-xl">{item.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            {formatDate(item.publishedAt)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        {item.contentSnippet || (item.content ? item.content.slice(0, 200) + "..." : "")}
                      </p>
                      {item.categories && item.categories.length > 0 && (
                        <div className="flex gap-2 mt-4 flex-wrap">
                          {item.categories.map((category, index) => (
                            <Badge key={index} variant="secondary">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex items-center justify-between">
                      <Button variant="outline" asChild className="max-w-[120px]">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center truncate">
                          Read Article
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          onClick={() => handleLike(item._id)}
                          aria-label="Like"
                        >
                          <ThumbsUp
                            className="h-4 w-4"
                          />
                          <span >{item.likes ?? 0}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDislike(item._id)}
                          aria-label="Dislike"
                        >
                          <ThumbsDown
                            className={`h-5 w-5 ${dislikedNewsIds.has(item._id) ? "text-blue-700" : ""
                              }`}
                          />
                          <span className="ml-1">{item.dislikes ?? 0}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => openCommentsDialog(item)}
                          aria-label="Comments"
                        >
                          <MessageSquare className="h-5 w-5" />
                        </Button>
                      </div>

                    </CardFooter>
                  </Card>
                ))}
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-5xl w-full grid grid-cols-2 gap-4">
                  <div className="overflow-y-auto max-h-[80vh] p-4 border-r border-gray-300">
                    <h2 className="text-2xl font-bold mb-4">{selectedNews?.title}</h2>
                    <p className="text-muted-foreground mb-2">{formatDate(selectedNews?.publishedAt || "")}</p>
                    <p>{selectedNews?.content || selectedNews?.contentSnippet}</p>
                    <a href={selectedNews?.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mt-4 block">
                      Read Full Article
                    </a>
                  </div>
                  <div className="overflow-y-auto max-h-[80vh] p-4">
                    {selectedNews && <Comments newsId={selectedNews._id} />}
                  </div>
                  <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <div className="sr-only">Close</div>
                  </DialogClose>
                </DialogContent>
              </Dialog>

              <div className="flex justify-center gap-4 mt-6">
                <Button onClick={handlePreviousPage} disabled={currentPage === 1}>
                  &lt;
                </Button>
                <span className="flex items-center">
                  Page {currentPage} of {totalPages}
                </span>
                <Button onClick={handleNextPage} disabled={currentPage === totalPages}>
                  &gt;
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default news;
