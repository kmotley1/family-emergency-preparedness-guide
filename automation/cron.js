/**
 * Daily cron job — watches YouTube playlist for new videos,
 * generates articles, adds to approval queue.
 * 
 * Run: node cron.js
 * Keeps running in background and fires on schedule.
 */

require('dotenv').config({ path: './config/.env' });
const cron = require('node-cron');
const config = require('./config');
const db = require('./db');
const { fetchNewVideos } = require('./pipeline/fetch');
const { generateArticle } = require('./pipeline/generate');

const schedule = config.cronSchedule; // default: '0 9 * * *' (9am daily)

console.log(`⏰ Cron started. Schedule: ${schedule}`);
console.log(`   Watching playlist: ${config.playlistId || 'NOT SET — add to config/.env'}`);

cron.schedule(schedule, async () => {
  console.log(`\n[${new Date().toISOString()}] Running scheduled playlist check...`);
  await runPipeline();
});

async function runPipeline() {
  try {
    if (!config.playlistId) {
      console.error('❌ YOUTUBE_PLAYLIST_ID not set in config/.env');
      return;
    }

    const videos = await fetchNewVideos(config.playlistId);

    if (!videos.length) {
      console.log('   No new videos found.');
      return;
    }

    for (const video of videos) {
      console.log(`\n🔄 Generating article for: ${video.video_title}`);

      try {
        const generated = await generateArticle({
          transcript: video.transcript,
          videoTitle: video.video_title,
        });

        db.insertArticle({
          video_id: video.video_id,
          video_title: video.video_title,
          video_url: video.video_url,
          transcript: video.transcript,
          article_html: generated.article_html,
          blog_card_html: generated.blog_card_html,
          sitemap_entry: generated.sitemap_entry,
          slug: generated.slug,
          title: generated.title,
          category: generated.category,
          meta_description: generated.meta_description,
          read_time: generated.read_time,
        });

        console.log(`   ✅ Queued: "${generated.title}"`);
      } catch (err) {
        console.error(`   ❌ Failed to generate article: ${err.message}`);
      }
    }

    console.log(`\n✅ Pipeline complete. Open http://localhost:${config.port} to review.`);

  } catch (err) {
    console.error('❌ Pipeline error:', err.message);
  }
}

// Also export for manual triggering from dashboard
module.exports = { runPipeline };
