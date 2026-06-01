const axios = require("axios");

const HEALTH_TOPICS = [
  "diabetes management",
  "heart health tips",
  "mental health anxiety",
  "blood pressure control",
  "healthy diet nutrition",
  "yoga for beginners",
  "cancer awareness prevention",
  "thyroid health",
  "kidney disease prevention",
  "fitness exercise routine",
  "sleep health insomnia",
  "stress management",
  "immunity boosting foods",
  "back pain relief",
  "weight loss healthy",
];

exports.getHealthVideos = async (req, res) => {
  try {
    const { topic, maxResults = 4 } = req.query;

    if (!topic) {
      return res.status(400).json({ success: false, message: "Topic query param required" });
    }

    // Sanitize topic
    const cleanTopic = String(topic).replace(/[<>'"]/g, "").trim().substring(0, 100);

    const searchQuery = `${cleanTopic} health education`;

    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          q: searchQuery,
          part: "snippet",
          type: "video",
          maxResults: Math.min(Number(maxResults), 6),
          safeSearch: "strict",
          relevanceLanguage: "en",
          videoEmbeddable: "true",
          order: "relevance",
        },
      }
    );

    const videos = response.data.items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description.substring(0, 150),
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      watchUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    return res.status(200).json({
      success: true,
      topic: cleanTopic,
      videos,
    });
  } catch (error) {
    console.error("YouTube API error:", error?.response?.data || error.message);

    if (error?.response?.status === 403) {
      return res.status(429).json({ success: false, message: "Video service quota exceeded. Try again later." });
    }

    return res.status(500).json({ success: false, message: "Could not fetch health videos" });
  }
};

exports.getHealthTopics = (req, res) => {
  return res.status(200).json({ success: true, topics: HEALTH_TOPICS });
};
