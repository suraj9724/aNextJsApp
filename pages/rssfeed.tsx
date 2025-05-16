import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AppSidebar from "../components/AppSidebar";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Pencil, Trash2, ExternalLink, Search, Rss, Edit } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from "../components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

type RSSFeed = {
  _id: string;
  Provider: string;
  provider?: string;
  subtype: string;
  rssLink: string;
  isActive: boolean;
  lastUpdated: string;
  createdAt?: string;
};

const rssFeed = () => {
  const router = useRouter();
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { auth } = useAuth();
  const { toast } = useToast();

  // Log AuthContext user for debugging
  // useEffect(() => {
  //   console.log("AuthContext user from rssfeed.tsx:", auth.user);
  // }, [auth.user]);

  // New state variables for edit and delete dialogs
  const [selectedFeed, setSelectedFeed] = useState<RSSFeed | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Form state for editing
  const [editProvider, setEditProvider] = useState("");
  const [editSubtype, setEditSubtype] = useState("");
  const [editRssLink, setEditRssLink] = useState("");
  const [editIsActive, setEditIsActive] = useState(false);

  // New state variables for Add Feed dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addProvider, setAddProvider] = useState("");
  const [addSubtype, setAddSubtype] = useState("");
  const [addRssLink, setAddRssLink] = useState("");
  const [addIsActive, setAddIsActive] = useState(false);

  // State for displaying news items from a selected feed
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState<boolean>(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [activeFeedUrlForNews, setActiveFeedUrlForNews] = useState<string | null>(null);

  const fetchFeeds = async () => {
    try {
      // Fetch all feeds
      const response = await fetch("/api/feeds");

      if (!response.ok) {
        throw new Error("Failed to fetch RSS feeds");
      }

      const data = await response.json();

      // Sort feeds by creation date if available
      const sortedFeeds = data.sort(
        (a: RSSFeed, b: RSSFeed) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      setFeeds(sortedFeeds);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch RSS feeds",
        variant: "destructive",
      });
      setFeeds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNewsItems = async (feedUrl: string) => {
    if (!feedUrl) {
      setNewsItems([]);
      setActiveFeedUrlForNews(null);
      setNewsError(null);
      return;
    }

    // If already showing news for this feed, optionally hide it or do nothing
    // For now, let's allow re-fetching
    // if (activeFeedUrlForNews === feedUrl && newsItems.length > 0) {
    //   setActiveFeedUrlForNews(null); // Hide news
    //   setNewsItems([]);
    //   return;
    // }

    setIsNewsLoading(true);
    setNewsError(null);
    setNewsItems([]); // Clear previous items

    try {
      const response = await fetch('/api/rss-parser/TOI/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: feedUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch news from ${feedUrl}`);
      }

      const data = await response.json();
      setNewsItems(data.items || []);
      setActiveFeedUrlForNews(feedUrl);

    } catch (error) {
      setNewsError(error instanceof Error ? error.message : "An unknown error occurred");
      setActiveFeedUrlForNews(null);
    } finally {
      setIsNewsLoading(false);
    }
  };

  const handleAddFeed = () => {
    // Open the Add Feed dialog
    setAddProvider("");
    setAddSubtype("");
    setAddRssLink("");
    setAddIsActive(false);
    setIsAddDialogOpen(true);
  };

  const submitAddFeed = async () => {
    try {
      const response = await fetch("/api/feeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Provider: addProvider,
          subtype: addSubtype,
          rssLink: addRssLink,
          isActive: addIsActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add feed");
      }

      toast({
        title: "Success",
        description: "RSS feed added successfully",
      });

      setIsAddDialogOpen(false);
      fetchFeeds();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add feed",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  const filteredFeeds = feeds.filter(feed => {
    const searchLower = searchTerm.toLowerCase();
    const subtype = (feed.subtype || '').toLowerCase();

    return subtype.includes(searchLower);
  });

  // Handlers for edit dialog
  const openEditDialog = (feed: RSSFeed) => {
    setSelectedFeed(feed);
    setEditProvider(feed.Provider || feed.provider || "");
    setEditSubtype(feed.subtype);
    setEditRssLink(feed.rssLink);
    setEditIsActive(feed.isActive);
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedFeed(null);
  };

  const submitEdit = async () => {
    if (!selectedFeed) return;

    try {
      const response = await fetch(`/api/feeds/${selectedFeed._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Provider: editProvider,
          subtype: editSubtype,
          rssLink: editRssLink,
          isActive: editIsActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update feed");
      }

      toast({
        title: "Success",
        description: "RSS feed updated successfully",
      });

      closeEditDialog();
      fetchFeeds();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update feed",
        variant: "destructive",
      });
    }
  };

  // Handlers for delete alert
  const openDeleteAlert = (feed: RSSFeed) => {
    setSelectedFeed(feed);
    setIsDeleteAlertOpen(true);
  };

  const closeDeleteAlert = () => {
    setIsDeleteAlertOpen(false);
    setSelectedFeed(null);
  };

  const confirmDelete = async () => {
    if (!selectedFeed) return;

    try {
      const response = await fetch(`/api/feeds/${selectedFeed._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete feed");
      }

      toast({
        title: "Success",
        description: "RSS feed deleted successfully",
      });

      closeDeleteAlert();
      fetchFeeds();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete feed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />

      <main className="md:pl-64 pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">RSS Feeds</h1>
            <p className="text-muted-foreground">
              Manage your RSS feed sources
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search feeds..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={handleAddFeed} disabled={isLoading}>
                <Rss className="mr-2 h-4 w-4" />
                Add Feed
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Loading feeds...</p>
              </div>
            </div>
          ) : feeds.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="py-12 text-center">
                <h2 className="text-xl font-medium text-muted-foreground">
                  No RSS feeds available
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Please check your connection or try again later
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeeds.map((feed) => (
                <Card
                  key={feed._id}
                  className="hover:shadow-lg transition-shadow duration-200"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {feed.Provider || feed.provider || "Unknown Provider"}
                          </h3>
                          <Badge variant="outline" className="mt-2">
                            {feed.subtype}
                          </Badge>
                        </div>
                        {auth.user?.role === "admin" && (
                          <div className="flex gap-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-black-600 hover:text-black-800"
                              onClick={() => openEditDialog(feed)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800"
                              onClick={() => openDeleteAlert(feed)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 break-all">
                        {feed.rssLink}
                      </p>
                      <div className="flex justify-between items-center mt-4">
                        <Badge variant={feed.isActive ? "secondary" : "success"}>
                          {feed.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/news?subtype=${encodeURIComponent(feed.subtype)}`)}
                          >
                            View News
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => window.open(feed.rssLink, "_blank")}
                            title="Open original RSS link"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Section to display news items */}
          {(activeFeedUrlForNews || isNewsLoading || newsError) && (
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                News from: {activeFeedUrlForNews ? feeds.find(f => f.rssLink === activeFeedUrlForNews)?.Provider : 'Feed'}
              </h2>
              {isNewsLoading && <p className="text-muted-foreground">Loading news items...</p>}
              {newsError && <p className="text-red-600">Error: {newsError}</p>}
              {!isNewsLoading && !newsError && newsItems.length === 0 && activeFeedUrlForNews && (
                <p className="text-muted-foreground">No news items found for this feed, or the feed is empty.</p>
              )}
              {!isNewsLoading && !newsError && newsItems.length > 0 && (
                <ul className="space-y-4">
                  {newsItems.map((item, index) => (
                    <li key={item.guid || item.link || index} className="border-b pb-4 last:border-b-0 last:pb-0">
                      <h3 className="text-lg font-medium mb-1">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 transition-colors"
                        >
                          {item.title || "No title"}
                        </a>
                      </h3>
                      {item.isoDate && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {new Date(item.isoDate).toLocaleString()}
                        </p>
                      )}
                      <p className="text-sm text-gray-700 mb-2" dangerouslySetInnerHTML={{ __html: item.contentSnippet || item.content || '' }} />
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline"
                      >
                        Read more
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Add Feed Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add RSS Feed</DialogTitle>
                <DialogDescription>
                  Fill in the details below to add a new RSS feed.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="addProvider" className="text-right">
                    Provider
                  </label>
                  <Input
                    id="addProvider"
                    value={addProvider}
                    onChange={(e) => setAddProvider(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="addSubtype" className="text-right">
                    Subtype
                  </label>
                  <Input
                    id="addSubtype"
                    value={addSubtype}
                    onChange={(e) => setAddSubtype(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="addRssLink" className="text-right">
                    RSS Link
                  </label>
                  <Input
                    id="addRssLink"
                    value={addRssLink}
                    onChange={(e) => setAddRssLink(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="addIsActive" className="text-right">
                    Active
                  </label>
                  <input
                    id="addIsActive"
                    type="checkbox"
                    checked={addIsActive}
                    onChange={(e) => setAddIsActive(e.target.checked)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitAddFeed}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit RSS Feed</DialogTitle>
                <DialogDescription>
                  Update the details of the RSS feed below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="provider" className="text-right">
                    Provider
                  </label>
                  <Input
                    id="provider"
                    value={editProvider}
                    onChange={(e) => setEditProvider(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="subtype" className="text-right">
                    Subtype
                  </label>
                  <Input
                    id="subtype"
                    value={editSubtype}
                    onChange={(e) => setEditSubtype(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="rssLink" className="text-right">
                    RSS Link
                  </label>
                  <Input
                    id="rssLink"
                    value={editRssLink}
                    onChange={(e) => setEditRssLink(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="isActive" className="text-right">
                    Active
                  </label>
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeEditDialog}>
                  Cancel
                </Button>
                <Button onClick={submitEdit}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Alert */}
          <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this RSS feed? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={closeDeleteAlert}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
};

export default rssFeed;
