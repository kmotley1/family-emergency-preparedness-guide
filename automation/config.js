const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config', '.env') });

module.exports = {
  repoPath: '/Users/kellymotley/Sites/family-emergency-preparedness-guide',
  automationPath: __dirname,
  clientSecretPath: path.join(__dirname, 'config', 'client_secret.json'),
  tokenPath: path.join(__dirname, 'config', 'token.json'),
  playlistId: process.env.YOUTUBE_PLAYLIST_ID || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  port: 3000,
  cronSchedule: '0 9 * * *',
  siteUrl: 'https://emergencypreparednesschecklist.com',
  dbPath: path.join(__dirname, 'queue.db'),
};
