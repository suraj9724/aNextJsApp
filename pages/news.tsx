import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AppSidebar from "../components/AppSidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { ExternalLink, Calendar, ThumbsUp, ThumbsDown, MessageSquare, Flag, Search } from "lucide-react";
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
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
  const [singleNewsItem, setSingleNewsItem] = useState<NewsItem | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchNews = async (page: number, subtype?: string, currentSearchTerm?: string) => {
    setIsLoading(true);
    console.log("Fetching news list with params:", { page, subtype, currentSearchTerm });
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

  const fetchSingleNews = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/news/${id}`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch news article");
      }

      const data = await response.json();
      setSingleNewsItem(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch news article",
        variant: "destructive",
      });
      setSingleNewsItem(null);
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
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    fetchSubtypes();
    if (router.isReady) {
      const urlQuerySubtype = router.query.subtype as string | undefined;
      const urlQueryNewsId = router.query.id as string | undefined;

      if (urlQueryNewsId) {
        fetchSingleNews(urlQueryNewsId);
        setNews([]);
        setSelectedSubtype("");
        setSearchTerm(""); // Clear search term when viewing single news
      } else {
        if (singleNewsItem) {
          setSingleNewsItem(null);
        }

        if (urlQuerySubtype) {
          setSelectedSubtype(urlQuerySubtype);
        }
        // For initial load, if a subtype is in query, don't use existing debouncedSearchTerm.
        // Otherwise, use existing debouncedSearchTerm (e.g. if user was searching, then navigated away and back)
        // Use searchTerm directly for initial load consistency if coming from URL, otherwise use debounced for typed search
        const termForInitialLoad = urlQuerySubtype || router.query.id ? "" : debouncedSearchTerm;
        fetchNews(1, urlQuerySubtype || selectedSubtype, termForInitialLoad);
      }
      setIsInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.id, router.query.subtype]); // NB: debouncedSearchTerm is NOT here, initial load uses it differently

  useEffect(() => {
    // This effect handles changes to selectedSubtype or debouncedSearchTerm AFTER initial load
    // and when not viewing a single news item.
    if (!isInitialLoad && router.isReady && !router.query.id) {
      fetchNews(1, selectedSubtype, debouncedSearchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubtype, debouncedSearchTerm, isInitialLoad, router.isReady, router.query.id]);

  const filteredNews = news; // Backend now handles filtering by subtype and search.
  // Client-side filtering based on searchTerm is removed as backend handles it.

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

  const updateNewsItemState = (updatedItemData: Partial<NewsItem> & { _id: string, hasLiked?: boolean, hasDisliked?: boolean }) => {
    setNews(prevNews =>
      prevNews.map(item =>
        item._id === updatedItemData._id ? { ...item, ...updatedItemData } : item
      )
    );
    if (singleNewsItem && singleNewsItem._id === updatedItemData._id) {
      setSingleNewsItem(prev => prev ? { ...prev, ...updatedItemData } : null);
    }

    // Update liked/disliked sets based on hasLiked/hasDisliked from API
    if (typeof updatedItemData.hasLiked === 'boolean') {
      setLikedNewsIds(prev => {
        const newSet = new Set(prev);
        if (updatedItemData.hasLiked) newSet.add(updatedItemData._id);
        else newSet.delete(updatedItemData._id);
        return newSet;
      });
    }
    if (typeof updatedItemData.hasDisliked === 'boolean') {
      setDislikedNewsIds(prev => {
        const newSet = new Set(prev);
        if (updatedItemData.hasDisliked) newSet.add(updatedItemData._id);
        else newSet.delete(updatedItemData._id);
        return newSet;
      });
    }
  };

  const handleReaction = async (id: string, reactionType: 'like' | 'dislike') => {
    const itemToUpdate = news.find(n => n._id === id) || (singleNewsItem?._id === id ? singleNewsItem : null);
    if (!itemToUpdate) return;

    // Save current state for potential rollback
    const originalNews = [...news];
    const originalSingleNewsItem = singleNewsItem ? { ...singleNewsItem } : null;
    const originalLikedIds = new Set(likedNewsIds);
    const originalDislikedIds = new Set(dislikedNewsIds);

    // Optimistic UI Update
    const isCurrentlyLiked = likedNewsIds.has(id);
    const isCurrentlyDisliked = dislikedNewsIds.has(id);
    let newLikes = itemToUpdate.likes ?? 0;
    let newDislikes = itemToUpdate.dislikes ?? 0;
    const newLikedIdsOptimistic = new Set(likedNewsIds);
    const newDislikedIdsOptimistic = new Set(dislikedNewsIds);

    if (reactionType === 'like') {
      if (isCurrentlyLiked) { // Unliking
        newLikes--;
        newLikedIdsOptimistic.delete(id);
      } else { // Liking
        newLikes++;
        newLikedIdsOptimistic.add(id);
        if (isCurrentlyDisliked) { // Switching from dislike
          newDislikes--;
          newDislikedIdsOptimistic.delete(id);
        }
      }
    } else { // reactionType === 'dislike'
      if (isCurrentlyDisliked) { // Un-disliking
        newDislikes--;
        newDislikedIdsOptimistic.delete(id);
      } else { // Disliking
        newDislikes++;
        newDislikedIdsOptimistic.add(id);
        if (isCurrentlyLiked) { // Switching from like
          newLikes--;
          newLikedIdsOptimistic.delete(id);
        }
      }
    }

    // Apply optimistic updates to general item structure (counts)
    // The specific hasLiked/hasDisliked will be set by updateNewsItemState after API call or by direct setLiked/DislikedNewsIds here
    setNews(prevNews =>
      prevNews.map(item =>
        item._id === id ? { ...item, likes: newLikes, dislikes: newDislikes } : item
      )
    );
    if (singleNewsItem && singleNewsItem._id === id) {
      setSingleNewsItem(prev => prev ? { ...prev, likes: newLikes, dislikes: newDislikes } : null);
    }
    setLikedNewsIds(newLikedIdsOptimistic);
    setDislikedNewsIds(newDislikedIdsOptimistic);

    try {
      const response = await fetch(`http://localhost:3000/api/news/${id}/reaction`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reactionType }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || `Failed to ${reactionType} the news article`);
      }

      // Update state with authoritative data from API response using the helper
      updateNewsItemState({
        _id: id,
        likes: data.data.likes,
        dislikes: data.data.dislikes,
        hasLiked: data.data.hasLiked, // This will update likedNewsIds via the helper
        hasDisliked: data.data.hasDisliked, // This will update dislikedNewsIds via the helper
      });

      toast({
        title: "Success",
        description: data.message || `${reactionType.charAt(0).toUpperCase() + reactionType.slice(1)}d the news article`,
        variant: "default",
      });

    } catch (error) {
      // Rollback UI state
      setNews(originalNews);
      if (originalSingleNewsItem && singleNewsItem && singleNewsItem._id === originalSingleNewsItem._id) {
        setSingleNewsItem(originalSingleNewsItem);
      } else if (!originalSingleNewsItem && singleNewsItem && singleNewsItem._id === id) {
        // If it was a single item view that was initially null or different, and it failed
        // We might need to decide if we roll back to null or original list view item
        // For now, if it became singleNewsItem, try to restore its original list version
        const originalListItem = originalNews.find(item => item._id === id);
        if (originalListItem) setSingleNewsItem(originalListItem); else setSingleNewsItem(null);

      }

      setLikedNewsIds(originalLikedIds);
      setDislikedNewsIds(originalDislikedIds);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${reactionType} the news article`,
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
          {/* Debugging: Show singleNewsItem state */}
          {/* {singleNewsItem !== null ? <p>Viewing Single Item</p> : <p>Viewing List</p>} */}
          {/* End Debugging */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Loading news...</p>
              </div>
            </div>
          ) : singleNewsItem ? (
            // Render single news item view
            <div className="bg-white rounded-lg shadow p-6">
              <Button variant="outline" onClick={() => router.push('/news')} className="mb-4">Back to News</Button>
              <h1 className="text-3xl font-bold mb-4">{singleNewsItem.title}</h1>
              <p className="text-muted-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(singleNewsItem.publishedAt)}
                {singleNewsItem.subtype && (
                  <Badge className="bg-[#ea384c] hover:bg-[#ea384c]/90 flex items-center gap-1 text-white ml-2">
                    {singleNewsItem.subtype}
                  </Badge>
                )}
              </p>
              <div className="prose max-w-none">
                <p>{singleNewsItem.content || singleNewsItem.contentSnippet}</p>
              </div>
              {singleNewsItem.url && (
                <Button variant="outline" onClick={() => window.open(singleNewsItem.url, '_blank')} className="max-w-[150px]">
                  Read Full Article
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              )}
              <div className="flex mt-4">
                <Button
                  variant="ghost"
                  onClick={() => handleReaction(singleNewsItem._id, 'like')}
                  aria-label="Like"
                >
                  <ThumbsUp
                    className={`h-4 w-4 ${likedNewsIds.has(singleNewsItem._id) ? "text-blue-700" : ""}`}
                  />
                  <span>{singleNewsItem.likes ?? 0}</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleReaction(singleNewsItem._id, 'dislike')}
                  aria-label="Dislike"
                >
                  <ThumbsDown
                    className={`h-5 w-5 ${dislikedNewsIds.has(singleNewsItem._id) ? "text-blue-700" : ""}`}
                  />
                  <span className="ml-1">{singleNewsItem.dislikes ?? 0}</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => openCommentsDialog(singleNewsItem)}
                  aria-label="Comments"
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
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
            </div>
          ) : (
            // Render news list view
            <>
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
                      <Button variant="outline" className="max-w-[120px]" onClick={() => router.push(`/news?id=${item._id}`)}>
                        Read Article
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          onClick={() => handleReaction(item._id, 'like')}
                          aria-label="Like"
                        >
                          <ThumbsUp
                            className={`h-4 w-4 ${likedNewsIds.has(item._id) ? "text-blue-700" : ""}`}
                          />
                          <span>{item.likes ?? 0}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleReaction(item._id, 'dislike')}
                          aria-label="Dislike"
                        >
                          <ThumbsDown
                            className={`h-5 w-5 ${dislikedNewsIds.has(item._id) ? "text-blue-700" : ""}`}
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
