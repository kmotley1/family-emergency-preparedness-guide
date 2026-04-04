require('dotenv').config({ path: './config/.env' });
const { google } = require('googleapis');
const fs = require('fs');
const http = require('http');
const url = require('url');
const open = require('open');
const config = require('./config');

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

async function authenticate() {
  if (!fs.existsSync(config.clientSecretPath)) {
    console.error('❌ client_secret.json not found at', config.clientSecretPath);
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(config.clientSecretPath));
  const { client_id, client_secret } = credentials.installed;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:4242');

  if (fs.existsSync(config.tokenPath)) {
    const token = JSON.parse(fs.readFileSync(config.tokenPath));
    oauth2Client.setCredentials(token);
    console.log('✅ Already authenticated.');
    return oauth2Client;
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n🔐 Opening browser for Google authorization...\n');
  console.log('   If browser does not open, visit:\n  ', authUrl, '\n');
  await open(authUrl);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      // Ignore favicon and other non-callback requests
      if (!req.url.includes('code=')) {
        res.end('');
        return;
      }

      const qs = new url.URL(req.url, 'http://localhost:4242').searchParams;
      const code = qs.get('code');

      res.end(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>✅ Authorized successfully</h2>
          <p>You can close this tab and return to Terminal.</p>
        </body></html>
      `);

      server.close();

      try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        fs.writeFileSync(config.tokenPath, JSON.stringify(tokens, null, 2));
        console.log('✅ Token saved to', config.tokenPath);
        console.log('\n✅ Setup complete. You can now run: npm start');
        resolve(oauth2Client);
      } catch (err) {
        reject(err);
      }
    });

    server.listen(4242, () => {
      console.log('   Waiting for Google redirect on port 4242...');
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Timed out waiting for authorization. Try again.'));
    }, 120000);
  });
}

function getAuthClient() {
  if (!fs.existsSync(config.clientSecretPath) || !fs.existsSync(config.tokenPath)) {
    throw new Error('Not authenticated. Run: node auth.js');
  }
  const credentials = JSON.parse(fs.readFileSync(config.clientSecretPath));
  const { client_id, client_secret } = credentials.installed;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:4242');
  const token = JSON.parse(fs.readFileSync(config.tokenPath));
  oauth2Client.setCredentials(token);
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      const current = JSON.parse(fs.readFileSync(config.tokenPath));
      fs.writeFileSync(config.tokenPath, JSON.stringify({ ...current, ...tokens }, null, 2));
    }
  });
  return oauth2Client;
}

module.exports = { authenticate, getAuthClient };

if (require.main === module) {
  authenticate()
    .then(() => process.exit(0))
    .catch(err => { console.error('❌ Auth failed:', err.message); process.exit(1); });
}
