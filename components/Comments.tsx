import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext" 
import { useToast } from "../hooks/use-toast" 
import { Button } from "../components/ui/button" 
import { Input } from "../components/ui/input" 

interface Comment {
  _id: string;
  comment: string;
  userId: {
    name: string;
  };
  createdAt: string;
}

interface CommentsProps {
  newsId: string;
}

const Comments: React.FC<CommentsProps> = ({ newsId }) => {
  const { auth } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/news/${newsId}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      const data = await response.json();
      setComments(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch comments",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchComments();
  }, [newsId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/news/${newsId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ comment: newComment }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add comment");
      }
      setNewComment("");
      fetchComments();
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comment-section flex flex-col h-full">
      <h4 className="text-xl font-bold mb-3">Comments</h4>

      <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="comment">
              <div className="flex items-center justify-between">
                <div className="font-medium text-news-primary">{comment.userId?.name || "Unknown"}</div>
                <div className="text-xs text-news-muted">
                  {new Date(comment.createdAt).toLocaleString()}
                </div>
              </div>
              <p className="mt-2 text-gray-700">{comment.comment}</p>
            </div>
          ))
        )}
      </div>

      {auth.user ? (
        <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center sticky bottom-0 bg-background pt-2 border-t border-gray-300">
          <Input
            className="rounded-lg focus:ring-2 focus:ring-primary flex-grow"
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={loading}
          />
          <Button
            className="rounded-lg whitespace-nowrap"
            onClick={handleAddComment}
            disabled={loading}
          >
            {loading ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">Please log in to add a comment.</p>
      )}
    </div>
  );
};

export default Comments;
