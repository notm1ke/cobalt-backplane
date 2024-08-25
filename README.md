# cobalt-backplane

This is a simple API server used in conjunction with the Cobalt frontend to supply various data.

## Running

Once you have the dependencies installed using:

```bash
npm install
```

You can run the server using:

```bash
SUPABASE_URL=your-supabase-instance SUPABASE_CLIENT_ID=your-client-id SERVICE_KEY=your-service-key npm start
```

That's it! The server should be running on `http://localhost:3000` or whatever port you supply using the `PORT` environment variable.