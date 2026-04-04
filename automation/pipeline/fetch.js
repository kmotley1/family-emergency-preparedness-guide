const { google } = require('googleapis');
const { getSubtitles } = require('youtube-captions-scraper');
const { getAuthClient } = require('../auth');
const db = require('../db');
const config = require('../config');

async function fetchTranscript(videoId) {
  const captions = await getSubtitles({ videoID: videoId, lang: 'en' });
  return captions.map(c => c.text).join(' ').replace(/\s+/g, ' ').trim();
}

async function fetchNewVideos(playlistId) {
  const pid = playlistId || config.playlistId;
  if (!pid) throw new Error('No playlist ID configured.');
  const auth = getAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });
  console.log(`📋 Fetching playlist: ${pid}`);
  let items = [];
  let pageToken;
  do {
    const res = await youtube.playlistItems.list({ part: 'snippet', playlistId: pid, maxResults: 50, pageToken });
    items = items.concat(res.data.items);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  const newItems = items.filter(item => !db.isVideoProcessed(item.snippet.resourceId.videoId));
  console.log(`   ${newItems.length} new videos to process`);
  if (!newItems.length) return [];
  const results = [];
  for (const item of newItems) {
    const videoId = item.snippet.resourceId.videoId;
    const videoTitle = item.snippet.title;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    try {
      const transcript = await fetchTranscript(videoId);
      if (!transcript || transcript.length < 200) { db.markVideoProcessed(videoId); continue; }
      results.push({ video_id: videoId, video_title: videoTitle, video_url: videoUrl, transcript });
      db.markVideoProcessed(videoId);
    } catch (err) {
      console.log(`   ❌ ${err.message}`);
    }
  }
  return results;
}

async function fetchSingleVideo(videoUrl) {
  const videoIdMatch = videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!videoIdMatch) throw new Error('Invalid YouTube URL');
  const videoId = videoIdMatch[1];
  const auth = getAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });
  const res = await youtube.videos.list({ part: 'snippet', id: videoId });
  const videoData = res.data.items[0];
  if (!videoData) throw new Error('Video not found');
  const videoTitle = videoData.snippet.title;
  console.log(`📹 Fetching transcript for: ${videoTitle}`);
  const transcript = await fetchTranscript(videoId);
  return { video_id: videoId, video_title: videoTitle, video_url: videoUrl, transcript };
}

module.exports = { fetchNewVideos, fetchSingleVideo };
