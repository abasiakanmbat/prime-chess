PrimeChess Production Package
Includes PM2 and Docker support.

## API Configuration

The frontend automatically uses the **current app URL** as the API URL. This means:

- **Development**: Uses `http://localhost:5173` (Vite dev server) with proxy to backend
- **Production**: Uses the same origin as the deployed app (e.g., `https://yourdomain.com`)

### Optional: Override API URL

If you need to use a different API URL (e.g., separate API server), you can set the `VITE_API_URL` environment variable:

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

The `.env` file should contain:

```
VITE_API_URL=http://your-api-server:3000
```

**Note**: 
- In development, the Vite proxy will handle routing `/socket.io` and `/create-game` to the backend
- In production, if frontend and backend are on the same domain, no configuration is needed
- The `VITE_API_URL` environment variable is optional and only needed if your API is on a different domain